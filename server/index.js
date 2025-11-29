const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { authenticateToken, generateToken } = require('./auth');

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL;
const pool = new Pool(
    connectionString
        ? { connectionString, ssl: { rejectUnauthorized: false } }
        : {
            host: process.env.PGHOST,
            port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD,
            database: process.env.PGDATABASE,
            ssl: { rejectUnauthorized: false },
        }
);

let dbHealthy = true;
let memTasks = [];
let nextId = 1;
let lastError = null;

// Initialize database schema
async function initDatabase() {
    try {
        // Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Ensured users table exists');

        // Create tasks table with user_id
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.tasks (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                description TEXT,
                priority TEXT,
                due_date DATE,
                status TEXT,
                tags JSONB,
                attachments JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Ensured tasks table exists');

        // Add user_id column if it doesn't exist (for migration)
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='tasks' AND column_name='user_id'
                ) THEN
                    ALTER TABLE tasks ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
                END IF;
            END $$;
        `);
        console.log('Database schema initialized');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

initDatabase();

function formatTask(row) {
    let dueDate = null;
    if (row.due_date) {
        const d = new Date(row.due_date);
        // Adjust for timezone offset to get the correct calendar date
        const offset = d.getTimezoneOffset();
        const adjusted = new Date(d.getTime() - (offset * 60 * 1000));
        dueDate = adjusted.toISOString().split('T')[0];
    }
    let tags = row.tags;
    let attachments = row.attachments;
    if (typeof tags === 'string') {
        try { tags = JSON.parse(tags); } catch (_) { tags = []; }
    }
    if (typeof attachments === 'string') {
        try { attachments = JSON.parse(attachments); } catch (_) { attachments = 0; }
    }
    if (attachments == null) attachments = 0;
    if (!Array.isArray(tags)) tags = [];
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority,
        dueDate,
        status: row.status,
        tags,
        attachments
    };
}

// ============ AUTHENTICATION ROUTES ============

// Signup endpoint
app.post('/auth/signup', async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Check if user already exists
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
            [email, passwordHash, name || null]
        );

        const user = result.rows[0];
        const token = generateToken(user.id, user.email);

        res.status(201).json({
            token,
            user: { id: user.id, email: user.email, name: user.name }
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const result = await pool.query(
            'SELECT id, email, password_hash, name FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user.id, user.email);

        res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user info
app.get('/auth/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, name FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// ============ TASK ROUTES (Protected) ============

// Get all tasks
app.get('/tasks', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM tasks WHERE user_id = $1 ORDER BY id',
            [req.user.userId]
        );
        res.json(result.rows.map(formatTask));
    } catch (err) {
        console.error('Error fetching tasks:', err?.message || err);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Create a new task
app.post('/tasks', authenticateToken, async (req, res) => {
    const { title, description, priority, dueDate, status, tags, attachments } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO tasks (user_id, title, description, priority, due_date, status, tags, attachments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [req.user.userId, title, description, priority, dueDate || null, status, JSON.stringify(tags ?? []), JSON.stringify(attachments ?? 0)]
        );
        res.status(201).json(formatTask(result.rows[0]));
    } catch (err) {
        console.error('Failed to create task:', err);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Update a task
app.put('/tasks/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { title, description, priority, dueDate, status, tags, attachments } = req.body;
    try {
        const result = await pool.query(
            `UPDATE tasks SET title=$1, description=$2, priority=$3, due_date=$4, status=$5, tags=$6, attachments=$7
       WHERE id=$8 AND user_id=$9 RETURNING *`,
            [title, description, priority, dueDate || null, status, JSON.stringify(tags ?? []), JSON.stringify(attachments ?? 0), id, req.user.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(formatTask(result.rows[0]));
    } catch (err) {
        console.error('Failed to update task:', err);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Delete a task
app.delete('/tasks/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'DELETE FROM tasks WHERE id=$1 AND user_id=$2',
            [id, req.user.userId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.status(204).send();
    } catch (err) {
        console.error('Failed to delete task:', err);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

app.get('/health', async (req, res) => {
    try {
        const result = await pool.query('select current_database() as db, current_user as usr, version() as ver');
        dbHealthy = true;
        res.json({ status: 'ok', db: result.rows[0] });
    } catch (err) {
        dbHealthy = false;
        res.status(503).json({ status: 'down' });
    }
});

app.get('/last-error', (req, res) => {
    res.json(lastError);
});

const { sendDailyReminders } = require('./scheduler');
app.post('/test-email', async (req, res) => {
    try {
        await sendDailyReminders(pool);
        res.json({ message: 'Email process triggered. Check server logs.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

const { initScheduler } = require('./scheduler');

app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
    initScheduler(pool);
});

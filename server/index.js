const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');

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

// Ensure the tasks table exists on startup
pool.query(`
  CREATE TABLE IF NOT EXISTS public.tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT,
    due_date DATE,
    status TEXT,
    tags JSONB,
    attachments JSONB
  );
`).then(() => console.log('Ensured tasks table exists'))
    .catch(err => console.error('Error ensuring tasks table', err));

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

// Get all tasks
app.get('/tasks', async (req, res) => {
    try {
        if (!dbHealthy) {
            return res.status(200).json(memTasks);
        }
        const result = await pool.query('SELECT * FROM tasks ORDER BY id');
        res.json(result.rows.map(formatTask));
    } catch (err) {
        console.error('Error fetching tasks:', err?.message || err);
        dbHealthy = false;
        res.status(200).json(memTasks);
    }
});

// Create a new task
app.post('/tasks', async (req, res) => {
    console.log('POST /tasks body:', req.body);
    const { title, description, priority, dueDate, status, tags, attachments } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO tasks (title, description, priority, due_date, status, tags, attachments)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [title, description, priority, dueDate || null, status, JSON.stringify(tags ?? []), JSON.stringify(attachments ?? 0)]
        );
        res.status(201).json(formatTask(result.rows[0]));
    } catch (err) {
        lastError = {
            at: new Date().toISOString(),
            op: 'insert',
            message: err?.message || String(err),
            code: err?.code,
            detail: err?.detail,
            stack: err?.stack,
        };
        console.error('DB insert failed, using memory fallback:', err?.message || err);
        dbHealthy = false;
        const t = {
            id: nextId++,
            title,
            description,
            priority,
            dueDate: dueDate || null,
            status,
            tags: Array.isArray(tags) ? tags : [],
            attachments: Number(attachments ?? 0)
        };
        memTasks.unshift(t);
        res.status(201).json(t);
    }
});

// Update a task
app.put('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, priority, dueDate, status, tags, attachments } = req.body;
    try {
        const result = await pool.query(
            `UPDATE tasks SET title=$1, description=$2, priority=$3, due_date=$4, status=$5, tags=$6, attachments=$7
       WHERE id=$8 RETURNING *`,
            [title, description, priority, dueDate || null, status, JSON.stringify(tags ?? []), JSON.stringify(attachments ?? 0), id]
        );
        res.json(formatTask(result.rows[0]));
    } catch (err) {
        dbHealthy = false;
        const idx = memTasks.findIndex(t => String(t.id) === String(id));
        if (idx === -1) {
            return res.status(404).json({ error: 'Not found' });
        }
        const updated = {
            ...memTasks[idx],
            title,
            description,
            priority,
            dueDate: dueDate || null,
            status,
            tags: Array.isArray(tags) ? tags : [],
            attachments: Number(attachments ?? 0)
        };
        memTasks[idx] = updated;
        res.json(updated);
    }
});

// Delete a task
app.delete('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM tasks WHERE id=$1', [id]);
        res.status(204).send();
    } catch (err) {
        dbHealthy = false;
        const before = memTasks.length;
        memTasks = memTasks.filter(t => String(t.id) !== String(id));
        if (memTasks.length === before) {
            return res.status(404).json({ error: 'Not found' });
        }
        res.status(204).send();
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

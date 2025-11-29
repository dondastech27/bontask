const cron = require('node-cron');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendDailyReminders = async (pool) => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        console.log(`Checking for tasks due on ${today}...`);

        // Get all users
        const usersResult = await pool.query('SELECT id, email, name FROM users');

        if (usersResult.rows.length === 0) {
            console.log('No users found.');
            return;
        }

        // Send email to each user with their tasks
        for (const user of usersResult.rows) {
            const tasksResult = await pool.query(
                "SELECT * FROM tasks WHERE user_id = $1 AND due_date = $2 AND status != 'done'",
                [user.id, today]
            );

            if (tasksResult.rows.length === 0) {
                console.log(`No tasks due today for ${user.email}`);
                continue;
            }

            const tasksList = tasksResult.rows
                .map(t => `- [${t.priority ? t.priority.toUpperCase() : 'NORMAL'}] ${t.title}`)
                .join('\n');

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: `Daily Task Reminder - ${today}`,
                text: `Good Morning${user.name ? ' ' + user.name : ''}!\n\nYou have the following tasks due today:\n\n${tasksList}\n\nGood luck!`,
            };

            try {
                const info = await transporter.sendMail(mailOptions);
                console.log(`Reminder email sent to ${user.email}:`, info.response);
            } catch (emailErr) {
                console.error(`Failed to send email to ${user.email}:`, emailErr);
            }
        }
    } catch (error) {
        console.error('Error sending daily reminders:', error);
    }
};

const initScheduler = (pool) => {
    // Schedule for 8:00 AM every day
    // Cron format: Minute Hour Day Month DayOfWeek
    cron.schedule('0 8 * * *', () => {
        console.log('Running daily reminder job...');
        sendDailyReminders(pool);
    });

    console.log('Daily reminder scheduler initialized (runs at 8:00 AM).');
};

module.exports = { initScheduler, sendDailyReminders };

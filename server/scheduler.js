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

        // Find tasks due today that are not done
        const result = await pool.query(
            "SELECT * FROM tasks WHERE due_date = $1 AND status != 'done'",
            [today]
        );

        if (result.rows.length === 0) {
            console.log('No tasks due today.');
            return;
        }

        const tasksList = result.rows
            .map(t => `- [${t.priority ? t.priority.toUpperCase() : 'NORMAL'}] ${t.title}`)
            .join('\n');

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_TO,
            subject: `Daily Task Reminder - ${today}`,
            text: `Good Morning!\n\nYou have the following tasks due today:\n\n${tasksList}\n\nGood luck!`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Daily reminder email sent:', info.response);
    } catch (error) {
        console.error('Error sending daily reminder:', error);
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

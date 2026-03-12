const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function seed() {
    const db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    const userId = '019cc699-8a01-7415-a644-724f93bf8067'; // From the token log
    const date = new Date().toLocaleDateString("en", { month: "short", day: "numeric" });

    const apps = [
        { company: 'Google', role: 'SWE', stage: 'Interview', score: 92 },
        { company: 'Meta', role: 'Frontend Eng', stage: 'Applied', score: 85 },
        { company: 'Stripe', role: 'Backend Eng', stage: 'Offer 🎉', score: 95 },
        { company: 'Netflix', role: 'Senior SWE', stage: 'Rejected', score: 70 },
        { company: 'Airbnb', role: 'Product Eng', stage: 'Phone Screen', score: 88 }
    ];

    for (const app of apps) {
        const res = await db.run(
            'INSERT INTO applications (user_id, company, role, logo, stage, notes, job_link, match_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, app.company, app.role, app.company[0], app.stage, '', '', app.score]
        );
        await db.run('INSERT INTO application_history (app_id, stage, date) VALUES (?, ?, ?)', [res.lastID, app.stage, date]);
    }

    console.log('Seed data inserted for user:', userId);
    await db.close();
}

seed();

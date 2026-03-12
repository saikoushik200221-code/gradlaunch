const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

(async () => {
    try {
        const db = await open({
            filename: path.join(__dirname, 'database.sqlite'),
            driver: sqlite3.Database
        });
        const count = await db.get('SELECT COUNT(*) as count FROM jobs');
        console.log(`Phase 5 Verification: Found ${count.count} jobs in the database.`);
        const samples = await db.all('SELECT title, company, source, salary_max FROM jobs LIMIT 5');
        console.log('Sample Data:', JSON.stringify(samples, null, 2));
    } catch (err) {
        console.error('Verification failed:', err.message);
    }
})();

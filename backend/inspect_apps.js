const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

(async () => {
    try {
        const db = await open({
            filename: path.join(__dirname, 'database.sqlite'),
            driver: sqlite3.Database
        });

        console.log('--- USERS ---');
        const users = await db.all('SELECT id, email FROM users');
        console.log(users);

        console.log('\n--- APPLICATIONS ---');
        const apps = await db.all('SELECT id, user_id, company, role FROM applications');
        console.log(apps);

        await db.close();
    } catch (err) {
        console.error('Error:', err.message);
    }
})();

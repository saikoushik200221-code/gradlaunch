const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function checkLocalDb() {
    const db = await open({ filename: path.join(__dirname, 'database.sqlite'), driver: sqlite3.Database });
    const user = await db.get('SELECT * FROM users WHERE email = ?', ['saikoushik200221@gmail.com']);
    console.log("Local DB user:", user);

    // Check all users just in case
    const allUsers = await db.all('SELECT email FROM users');
    console.log("All local users:", allUsers);
}
checkLocalDb().catch(console.error);

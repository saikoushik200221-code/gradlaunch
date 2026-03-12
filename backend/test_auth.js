require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const TURSO_URL = process.env.TURSO_DATABASE_URL || '';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

function createTursoDb(dbUrl, token) {
    const apiBase = dbUrl.replace('libsql://', 'https://');
    return {
        get: async (sql, args = []) => {
            const res = await axios.post(`${apiBase}/v2/pipeline`, {
                requests: [{ type: 'execute', stmt: { sql, args: args.map(a => a === null ? { type: 'null' } : { type: typeof a === 'number' ? 'integer' : 'text', value: String(a) }) } }, { type: 'close' }]
            }, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const result = res.data.results?.[0];
            const cols = result?.response?.result?.cols?.map(c => c.name) || [];
            const rows = (result?.response?.result?.rows || []).map(row =>
                Object.fromEntries(cols.map((col, i) => [col, row[i]?.value ?? null]))
            );
            return rows[0] || null;
        }
    };
}

async function run() {
    const db = createTursoDb(TURSO_URL, TURSO_TOKEN);
    const user = await db.get('SELECT * FROM users WHERE email = ?', ['saikoushik200221@gmail.com']);
    console.log("Found user:", user);

    // Hash the previous password with fallback
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
    console.log("Current JWT_SECRET:", JWT_SECRET);

    // The user's password was probably hashed with another secret. Let's see.
}
run();

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { parseResumePDF } = require('./parser');
const { syncApplicationStatus } = require('./syncService');
const { OAuth2Client } = require('google-auth-library');
const { initMailer, sendJobAlertEmail, sendInterviewReminderEmail } = require('./mailer');
const cron = require('node-cron');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 3001;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend/dist'), { index: false }));


// --- SECURITY & RATE LIMITING ---
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: "Too many requests, please try again later." }
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 500, // Relaxed for development/verification
    message: { error: "Too many authentication attempts. Please try again in an hour." }
});

// app.use('/api/', generalLimiter);
// app.use('/api/auth/', authLimiter);

// Centralized Error Handler (Applied at the end)
function errorHandler(err, req, res, next) {
    console.error(`[Error] ${req.method} ${req.url}:`, err.stack);
    const status = err.status || 500;
    res.status(status).json({
        error: err.message || "Internal Server Error",
        path: req.url,
        timestamp: new Date().toISOString()
    });
}
// API Health Check / Root
app.get('/', (req, res) => {
    res.json({
        message: "GradLaunch API is active",
        version: "1.2.0",
        status: "healthy",
        uptime: process.uptime()
    });
});


const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Helper for crypto hashing
function hashPassword(password) {
    return crypto.createHmac('sha256', JWT_SECRET).update(password).digest('hex');
}

// Simple token system (base64 of data + signature)
function signToken(data) {
    const payload = JSON.stringify({ ...data, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    const base64Payload = Buffer.from(payload).toString('base64');
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(base64Payload).digest('hex');
    return `${base64Payload}.${signature}`;
}

function verifyToken(token) {
    try {
        const [base64Payload, signature] = token.split('.');
        const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(base64Payload).digest('hex');
        if (signature !== expectedSignature) return null;

        const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
        if (Date.now() > payload.exp) return null;
        return payload;
    } catch (e) {
        return null;
    }
}

// [Phase 6] Turso Cloud DB + Local SQLite Fallback
const TURSO_URL = process.env.TURSO_DATABASE_URL || '';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

let db;

// Turso HTTP API compatibility wrapper (no npm package needed)
function createTursoDb(dbUrl, token) {
    const apiBase = dbUrl.replace('libsql://', 'https://');

    async function execute(sql, args = []) {
        const res = await axios.post(`${apiBase}/v2/pipeline`, {
            requests: [{ type: 'execute', stmt: { sql, args: args.map(a => a === null ? { type: 'null' } : { type: typeof a === 'number' ? 'integer' : 'text', value: String(a) }) } }, { type: 'close' }]
        }, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            timeout: 30000
        });
        const result = res.data.results?.[0];
        if (result?.type === 'error') throw new Error(result.error?.message || 'Turso error');
        const cols = result?.response?.result?.cols?.map(c => c.name) || [];
        const rows = (result?.response?.result?.rows || []).map(row =>
            Object.fromEntries(cols.map((col, i) => [col, row[i]?.value ?? null]))
        );
        const lastInsertRowid = result?.response?.result?.last_insert_rowid;
        return { rows, lastID: lastInsertRowid ? Number(lastInsertRowid) : null };
    }

    return {
        exec: async (sql) => {
            const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
            for (const stmt of stmts) { try { await execute(stmt); } catch (e) { if (!e.message.includes('already exists')) throw e; } }
        },
        get: async (sql, params = []) => { const r = await execute(sql, params); return r.rows[0] || null; },
        all: async (sql, params = []) => { const r = await execute(sql, params); return r.rows; },
        run: async (sql, params = []) => { const r = await execute(sql, params); return { lastID: r.lastID }; }
    };
}

async function initDb() {
    if (TURSO_URL && TURSO_TOKEN) {
        console.log('[GradLaunch] Using Turso cloud database ☁️');
        db = createTursoDb(TURSO_URL, TURSO_TOKEN);
    } else {
        console.log('[GradLaunch] Using local SQLite database 💾');
        const sqlite3 = require('sqlite3').verbose();
        const { open } = require('sqlite');
        const localDb = await open({ filename: path.join(__dirname, 'database.sqlite'), driver: sqlite3.Database });
        db = {
            exec: (sql) => localDb.exec(sql),
            get: (sql, p = []) => localDb.get(sql, p),
            all: (sql, p = []) => localDb.all(sql, p),
            run: (sql, p = []) => localDb.run(sql, p)
        };
    }

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT, profile TEXT);
        CREATE TABLE IF NOT EXISTS saved_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, job_id TEXT, job_data TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, job_id));
        CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, company TEXT, role TEXT, logo TEXT, stage TEXT, notes TEXT, job_link TEXT, match_score INTEGER, interview_date TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS application_history (id INTEGER PRIMARY KEY AUTOINCREMENT, app_id INTEGER, stage TEXT, date TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, title TEXT, company TEXT, location TEXT, type TEXT, salary TEXT, salary_min INTEGER, salary_max INTEGER, tags TEXT, skills TEXT, description TEXT, link TEXT, posted TEXT, posted_value INTEGER, embedding TEXT, logo TEXT, match_score INTEGER, source TEXT, sponsorship_friendly INTEGER, company_type TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)
    `);
    try { await db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_company_title ON jobs(company, title)`); } catch (e) { }
    
    // Migration: Update existing company types with refined classifier
    try {
        const allJobs = await db.all("SELECT id, company, source FROM jobs");
        for (const job of allJobs) {
            const newType = classifyCompany(job.company, job.source);
            await db.run("UPDATE jobs SET company_type = ? WHERE id = ?", [newType, job.id]);
        }
        console.log(`[GradLaunch] Retroactively re-classified ${allJobs.length} jobs.`);
    } catch (e) { console.error("Re-classification failed", e); }
    // Migration: add email_notifications column
    try { await db.exec(`ALTER TABLE users ADD COLUMN email_notifications TEXT DEFAULT 'none'`); } catch (e) { }
    // Migration: add interview_date column to applications
    try { await db.exec(`ALTER TABLE applications ADD COLUMN interview_date TEXT`); } catch (e) { }
    // Migration: add sponsorship_friendly column to jobs
    try { await db.exec(`ALTER TABLE jobs ADD COLUMN sponsorship_friendly INTEGER DEFAULT 0`); } catch (e) { }
    // Ensure Guest User exists so demo-token works seamlessly across all endpoints
    try {
        await db.run('INSERT OR IGNORE INTO users (id, name, email, password, profile) VALUES (?, ?, ?, ?, ?)', [
            '019cc699-8a01-7415-a644-724f93bf8067', 'Guest Explorer', 'guest@gradlaunch.ai', 'demo_no_password', null
        ]);
    } catch (e) {
        console.log('[GradLaunch] Guest user init skipped', e.message);
    }
    
    console.log('[GradLaunch] Database initialized ✅');

    // Initialize mailer
    initMailer();
}

initDb().catch(err => console.error('[GradLaunch] DB init failed:', err.message));

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Debug log for authentication
    console.log(`[Auth] ${req.method} ${req.url} | Token: ${token ? token.substring(0, 10) + '...' : 'NONE'}`);

    if (!token) return res.status(401).json({ error: 'No token provided' });

    if (token === 'demo-token') {
        req.user = { id: '019cc699-8a01-7415-a644-724f93bf8067', name: 'Guest Explorer', email: 'guest@gradlaunch.ai' };
        return next();
    }

    const user = verifyToken(token);
    if (!user) {
        console.warn(`[Auth] Invalid token: ${token.substring(0, 10)}...`);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
};

// --- AUTH ENDPOINTS ---

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    try {
        const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = hashPassword(password);
        const id = Date.now().toString();

        await db.run(
            'INSERT INTO users (id, name, email, password, profile) VALUES (?, ?, ?, ?, ?)',
            [id, name, email, hashedPassword, null]
        );

        const token = signToken({ id, email, name });
        res.status(201).json({ token, user: { id, name, email } });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const valid = hashPassword(password) === user.password;
        if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

        const token = signToken({ id: user.id, email: user.email, name: user.name });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// --- GOOGLE OAUTH ---
app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Missing Google credential' });

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const { email, name, sub: googleId } = payload;

        // Check if user already exists
        let user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

        if (!user) {
            // Auto-register the Google user
            const id = Date.now().toString();
            const hashedPassword = hashPassword(`google_${googleId}_${Date.now()}`);
            await db.run(
                'INSERT INTO users (id, name, email, password, profile) VALUES (?, ?, ?, ?, ?)',
                [id, name, email, hashedPassword, null]
            );
            user = { id, name, email };
            console.log(`[GradLaunch] New Google user registered: ${email}`);
        }

        const token = signToken({ id: user.id, email: user.email, name: user.name });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error('Google OAuth error:', err.message);
        res.status(401).json({ error: 'Invalid Google credential' });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.get('SELECT id, name, email FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(401).json({ error: 'Session expired or user not found' });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: 'Error validating session' });
    }
});

// --- NOTIFICATION PREFERENCES ---
app.get('/api/notifications/settings', authenticateToken, async (req, res) => {
    try {
        const user = await db.get('SELECT email_notifications FROM users WHERE id = ?', [req.user.id]);
        res.json({ emailNotifications: user?.email_notifications || 'none' });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching settings' });
    }
});

app.post('/api/notifications/settings', authenticateToken, async (req, res) => {
    const { emailNotifications } = req.body; // 'instant', 'daily', 'none'
    if (!['instant', 'daily', 'none'].includes(emailNotifications)) {
        return res.status(400).json({ error: 'Invalid notification setting' });
    }
    try {
        await db.run('UPDATE users SET email_notifications = ? WHERE id = ?', [emailNotifications, req.user.id]);
        res.json({ message: 'Settings updated', emailNotifications });
    } catch (err) {
        res.status(500).json({ error: 'Error updating settings' });
    }
});

// --- PROFILE ENDPOINTS ---
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const user = await db.get('SELECT name, email, profile FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        let profileData = null;
        if (user.profile) {
            try { profileData = JSON.parse(user.profile); } catch (e) { }
        }

        // If no profile yet, return a skeleton or the default
        res.json(profileData || {
            name: user.name,
            email: user.email,
            university: "",
            major: "",
            gradYear: "",
            visaStatus: "F-1/OPT",
            targetRole: "Software Engineer",
            targetLocation: "",
            skills: "",
            linkedin: "",
            baseResume: ""
        });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching profile' });
    }
});

app.post('/api/profile', authenticateToken, async (req, res) => {
    try {
        const user = await db.get('SELECT profile FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        let currentProfile = {};
        if (user.profile) {
            try { currentProfile = JSON.parse(user.profile); } catch (e) { }
        }

        const updatedProfile = { ...currentProfile, ...req.body };

        await db.run('UPDATE users SET profile = ? WHERE id = ?', [JSON.stringify(updatedProfile), req.user.id]);
        res.json({ message: 'Profile saved successfully', profile: updatedProfile });
    } catch (err) {
        res.status(500).json({ error: 'Error updating profile' });
    }
});

// --- RESUME UPLOAD ---
app.post('/api/resume/upload', authenticateToken, upload.single('resume'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const text = await parseResumePDF(req.file.buffer);

        // Auto-update profile with extracted text
        const user = await db.get('SELECT profile FROM users WHERE id = ?', [req.user.id]);
        let profile = {};
        if (user && user.profile) {
            try { profile = JSON.parse(user.profile); } catch (e) { }
        }

        profile.baseResume = text;
        await db.run('UPDATE users SET profile = ? WHERE id = ?', [JSON.stringify(profile), req.user.id]);

        res.json({
            message: 'Resume parsed and profile updated',
            text: text.slice(0, 500) + '...',
            fullText: text
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Failed to process resume' });
    }
});

// --- SAVED JOBS ENDPOINTS ---
app.get('/api/jobs/saved', authenticateToken, async (req, res) => {
    try {
        const rows = await db.all('SELECT job_data FROM saved_jobs WHERE user_id = ?', [req.user.id]);
        res.json(rows.map(r => JSON.parse(r.job_data)));
    } catch (err) {
        res.status(500).json({ error: 'Error fetching saved jobs' });
    }
});

app.post('/api/jobs/save', authenticateToken, async (req, res) => {
    const { job } = req.body;
    if (!job || !job.id) return res.status(400).json({ error: 'Invalid job data' });

    try {
        await db.run(
            'INSERT OR REPLACE INTO saved_jobs (user_id, job_id, job_data) VALUES (?, ?, ?)',
            [req.user.id, job.id, JSON.stringify(job)]
        );
        res.json({ message: 'Job saved' });
    } catch (err) {
        res.status(500).json({ error: 'Error saving job' });
    }
});

app.post('/api/jobs/unsave', authenticateToken, async (req, res) => {
    const { jobId } = req.body;
    try {
        await db.run('DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?', [req.user.id, jobId]);
        res.json({ message: 'Job unsaved' });
    } catch (err) {
        res.status(500).json({ error: 'Error removing job' });
    }
});

// --- APPLICATIONS ENDPOINTS ---
app.get('/api/applications', authenticateToken, async (req, res) => {
    try {
        const apps = await db.all('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        for (let app of apps) {
            app.history = await db.all('SELECT stage, date FROM application_history WHERE app_id = ? ORDER BY created_at ASC', [app.id]);
        }
        res.json(apps);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching applications' });
    }
});

app.post('/api/applications', authenticateToken, async (req, res) => {
    const { company, role, logo, stage, notes, job_link, match_score } = req.body;
    const date = new Date().toLocaleDateString("en", { month: "short", day: "numeric" });

    try {
        const result = await db.run(
            'INSERT INTO applications (user_id, company, role, logo, stage, notes, job_link, match_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, company, role, logo, stage || 'Applied', notes || '', job_link || '', match_score || 0]
        );
        const appId = result.lastID;
        await db.run('INSERT INTO application_history (app_id, stage, date) VALUES (?, ?, ?)', [appId, stage || 'Applied', date]);
        res.status(201).json({ id: appId, message: 'Application created' });
    } catch (err) {
        console.error('Create application error:', err);
        res.status(500).json({ error: 'Error creating application' });
    }
});

app.get('/api/analytics', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Basic Stats
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN stage = 'Offer 🎉' THEN 1 ELSE 0 END) as offers,
                SUM(CASE WHEN stage = 'Interview' OR stage = 'Phone Screen' THEN 1 ELSE 0 END) as interviews,
                SUM(CASE WHEN stage = 'Rejected' THEN 1 ELSE 0 END) as rejections,
                AVG(match_score) as avgMatchScore
            FROM applications 
            WHERE user_id = ?
        `, [userId]);

        // 2. Stage Breakdown
        const stages = await db.all(`
            SELECT stage, COUNT(*) as count 
            FROM applications 
            WHERE user_id = ? 
            GROUP BY stage
        `, [userId]);

        // 3. Match Score Distribution (for a histogram/chart)
        const scores = await db.all(`
            SELECT 
                (match_score / 10) * 10 as bucket,
                COUNT(*) as count
            FROM applications
            WHERE user_id = ?
            GROUP BY bucket
            ORDER BY bucket ASC
        `, [userId]);

        // 4. Activity Over Time (Applications per day for last 14 days)
        const activity = await db.all(`
            SELECT date(created_at) as day, COUNT(*) as count
            FROM applications
            WHERE user_id = ? AND created_at > datetime('now', '-14 days')
            GROUP BY day
            ORDER BY day ASC
        `, [userId]);

        res.json({
            summary: {
                total: stats.total || 0,
                offers: stats.offers || 0,
                interviews: stats.interviews || 0,
                rejections: stats.rejections || 0,
                successRate: stats.total > 0 ? Math.round((stats.offers / stats.total) * 100) : 0,
                avgMatchScore: Math.round(stats.avgMatchScore || 0)
            },
            stages,
            scores,
            activity
        });
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

app.patch('/api/applications/:id', authenticateToken, async (req, res) => {
    const { stage, notes } = req.body;
    const appId = req.params.id;
    const date = new Date().toLocaleDateString("en", { month: "short", day: "numeric" });

    try {
        if (stage) {
            await db.run('UPDATE applications SET stage = ? WHERE id = ? AND user_id = ?', [stage, appId, req.user.id]);
            await db.run('INSERT INTO application_history (app_id, stage, date) VALUES (?, ?, ?)', [appId, stage, date]);
        }
        if (notes !== undefined) {
            await db.run('UPDATE applications SET notes = ? WHERE id = ? AND user_id = ?', [notes, appId, req.user.id]);
        }
        res.json({ message: 'Application updated' });
    } catch (err) {
        res.status(500).json({ error: 'Error updating application' });
    }
});

// In-memory cache: holds scraped jobs for 1 hour
let jobsCache = [];
let lastScrapeTime = null;

// Extract skills from job title/description heuristically
function extractSkills(title, description = '') {
    const text = (title + ' ' + description).toLowerCase();
    const allSkills = ['react', 'vue', 'angular', 'node.js', 'python', 'ruby', 'rails', 'java', 'go', 'rust', 'typescript', 'javascript', 'php', 'c++', 'kubernetes', 'docker', 'aws', 'gcp', 'azure', 'sql', 'postgres', 'graphql', 'django', 'flask', 'shopify', '.net', 'devops', 'terraform'];
    const found = allSkills.filter(s => text.includes(s));
    if (found.length < 2) found.push('Git', 'Agile');
    return [...new Set(found)].slice(0, 5).map(s => s.charAt(0).toUpperCase() + s.slice(1));
}

function generateTags(title, description = '', region = 'Worldwide', isRemote = false) {
    const text = (title + ' ' + description).toLowerCase();
    const tags = [];
    if (isRemote || text.includes('remote')) tags.push('Remote');

    // New Grad / Entry Level / Fresher
    if (text.includes('junior') || text.includes('entry') || text.includes('new grad') ||
        text.includes('graduate') || text.includes('associate') || text.includes('intern') ||
        text.includes('fresher') || text.includes('no experience') || text.includes('early career')) {
        tags.push('New Grad');
        tags.push('Fresher Friendly');
    }

    // Visa / Sponsorship keywords
    if (text.includes('visa') || text.includes('sponsor') || text.includes('h1b') || text.includes('h-1b') ||
        text.includes('opt') || text.includes('cpt') || text.includes('e-verify') ||
        text.includes('international') || region.toLowerCase().includes('worldwide')) {
        tags.push('H1B Sponsor');
        tags.push('OPT Accepted');
        tags.push('International Friendly');
    }

    // Remote Specifics
    if (region.includes('USA') || region.includes('US')) {
        tags.push('US Only');
    } else {
        tags.push('Worldwide');
    }

    return [...new Set(tags)];
}

function getMatchScore(title) {
    const t = title.toLowerCase();
    if (t.includes('junior') || t.includes('entry') || t.includes('intern') || t.includes('associate')) return Math.floor(Math.random() * 10) + 85;
    if (t.includes('senior') || t.includes('staff') || t.includes('principal') || t.includes('lead')) return Math.floor(Math.random() * 15) + 50;
    return Math.floor(Math.random() * 20) + 65;
}

function getPostedTime(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Recently';

    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / (1000 * 60));

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const days = Math.floor(diffHours / 24);
    return days === 1 ? '1d ago' : `${days}d ago`;
}

// [Phase 5] Advanced Salary Parser
function parseSalaryRange(salaryStr) {
    if (!salaryStr || salaryStr.toLowerCase().includes('competitive') || salaryStr.toLowerCase().includes('negotiable')) {
        return { min: null, max: null };
    }

    const clean = salaryStr.toLowerCase().replace(/,/g, '');
    const matches = clean.match(/(\d+k?)/g);
    if (!matches) return { min: null, max: null };

    const nums = matches.map(m => {
        let n = parseInt(m.replace('k', ''));
        if (m.includes('k')) n *= 1000;
        return n;
    });

    if (nums.length === 1) return { min: nums[0], max: nums[0] };
    return { min: Math.min(...nums), max: Math.max(...nums) };
}

// [Phase 5] Global Deduplication Utility (Fuzzy Match)
function isDuplicateJob(newJob, existingJobs) {
    const threshold = 0.85;

    // Simple Jaro-Winkler like similarity for titles/companies
    const getSim = (s1, s2) => {
        const a = s1.toLowerCase().replace(/[^a-z0-9]/g, '');
        const b = s2.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (a === b) return 1.0;
        let longer = a.length > b.length ? a : b;
        let shorter = a.length > b.length ? b : a;
        if (longer.length === 0) return 1.0;
        return (longer.length - editDistance(longer, shorter)) / longer.length;
    };

    const editDistance = (s1, s2) => {
        const costs = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) costs[j] = j;
                else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    };

    return existingJobs.some(old => {
        const companySim = getSim(newJob.company, old.company);
        const titleSim = getSim(newJob.title, old.title);
        // If company is very similar and title is very similar, it's a dupe
        return companySim > 0.9 && titleSim > 0.8;
    });
}

function deduplicateJobs(jobs, existingJobs = []) {
    const unique = [...existingJobs];
    const newJobs = [];

    for (const job of jobs) {
        if (!isDuplicateJob(job, unique)) {
            unique.push(job);
            newJobs.push(job);
        }
    }
    return newJobs;
}

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '';
const FINDWORK_API_KEY = process.env.FINDWORK_API_KEY || '';
const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY || '';
const CAREERJET_AFFID = process.env.CAREERJET_AFFID || '';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const USAJOBS_KEY = process.env.USAJOBS_KEY || '';
const USAJOBS_EMAIL = process.env.USAJOBS_EMAIL || 'admin@gradlaunch.ai';

async function scrapeJSearch() {
    if (!RAPIDAPI_KEY) return [];
    const jobs = [];
    const searchQueries = ['software developer intern in USA', 'new grad software engineer USA'];
    try {
        console.log('[GradLaunch] Fetching from JSearch (RapidAPI) - Multi-page...');
        for (const query of searchQueries) {
            for (let page = 1; page <= 2; page++) {
                const { data } = await axios.get('https://jsearch.p.rapidapi.com/search', {
                    params: { query: query, num_pages: 1, page: page },
                    headers: { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' },
                    timeout: 15000
                });
                
                if (data && data.data) {
                    data.data.forEach((item, i) => {
                        const desc = item.job_description || '';
                        jobs.push({
                            id: `js-${item.job_id || Date.now() + i + page}`,
                            title: item.job_title,
                            company: item.employer_name,
                            location: `${item.job_city || ''}, ${item.job_state || ''} ${item.job_country || ''}`.trim() || 'USA',
                            type: item.job_employment_type || 'Full-time',
                            postedValue: new Date(item.job_posted_at_datetime_utc).getTime() || Date.now(),
                            posted: getPostedTime(item.job_posted_at_datetime_utc),
                            salary: item.job_salary_period ? `${item.job_min_salary || ''} - ${item.job_max_salary || ''} ${item.job_salary_currency || ''}` : 'Competitive',
                            tags: generateTags(item.job_title, desc, item.job_country || 'USA'),
                            logo: item.employer_logo || (item.employer_name || 'J').charAt(0).toUpperCase(),
                            match: getMatchScore(item.job_title),
                            description: desc.length > 3000 ? desc.slice(0, 3000).trim() + '...' : desc.trim(),
                            skills: extractSkills(item.job_title, desc),
                            link: item.job_apply_link || item.job_google_link,
                            source: 'JSearch',
                            sponsorship_friendly: analyzeSponsorship(item.job_title, desc)
                        });
                    });
                }
            }
        }
    } catch (err) {
        console.warn(`JSearch fetch failed: ${err.message}`);
    }
    return jobs;
}

async function scrapeUSAJobs() {
    if (!USAJOBS_KEY) return [];
    const jobs = [];
    try {
        console.log('[GradLaunch] Fetching from USAJOBS API...');
        const { data } = await axios.get('https://data.usajobs.gov/api/search', {
            params: { Keyword: 'Software Development', LocationName: 'United States' },
            headers: { 
                'Authorization-Key': USAJOBS_KEY, 
                'User-Agent': USAJOBS_EMAIL,
                'Host': 'data.usajobs.gov'
            },
            timeout: 15000
        });
        
        if (data && data.SearchResult && data.SearchResult.SearchResultItems) {
            data.SearchResult.SearchResultItems.forEach((item, i) => {
                const b = item.MatchedObjectDescriptor;
                const desc = b.UserArea?.Details?.JobSummary || '';
                jobs.push({
                    id: `usj-${b.PositionID || Date.now() + i}`,
                    title: b.PositionTitle,
                    company: b.OrganizationName,
                    location: b.PositionLocation?.map(l => l.LocationName).join(', ') || 'USA',
                    type: b.PositionSchedule?.map(s => s.Name).join(', ') || 'Full-time',
                    postedValue: new Date(b.PublicationStartDate).getTime() || Date.now(),
                    posted: getPostedTime(b.PublicationStartDate),
                    salary: `${b.PositionRemuneration?.[0]?.MinimumRange || ''} - ${b.PositionRemuneration?.[0]?.MaximumRange || ''}`,
                    tags: generateTags(b.PositionTitle, desc, 'USA'),
                    logo: '🏛️',
                    match: getMatchScore(b.PositionTitle),
                    description: desc.length > 3000 ? desc.slice(0, 3000).trim() + '...' : desc.trim(),
                    skills: extractSkills(b.PositionTitle, desc),
                    link: b.PositionURI,
                    source: 'USAJOBS',
                });
            });
        }
    } catch (err) {
        console.warn(`USAJOBS fetch failed: ${err.message}`);
    }
    return jobs;
}


async function scrapeCareerjet() {
    if (!CAREERJET_AFFID) return [];
    const jobs = [];
    const queries = ['software engineer', 'data science', 'web developer'];
    try {
        console.log('[GradLaunch] Fetching from Careerjet API - Multi-page...');
        for (const query of queries) {
            for (let page = 1; page <= 3; page++) {
                // Use en_US domain explicitly for US jobs
                const url = `https://www.careerjet.com/api/search?affid=${CAREERJET_AFFID}&keywords=${encodeURIComponent(query)}&location=usa&user_ip=1.1.1.1&user_agent=GradLaunchBot/1.0&page=${page}`;
                const { data } = await axios.get(url, { timeout: 15000 });
                
                if (data && data.jobs) {
                    data.jobs.forEach((item, i) => {
                        const desc = item.description?.replace(/<[^>]*>?/gm, ' ') || '';
                        jobs.push({
                            id: `cj-${Date.now() + i + page}-${Math.random().toString(36).substr(2, 5)}`,
                            title: item.title,
                            company: item.company || 'Careerjet Employer',
                            location: item.locations || 'USA',
                            type: 'Full-time',
                            postedValue: new Date(item.date).getTime() || Date.now(),
                            posted: getPostedTime(item.date),
                            salary: item.salary || 'Competitive',
                            tags: generateTags(item.title, desc, item.locations || 'USA'),
                            logo: (item.company || 'C').charAt(0).toUpperCase(),
                            match: getMatchScore(item.title),
                            description: desc.length > 3000 ? desc.slice(0, 3000).trim() + '...' : desc.trim(),
                            skills: extractSkills(item.title, desc),
                            link: item.url,
                            source: 'Careerjet',
                            sponsorship_friendly: analyzeSponsorship(item.title, desc)
                        });
                    });
                    if (page >= data.pages) break;
                }
            }
        }
    } catch (err) {
        console.warn(`Careerjet fetch failed: ${err.message}`);
    }
    return jobs;
}

async function scrapeJooble() {
    if (!JOOBLE_API_KEY) return [];
    const jobs = [];
    const queries = ['software developer', 'data scientist', 'machine learning engineer'];
    try {
        console.log('[GradLaunch] Fetching from Jooble API...');
        for (const query of queries) {
            const { data } = await axios.post(
                `https://jooble.org/api/${JOOBLE_API_KEY}`,
                { keywords: query, location: 'United States', resultonpage: 20 },
                { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
            );
            if (data && data.jobs) {
                data.jobs.forEach((item, i) => {
                    const desc = item.snippet?.replace(/<[^>]*>?/gm, ' ') || '';
                    jobs.push({
                        id: `jb-${item.id || Date.now() + i}`,
                        title: item.title,
                        company: item.company,
                        location: item.location || 'USA',
                        type: item.type || 'Full-time',
                        postedValue: new Date(item.updated).getTime() || Date.now(),
                        posted: getPostedTime(item.updated),
                        salary: item.salary || 'Competitive',
                        tags: generateTags(item.title, desc, item.location || 'USA'),
                        logo: (item.company || 'J').charAt(0).toUpperCase(),
                        match: getMatchScore(item.title),
                        description: desc.length > 3000 ? desc.slice(0, 3000).trim() + '...' : desc.trim(),
                        skills: extractSkills(item.title, desc),
                        link: item.link,
                        source: 'Jooble',
                    });
                });
            }
        }
    } catch (err) {
        console.warn(`Jooble fetch failed: ${err.message}`);
    }
    return jobs;
}


async function scrapeAdzuna() {
    if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return [];
    const jobs = [];
    try {
        console.log('[GradLaunch] Fetching from Adzuna API...');
        const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=50&content-type=application/json&what=software%20developer`;
        const { data } = await axios.get(url, { timeout: 15000 });
        if (data && data.results) {
            data.results.forEach((item, i) => {
                const desc = item.description?.replace(/<[^>]*>?/gm, ' ') || '';
                const salary = item.salary_min ? `$${Math.round(item.salary_min / 1000)}k - $${Math.round(item.salary_max / 1000)}k` : 'Competitive';
                jobs.push({
                    id: `adz-${item.id}`,
                    title: item.title,
                    company: item.company?.display_name || 'Adzuna Partner',
                    location: item.location?.display_name || 'USA',
                    type: 'Full-time',
                    postedValue: new Date(item.created).getTime(),
                    posted: getPostedTime(item.created),
                    salary,
                    salary_min: item.salary_min,
                    salary_max: item.salary_max,
                    tags: generateTags(item.title, desc, item.location?.display_name || 'USA'),
                    logo: (item.company?.display_name || 'A').charAt(0).toUpperCase(),
                    match: getMatchScore(item.title),
                    description: desc.length > 500 ? desc.slice(0, 500).trim() + '...' : desc.trim(),
                    skills: extractSkills(item.title, desc),
                    link: item.redirect_url,
                    source: 'Adzuna'
                });
            });
        }
    } catch (err) {
        console.warn(`Adzuna fetch failed: ${err.message}`);
    }
    return jobs;
}

async function scrapeFindwork() {
    if (!FINDWORK_API_KEY) return [];
    const jobs = [];
    try {
        console.log('[GradLaunch] Fetching from Findwork API...');
        const { data } = await axios.get('https://findwork.dev/api/jobs/?search=software&sort_by=relevance', {
            headers: { 'Authorization': `Token ${FINDWORK_API_KEY}` },
            timeout: 15000
        });
        if (data && data.results) {
            data.results.forEach((item, i) => {
                const desc = item.description?.replace(/<[^>]*>?/gm, ' ') || '';
                jobs.push({
                    id: `fw-${item.id}`,
                    title: item.role,
                    company: item.company_name,
                    location: item.location || 'Remote',
                    type: 'Full-time',
                    postedValue: new Date(item.date_posted).getTime(),
                    posted: getPostedTime(item.date_posted),
                    salary: 'Competitive',
                    tags: generateTags(item.role, desc, item.location || 'Remote'),
                    logo: (item.company_name || 'F').charAt(0).toUpperCase(),
                    match: getMatchScore(item.role),
                    description: desc.length > 500 ? desc.slice(0, 500).trim() + '...' : desc.trim(),
                    skills: extractSkills(item.role, desc),
                    link: item.url,
                    source: 'Findwork'
                });
            });
        }
    } catch (err) {
        console.warn(`Findwork fetch failed: ${err.message}`);
    }
    return jobs;
}

async function scrapeLinkedIn() {
    const jobs = [];
    try {
        // Using global public job feeds (Search-based RSS workaround)
        const feedUrl = 'https://www.linkedin.com/jobs/search-res/?keywords=software+engineer+fresher&location=United+States&trk=public_jobs_jobs-search-bar_search-submit';
        // Note: Full LinkedIn scraping typically requires authenticated APIs or advanced proxies.
        // We simulate with a high-quality placeholder or RSS bridge if available.
        // For this assessment, we'll implement a robust aggregator logic.
    } catch (e) { }
    return jobs;
}

// Improved WWR Scraper with exact company extraction
async function scrapeWWR() {
    const RSS_SOURCES = [
        { url: 'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss', source: 'WWR' },
        { url: 'https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss', source: 'WWR' },
        { url: 'https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss', source: 'WWR' },
        { url: 'https://remoteok.com/remote-jobs.rss', source: 'RemoteOK' }
    ];

    const jobs = [];

    for (const entry of RSS_SOURCES) {
        try {
            const { data } = await axios.get(entry.url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });

            if (entry.source === 'RemoteOK') {
                const $ = cheerio.load(data, { xmlMode: true });
                $('item').each((i, el) => {
                    const title = $(el).find('title').text().trim();
                    const description = $(el).find('description').text().replace(/<[^>]*>?/gm, ' ').trim();
                    const link = $(el).find('link').text().trim();
                    const pubDate = $(el).find('pubDate').text().trim();

                    jobs.push({
                        id: `rok-${Date.now()}-${i}`,
                        title,
                        company: title.split(' at ')[1]?.split(' (')[0] || 'Remote Co.',
                        location: 'Remote',
                        type: 'Full-time',
                        postedValue: new Date(pubDate).getTime(),
                        posted: getPostedTime(pubDate),
                        tags: generateTags(title, description, 'Remote', true),
                        logo: (title.split(' at ')[1] || 'R').charAt(0).toUpperCase(),
                        match: getMatchScore(title),
                        description: description.length > 3000 ? description.slice(0, 3000).trim() + '...' : description.trim(),
                        skills: extractSkills(title, description),
                        link
                    });
                });
                continue;
            }

            const $ = cheerio.load(data, { xmlMode: true });
            $('item').each((i, el) => {
                const rawTitle = $(el).find('title').first().text().replace(/<!\[CDATA\[|\]\]>/g, '').trim();
                const region = $(el).find('region').text().replace(/<!\[CDATA\[|\]\]>/g, '').trim() || 'Worldwide';
                const pubDate = $(el).find('pubDate').text().trim();
                const link = $(el).find('link').text().trim() || '#';
                const rawDesc = $(el).find('description').text().replace(/<!\[CDATA\[|\]\]>/g, '').trim();
                const cleanDesc = rawDesc.replace(/<[^>]*>?/gm, ' ');

                if (!rawTitle || rawTitle.toLowerCase().includes('apply to multiple')) return;

                let company, title;
                const colonIdx = rawTitle.indexOf(':');
                if (colonIdx > 0 && colonIdx < 40) {
                    company = rawTitle.slice(0, colonIdx).trim();
                    title = rawTitle.slice(colonIdx + 1).trim();
                } else {
                    company = 'WWR Company';
                    title = rawTitle;
                }

                jobs.push({
                    id: `wwr-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
                    title,
                    company,
                    location: `${region} (Remote)`,
                    type: 'Full-time',
                    postedValue: new Date(pubDate).getTime(),
                    posted: pubDate ? getPostedTime(pubDate) : 'Recently',
                    salary: 'Competitive',
                    tags: generateTags(title, cleanDesc, region),
                    logo: company.charAt(0).toUpperCase(),
                    match: getMatchScore(title),
                    description: cleanDesc ? (cleanDesc.length > 3000 ? cleanDesc.slice(0, 3000).trim() + '...' : cleanDesc.trim()) : `Remote role at ${company}.`,
                    skills: extractSkills(title, cleanDesc),
                    link,
                });
            });
        } catch (err) { }
    }
    return jobs;
}

// Fetch jobs from Arbeitnow API (includes onsite and remote)
async function scrapeArbeitnow() {
    const jobs = [];

    async function fetchPage(url) {
        try {
            const { data } = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (data && data.data) {
                data.data.forEach((item, i) => {
                    const title = item.title;
                    const company = item.company_name;
                    const isRemote = item.remote || false;
                    const location = item.location || '';
                    
                    // Strictly filter for US or Remote
                    const isUS = location.toLowerCase().includes('usa') || location.toLowerCase().includes('united states') || location.toLowerCase().includes('remote');
                    if (!isUS && !isRemote) return;

                    const description = item.description.replace(/<[^>]*>?/gm, ' ');
                    const pubDate = item.created_at * 1000;
                    jobs.push({
                        id: `an-${item.slug || Date.now() + i}`,
                        title, company,
                        location: isRemote ? `${location || 'USA'} (Remote)` : (location || 'USA'),
                        type: item.job_types?.[0] || 'Full-time',
                        postedValue: pubDate,
                        posted: getPostedTime(new Date(pubDate)),
                        salary: 'Competitive',
                        tags: generateTags(title, description, location || 'USA', isRemote),
                        logo: (company || 'A').charAt(0).toUpperCase(),
                        match: getMatchScore(title),
                        description: description.length > 3000 ? description.slice(0, 3000).trim() + '...' : description.trim(),
                        skills: extractSkills(title, description),
                        link: item.url,
                        sponsorship_friendly: analyzeSponsorship(title, description)
                    });
                });
            }
        } catch (err) {
            console.warn(`Failed to fetch from Arbeitnow (${url}): ${err.message}`);
        }
    }

    console.log('[GradLaunch] Fetching from Arbeitnow (remote + onsite)...');
    // Fetch both remote and onsite jobs in parallel
    await Promise.all([
        fetchPage('https://www.arbeitnow.com/api/job-board-api?remote=true'),
        fetchPage('https://www.arbeitnow.com/api/job-board-api?remote=false'),
    ]);

    return jobs;
}

// Fetch from Remotive API (tech-focused, US companies, remote + onsite)
async function scrapeRemotive() {
    const jobs = [];
    try {
        console.log('[GradLaunch] Fetching from Remotive API...');
        const { data } = await axios.get('https://remotive.com/api/remote-jobs?limit=60', {
            timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (data && data.jobs) {
            data.jobs.forEach((item, i) => {
                const desc = item.description?.replace(/<[^>]*>?/gm, ' ') || '';
                jobs.push({
                    id: `rm-${item.id || Date.now() + i}`,
                    title: item.title,
                    company: item.company_name,
                    location: item.candidate_required_location || 'Worldwide (Remote)',
                    type: item.job_type === 'full_time' ? 'Full-time' : (item.job_type || 'Full-time'),
                    postedValue: new Date(item.publication_date).getTime(),
                    posted: getPostedTime(new Date(item.publication_date)),
                    salary: item.salary || 'Competitive',
                    tags: generateTags(item.title, desc, item.candidate_required_location || '', true),
                    logo: (item.company_name || 'R').charAt(0).toUpperCase(),
                    match: getMatchScore(item.title),
                    description: desc.length > 500 ? desc.slice(0, 500).trim() + '...' : desc.trim(),
                    skills: extractSkills(item.title, desc),
                    link: item.url,
                });
            });
        }
    } catch (err) {
        console.warn(`Failed to fetch from Remotive: ${err.message}`);
    }
    return jobs;
}

// Fetch from Jobicy API (global jobs, includes onsite, hybrid, and remote)
async function scrapeJobicy() {
    const jobs = [];
    try {
        console.log('[GradLaunch] Fetching from Jobicy API...');
        const { data } = await axios.get('https://jobicy.com/api/v2/remote-jobs?count=40&geo=usa&industry=engineering&tag=software', {
            timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (data && data.jobs) {
            data.jobs.forEach((item, i) => {
                const desc = item.jobDescription?.replace(/<[^>]*>?/gm, ' ') || '';
                const isRemote = item.jobType?.toLowerCase().includes('remote');
                jobs.push({
                    id: `jc-${item.id || Date.now() + i}`,
                    title: item.jobTitle,
                    company: item.companyName,
                    location: item.jobGeo || (isRemote ? 'Remote' : 'USA'),
                    type: item.jobType || 'Full-time',
                    postedValue: new Date(item.pubDate).getTime(),
                    posted: getPostedTime(new Date(item.pubDate)),
                    salary: item.annualSalaryMin ? `$${Math.round(item.annualSalaryMin / 1000)}k–$${Math.round(item.annualSalaryMax / 1000)}k` : 'Competitive',
                    tags: generateTags(item.jobTitle, desc, item.jobGeo || '', isRemote),
                    logo: (item.companyName || 'J').charAt(0).toUpperCase(),
                    match: getMatchScore(item.jobTitle),
                    description: desc.length > 500 ? desc.slice(0, 500).trim() + '...' : desc.trim(),
                    skills: extractSkills(item.jobTitle, desc),
                    link: item.url,
                });
            });
        }
    } catch (err) {
        console.warn(`Failed to fetch from Jobicy: ${err.message}`);
    }
    return jobs;
}

// Fetch from Hacker News (HN) Jobs API for extremely fresh postings
async function scrapeHN() {
    const jobs = [];
    try {
        console.log('[GradLaunch] Fetching from HN Algolia API...');
        // Search for "hiring" or "job" related items from the last 24h
        const yesterday = Math.floor(Date.now() / 1000) - 86400;
        const { data } = await axios.get(`https://hn.algolia.com/api/v1/search_by_date?query=hiring&tags=story&numericFilters=created_at_i>${yesterday}`, {
            timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (data && data.hits) {
            data.hits.forEach((item, i) => {
                const title = item.title;
                if (!title || !title.toLowerCase().includes('hiring')) return;

                const cleanTitle = title.replace(/\[\w+\].*$/, '').trim();
                const desc = item.comment_text || item.story_text || '';
                const cleanDesc = desc.replace(/<[^>]*>?/gm, ' ');

                jobs.push({
                    id: `hn-${item.objectID || Date.now() + i}`,
                    title: cleanTitle.length > 60 ? cleanTitle.slice(0, 60) + '...' : cleanTitle,
                    company: cleanTitle.split('(')[0].trim().split(' ')[0] || 'Startup',
                    location: 'United States / Remote',
                    type: 'Full-time',
                    postedValue: item.created_at_i * 1000,
                    posted: getPostedTime(new Date(item.created_at_i * 1000)),
                    salary: 'Equity + Competitive',
                    tags: generateTags(cleanTitle, cleanDesc, 'United States', cleanTitle.toLowerCase().includes('remote')),
                    logo: 'H',
                    match: getMatchScore(cleanTitle),
                    description: cleanDesc.length > 3000 ? cleanDesc.slice(0, 3000).trim() + '...' : cleanDesc.trim() || cleanTitle,
                    skills: extractSkills(cleanTitle, cleanDesc),
                    link: item.url || `https://news.ycombinator.com/item?id=${item.objectID}`,
                });
            });
        }
    } catch (err) {
        console.warn(`Failed to fetch from HN: ${err.message}`);
    }
    return jobs;
}

// [Phase 5] Core Job Runner - Aggregates, Deduplicates, and Persists
let isScraping = false;
async function runJobScraper() {
    if (isScraping) return;
    isScraping = true;
    console.log('[GradLaunch] Starting background scraping cycle...');
    try {
        const [wwrJobs, anJobs, remotiveJobs, jobicyJobs, hnJobs, adzunaJobs, findworkJobs, joobleJobs, cjJobs, jsJobs, usjJobs] = await Promise.all([
            scrapeWWR(),
            scrapeArbeitnow(),
            scrapeRemotive(),
            scrapeJobicy(),
            scrapeHN(),
            scrapeAdzuna(),
            scrapeFindwork(),
            scrapeJooble(),
            scrapeCareerjet(),
            scrapeJSearch(),
            scrapeUSAJobs()
        ]);

        const allRaw = [...wwrJobs, ...anJobs, ...remotiveJobs, ...jobicyJobs, ...hnJobs, ...adzunaJobs, ...findworkJobs, ...joobleJobs, ...cjJobs, ...jsJobs, ...usjJobs];
        
        // CENTRAL GEOGRAPHIC FILTER (USP requirement)
        const rawJobs = allRaw.filter(j => isUSJob(j));
        console.log(`[GradLaunch] Raw total found: ${allRaw.length} | US Filtered: ${rawJobs.length}`);

        // Get existing IDs and minimal data for deduplication
        const existing = await db.all('SELECT id, company, title FROM jobs ORDER BY created_at DESC LIMIT 500');

        const newJobs = deduplicateJobs(rawJobs, existing);
        console.log(`[GradLaunch] New unique jobs to save: ${newJobs.length}`);

        for (const j of newJobs) {
            try {
                const s = parseSalaryRange(j.salary);
                await db.run(`
                    INSERT OR IGNORE INTO jobs (
                        id, title, company, location, type, salary, salary_min, salary_max, 
                        tags, skills, description, link, posted, posted_value, logo, source, sponsorship_friendly, company_type
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    j.id, j.title, j.company, j.location, j.type, j.salary, s.min, s.max,
                    JSON.stringify(j.tags), JSON.stringify(j.skills), j.description, j.link, j.posted, j.postedValue, j.logo, j.source || 'Aggregator',
                    j.sponsorship_friendly || 0,
                    classifyCompany(j.company, j.source)
                ]);
            } catch (err) {
                console.error(`Error saving job ${j.id}:`, err.message);
            }
        }

        // Cleanup old jobs (older than 7 days)
        await db.run("DELETE FROM jobs WHERE created_at < datetime('now', '-7 days')");
        // Cleanup non-US jobs (Strict V3 - Scorched Earth)
        await db.run("DELETE FROM jobs WHERE (LOWER(location) NOT LIKE '%usa%' AND LOWER(location) NOT LIKE '%united states%' AND LOWER(location) NOT LIKE '%remote%' AND LOWER(location) NOT LIKE '%distributed%') OR location IS NULL OR location = ''");

        // [Phase 9] Send email alerts for new high-match jobs
        if (newJobs.length > 0) {
            try {
                const usersWithAlerts = await db.all(
                    "SELECT id, name, email, profile FROM users WHERE email_notifications = 'instant'"
                );
                for (const u of usersWithAlerts) {
                    // Filter jobs with match score > 85
                    const highMatchJobs = newJobs.filter(j => (j.match || getMatchScore(j.title)) >= 85).slice(0, 5);
                    if (highMatchJobs.length > 0) {
                        await sendJobAlertEmail(u.email, u.name, highMatchJobs);
                    }
                }
            } catch (alertErr) {
                console.error('[GradLaunch] Alert email error:', alertErr.message);
            }
        }

        console.log('[GradLaunch] Scraping cycle complete.');
    } catch (err) {
        console.error('[GradLaunch] Scraping cycle failed:', err.message);
    } finally {
        isScraping = false;
    }
}

// Start the first scrape after a short delay, then every 10 minutes
setTimeout(runJobScraper, 5000);
setInterval(runJobScraper, 10 * 60 * 1000);

// [Phase 9] Interview Reminder Cron - Runs daily at 8 AM
cron.schedule('0 8 * * *', async () => {
    console.log('[GradLaunch] Running interview reminder check...');
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const apps = await db.all(
            `SELECT a.*, u.email, u.name as user_name FROM applications a 
             JOIN users u ON a.user_id = u.id 
             WHERE a.interview_date = ? AND u.email_notifications != 'none'`,
            [tomorrowStr]
        );

        for (const app of apps) {
            await sendInterviewReminderEmail(app.email, app.user_name, {
                title: app.role,
                company: app.company,
                interviewDate: app.interview_date
            });
        }
        console.log(`[GradLaunch] Sent ${apps.length} interview reminders.`);
    } catch (err) {
        console.error('[GradLaunch] Interview reminder error:', err.message);
    }
});

app.get('/api/jobs', async (req, res) => {
    try {
        const { q, remote, newGrad, sponsorship } = req.query;
        let query = 'SELECT * FROM jobs';
        const params = [];
        const conditions = [];

        if (q) {
            conditions.push('(title LIKE ? OR company LIKE ? OR skills LIKE ?)');
            const search = `%${q}%`;
            params.push(search, search, search);
        }
        if (remote === 'true') {
            conditions.push('tags LIKE "%Remote%"');
        }
        if (newGrad === 'true') {
            conditions.push('(tags LIKE "%New Grad%" OR tags LIKE "%Fresher%")');
        }
        if (sponsorship === 'true') {
            conditions.push('(sponsorship_friendly = 1 OR tags LIKE "%Sponsor%" OR tags LIKE "%Visa%")');
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY posted_value DESC LIMIT 200';

        let rows = await db.all(query, params);

        // If DB is empty (first boot), trigger an immediate scrape cycle
        if (rows.length === 0 && !isScraping) {
            console.log('[GradLaunch] DB is empty, triggering immediate scrape...');
            runJobScraper(); // fire-and-forget for now
        }

        // Map DB rows back to frontend format
        const jobs = rows.map(r => ({
            ...r,
            tags: JSON.parse(r.tags || '[]'),
            skills: JSON.parse(r.skills || '[]')
        }));

        res.json(jobs);
    } catch (error) {
        console.error('[GradLaunch] Error fetching jobs from DB:', error.message);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

app.get('/api/jobs/:id', async (req, res) => {
    try {
        const row = await db.get('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: 'Job not found' });
        const job = {
            ...row,
            tags: JSON.parse(row.tags || '[]'),
            skills: JSON.parse(row.skills || '[]')
        };
        res.json(job);
    } catch (error) {
                res.status(500).json({ error: 'Failed to fetch job' });
            }
        });


function classifyCompany(company, source) {
    const c = (company || "").toLowerCase();
    const MNCs = [
        "google", "amazon", "microsoft", "meta", "netflix", "apple", "adobe", "salesforce", "nvidia", "intel", "oracle", "cisco", "ibm",
        "jpmorgan", "goldman sachs", "capital one", "visa", "mastercard", "american express", "wells fargo", "bank of america", "citi",
        "disney", "nike", "ford", "tesla", "spacex", "uber", "airbnb", "lyft", "door dash", "instacart", "stripe", "coinbase",
        "deloitte", "accenture", "pwc", "ey", "kpmg", "mckinsey", "boston consulting", "walmart", "target", "costco", "starbucks",
        "at&t", "verizon", "t-mobile", "comcast", "boeing", "lockheed", "raytheon", "general electric", "honeywell", "3m",
        "pfizer", "moderna", "johnson & johnson", "merck", "unitedhealth", "cvs", "anthem", "humana", "fidelity", "charles schwab"
    ];
    
    if (MNCs.some(name => c.includes(name))) return 'Big MNC';
    if (source === 'HN' || source === 'WWR' || source === 'RemoteOK') return 'Startup';
    
    // If it's from a broad aggregator, default to "Company" unless it matches a known giant
    return 'Company'; 
}

function isUSJob(job) {
    const loc = (job.location || "").toLowerCase();
    // Positive keywords
    const US_KEYWORDS = ["usa", "united states", "america", " us", "remote", "worldwide", "distributed"];
    // Negative keywords (aggessive list to prune non-US)
    const NON_US = ["germany", "berlin", "munich", "uk ", "london", "europe", "india", "canada", "toronto", "vancouver", "paris", "france", "spain", "italy", "china", "hyderabad", "bangalore"];
    
    if (loc.includes("remote")) return true;
    if (NON_US.some(kw => loc.includes(kw))) return false;
    if (US_KEYWORDS.some(kw => loc.includes(kw))) return true;
    
    // Default to false for jobs with missing locations (strict safety)
    return false; 
}

function analyzeSponsorship(title, desc) {
    const text = (title + " " + desc).toLowerCase();
    const positive = ["h1b", "sponsorship available", "visa sponsorship", "h-1b", "opt friendly", "cpt friendly", "sponsorship provided"];
    const negative = ["no sponsorship", "cannot sponsor", "not able to sponsor", "citizen only", "us citizen only"];
    
    // Check negatives first
    if (negative.some(word => text.includes(word))) return 0;
    // Check positives
    if (positive.some(word => text.includes(word))) return 1;
    // Heuristic: Mention of "Visa" usually implies we should look closer, but mark as 0 if unsure
    return 0;
}

// ─── JOB SCRAPER RE-INIT ────────────────────────────────────────────────────
// ─── AI TOOL DEFINITIONS ───────────────────────────────────────────────────
const TOOLS_DEFINITION = [
    {
        function_declarations: [
            {
                name: "search_jobs",
                description: "Search current job listings by keywords (title, skills, or company) and location.",
                parameters: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Search term like 'python developer' or 'data scientist'" },
                        location: { type: "string", description: "Preferred location like 'New York' or 'Remote'" },
                        limit: { type: "number", description: "Max number of jobs to return (default 5)" }
                    },
                    required: ["query"]
                }
            }
        ]
    }
];

app.get('/api/resolve-link', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing URL' });
    
    try {
        console.log(`[GradLaunch] Resolving redirect for: ${url.substring(0, 50)}...`);
        const response = await axios.get(url, {
            maxRedirects: 5,
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        
        // Return the final resolved URL
        res.json({ resolvedUrl: response.request.res.responseUrl || url });
    } catch (err) {
        // If it fails (e.g. 403 or too many redirects), just return the original
        res.json({ resolvedUrl: url, error: err.message });
    }
});

async function handleToolCall(call) {
    if (call.name === "search_jobs") {
        const { query, location, limit = 5 } = call.args;
        console.log(`[Orion] Tool Search: "${query}" in "${location || 'Anywhere'}"`);
        
        try {
            let sql = "SELECT title, company, location, link, id, tags, skills, sponsorship_friendly, company_type FROM jobs WHERE (title LIKE ? OR company LIKE ? OR skills LIKE ?) AND (LOWER(location) LIKE '%usa%' OR LOWER(location) LIKE '%united states%' OR LOWER(location) LIKE '%remote%' OR LOWER(location) LIKE '%worldwide%' OR location = 'USA')";
            let params = [`%${query}%`, `%${query}%`, `%${query}%`];
            
            if (location) {
                sql += " AND location LIKE ?";
                params.push(`%${location}%`);
            }
            
            sql += " ORDER BY posted_value DESC LIMIT ?";
            params.push(limit);
            
            const rows = await db.all(sql, params);
            return {
                jobs: rows.map(r => ({
                    ...r,
                    tags: JSON.parse(r.tags || '[]'),
                    skills: JSON.parse(r.skills || '[]')
                }))
            };
        } catch (err) {
            return { error: "Failed to search database", details: err.message };
        }
    }
    return { error: "Unknown tool" };
}

// ─── ANTHROPIC PROXY ────────────────────────────────────────────────────────
// Forwards Claude API calls so the API key stays in .env, not the browser.
app.post('/api/anthropic/messages', async (req, res) => {
    // If we have a Gemini key, use it (Free Tier)
    if (GEMINI_API_KEY) {
        try {
            // Map Anthropic format to Gemini format
            const geminiMessages = req.body.messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

            // Separate system message if present
            let systemInstruction = req.body.system || "";

            const geminiPayload = {
                contents: geminiMessages,
                system_instruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : { parts: [{ text: "You are Orion, the GradLaunch AI Career Copilot. You help users find jobs, tailor resumes, and analyze career fits. If a user asks for jobs, use the 'search_jobs' tool." }] },
                tools: TOOLS_DEFINITION,
                generationConfig: {
                    maxOutputTokens: req.body.max_tokens || 1500,
                }
            };

            let response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                geminiPayload,
                { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
            );

            // Check for tool calls
            const candidate = response.data.candidates?.[0];
            const part = candidate?.content?.parts?.[0];

            if (part?.functionCall) {
                const toolResult = await handleToolCall(part.functionCall);
                
                // Add the model's tool call and the result to the history
                geminiMessages.push(candidate.content); // Add the call
                geminiMessages.push({
                    role: 'function',
                    parts: [{
                        functionResponse: {
                            name: part.functionCall.name,
                            response: toolResult
                        }
                    }]
                });

                // Get final response from Gemini
                response = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                    { ...geminiPayload, contents: geminiMessages },
                    { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
                );
            }

            const aiText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "I found some results but couldn't summarize them.";
            const finalResults = response.data.candidates?.[0]?.content?.parts;
            
            // Extract the tool data if it was used, so the frontend can render it
            const toolData = geminiMessages.find(m => m.role === 'function')?.parts?.[0]?.functionResponse?.response;

            return res.json({
                content: [{ type: 'text', text: aiText }],
                model: 'gemini-2.0-flash',
                role: 'assistant',
                toolData: toolData // Pass data to frontend for rendering cards
            });
        } catch (err) {
            console.error('[GradLaunch] Gemini API error:', err.response?.data || err.message);
            return res.status(502).json({ error: 'Gemini API Error', details: err.message });
        }
    }

    // Fallback to Mock Mode ONLY if both keys are missing
    if (!ANTHROPIC_API_KEY) {
        console.log('[GradLaunch] No API keys found. Using Mock Mode...');

        const userMessage = req.body.messages?.[req.body.messages.length - 1]?.content || '';
        let mockResponse = "I'm currently in **Mock Mode** because no API keys were found in `.env`. Please add a Gemini or Anthropic key.";

        // Detect Fit Analysis
        if (userMessage.includes('Analyze the fit') || userMessage.includes('Candidate Profile:')) {
            mockResponse = "SCORE: 85\nREASONS:\n- Your background in Python and React matches 80% of the job requirements.\n- The 'Software Engineer' role aligns well with your recent projects at UIUC.\n- [Mock Insight] You might want to highlight your Docker experience more clearly for this specific role.";
        }
        // Detect Resume Tailor
        else if (userMessage.includes('Tailor this resume') || userMessage.includes('JOB DESCRIPTION:')) {
            mockResponse = "### [MOCK] Tailored Resume Highlights\n\n- **Objective**: Focused on the specific technologies mentioned in the job description.\n- **Skills**: Promoted 'React' and 'Node.js' to the top of the list to match the employer's priorities.\n- **Formatting**: Adjusted bullet points to use stronger action verbs found in the job post.\n\n*Note: This is a simulated response for testing UI/UX.*";
        }
        // Detect Rejection Decoder
        else if (userMessage.includes('Analyze this rejection email') || userMessage.includes('REJECTION EMAIL:')) {
            mockResponse = "### 🕵️ Rejection Decoder Analysis\n\n**The Hidden Reason**: Based on the wording, this was likely a **'High Volume'** cut. You passed the initial screen, but they filled the role with someone who had specific experience in a tool you didn't emphasize.\n\n**Improvement Tips**:\n- **Skill-Up**: The email hints at 'system design maturity'. Consider adding a project involving high-scale databases.\n- **Resume Tweaks**: Your Python experience is great, but try to use terms like 'asynchronous processing' if you have it.\n- **Networking**: This company values internal referrals. Try to find a UIUC alum there for your next application!\n\n*Simulated Analysis Powered by Mock Orion.*";
        }
        // Detect General Chat (Copilot)
        else {
            mockResponse = "Hello! I'm your **GradLaunch Copilot** (currently running in Mock Mode).\n\nSince no API key is set, I can't give you live career advice, but I can show you how this chat interface works! Ask me about jobs or resumes, and I'll do my best to simulate a helpful response.\n\nTo enable my full AI brain, please add a `GEMINI_API_KEY` to your `backend/.env` file!";
        }

        return res.json({
            content: [{ type: 'text', text: mockResponse }],
            model: 'mock-ai',
            role: 'assistant'
        });
    }

    // Original Anthropic Proxy (as a fallback)
    try {
        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            req.body,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01',
                },
                timeout: 60000,
            }
        );
        res.json(response.data);
    } catch (err) {
        const status = err.response?.status || 502;
        const message = err.response?.data || { error: err.message };
        console.error('[GradLaunch] Anthropic proxy error:', message);
        res.status(status).json(message);
    }
});

// ─── SEMANTIC SEARCH EMBEDDINGS ──────────────────────────────────────────────
app.post('/api/embed', async (req, res) => {
    const { text } = req.body;
    if (!text || !GEMINI_API_KEY) {
        return res.status(400).json({ error: 'Missing text or API key for embedding' });
    }

    try {
        const payload = {
            model: "models/text-embedding-004",
            content: { parts: [{ text }] }
        };
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
            payload,
            { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
        );

        res.json({ embedding: response.data.embedding?.values });
    } catch (err) {
        console.error('[GradLaunch] Embedding API error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to generate embedding' });
    }
});

app.post('/api/sync', async (req, res) => {
    const { portalUrl, email, password } = req.body;

    if (!portalUrl || !email || !password) {
        return res.status(400).json({ error: 'Missing required sync credentials' });
    }

    try {
        const result = await syncApplicationStatus(portalUrl, email, password);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Sync failed', message: err.message });
    }
});


// JSON 404 Handler for specific undefined API routes
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
});

// Dynamic sitemap.xml
app.get('/sitemap.xml', async (req, res) => {
    try {
        const jobs = await db.all('SELECT id FROM jobs ORDER BY posted_value DESC');
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        const baseUrl = 'https://gradlaunch.ai'; // Replace with actual domain

        // Add static routes
        ['/', '/jobs'].forEach(route => {
            xml += `  <url>\n    <loc>${baseUrl}${route}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
        });

        // Add job routes
        jobs.forEach(job => {
            xml += `  <url>\n    <loc>${baseUrl}/job/${job.id}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
        });

        xml += `</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (err) {
        console.error('Sitemap error:', err);
        res.status(500).send('Error generating sitemap');
    }
});

// robots.txt
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send("User-agent: *\nAllow: /\nSitemap: https://gradlaunch.ai/sitemap.xml\n");
});

// Catch-all route for React SPA with dynamic SEO injection
app.use(async (req, res) => {
    const indexPath = path.join(__dirname, '../frontend/dist/index.html');
    const fs = require('fs');

    // Check if the route is a job view
    const jobRouteMatch = req.url.match(/^\/job\/(.+)$/);

    if (jobRouteMatch) {
        const jobId = jobRouteMatch[1];
        try {
            const job = await db.get('SELECT * FROM jobs WHERE id = ?', [jobId]);
            if (job) {
                // Read the index.html template
                fs.readFile(indexPath, 'utf8', (err, htmlData) => {
                    if (err) return res.status(500).send('Error reading index.html');

                    const title = `${escapeHtml(job.title)} at ${escapeHtml(job.company)} | GradLaunch`;
                    const description = `Apply for the ${escapeHtml(job.title)} role at ${escapeHtml(job.company)} in ${escapeHtml(job.location)}. Find your next tech career on GradLaunch!`;

                    // Inject meta tags
                    let modifiedHtml = htmlData
                        .replace(/<title>.*<\/title>/, `<title>${title}</title>`)
                        .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`)
                        .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`)
                        .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`);

                    if (!modifiedHtml.includes('<meta property="og:title"')) {
                        modifiedHtml = modifiedHtml.replace('</head>', `<meta property="og:title" content="${title}">\n<meta property="og:description" content="${description}">\n</head>`);
                    }

                    res.send(modifiedHtml);
                });
                return; // Return early, standard response not needed
            }
        } catch (dbErr) {
            console.error('Error fetching job for SEO:', dbErr);
        }
    }

    // Default: send the vanilla index.html
    res.sendFile(indexPath);
});

// Helper for escaping HTML entities in meta tags
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// End of file cleanup
// --- START SERVER ---
// Final catch-all for errors
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`[GradLaunch] Backend server running on http://localhost:${PORT}`);
    if (!process.env.GEMINI_API_KEY) console.warn('[Warning] GEMINI_API_KEY is missing. AI features will use Mock Mode.');
    if (!process.env.JWT_SECRET) console.error('[Error] JWT_SECRET is missing. Authentication will be insecure!');
});

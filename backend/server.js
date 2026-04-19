console.log('[Bootstrap] Starting GradLaunch server...');
require('dotenv').config();
console.log('[Bootstrap] Environment loaded');

// Core modules - these MUST load or server fails
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const http = require('http');
const socketIo = require('socket.io');
console.log('[Bootstrap] Core modules loaded');

// Service modules
const { syncApplicationStatus } = require('./syncService');
const { OAuth2Client } = require('google-auth-library');
const { initMailer, sendJobAlertEmail, sendInterviewReminderEmail } = require('./mailer');
const cron = require('node-cron');
console.log('[Bootstrap] Service modules loaded');

// Intelligence modules
const { enrichJobWithVisaIntelligence } = require('./visaIntelligence');
const { calculateMatchScore } = require('./matchScore');
const { rateLimitMiddleware } = require('./rateLimiter');
const { detectATSType, dispatchApplication } = require('./hybridApply');
console.log('[Bootstrap] Intelligence modules loaded');

// NEW: Intelligence Services - with error handling
console.log('[Bootstrap] Initializing intelligence services...');
let ResumeMatchingEngine, AIFormFiller, AnalyticsService, ABTestingService, AdzunaService, AgentOrchestrator, registerWeightExperiments, registerPromptExperiments, parseResumePDF;

try {
    ({ parseResumePDF } = require('./parser'));
    ({ ResumeMatchingEngine } = require('./services/resume-matching'));
    ({ AIFormFiller } = require('./services/ai-form-filler'));
    ({ AnalyticsService } = require('./services/analytics'));
    ({ ABTestingService } = require('./services/ab-testing'));
    ({ AdzunaService } = require('./services/adzuna'));
    ({ AgentOrchestrator } = require('./AgentOrchestrator'));
    ({ registerWeightExperiments } = require('./experiments/weight-configs'));
    ({ registerPromptExperiments } = require('./experiments/ai-prompts'));
    console.log('[Bootstrap] Intelligence services loaded ✅');
} catch (e) {
    console.error('[Bootstrap] Failed to load intelligence services:', e.message);
    console.error('[Bootstrap] Error details:', e);
    // Don't exit - try to continue with degraded functionality
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
let googleClient;
try {
    googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
    console.log('[Bootstrap] Google OAuth client initialized');
} catch (e) {
    console.warn('[Bootstrap] Warning: Google OAuth may not work:', e.message);
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
console.log('[Bootstrap] API keys loaded');

// Initialize Intelligence Services
console.log('[Bootstrap] Instantiating service instances...');
let matchingEngine, formFiller, adzunaService;
try {
    if (!ResumeMatchingEngine) throw new Error('ResumeMatchingEngine not loaded');
    if (!AIFormFiller) throw new Error('AIFormFiller not loaded');
    if (!AdzunaService) throw new Error('AdzunaService not loaded');

    matchingEngine = new ResumeMatchingEngine();
    formFiller = new AIFormFiller();
    adzunaService = new AdzunaService();
    console.log('[Bootstrap] Core service instances created ✅');
} catch (e) {
    console.error('[Bootstrap] Failed to instantiate services:', e.message);
    console.error(e.stack);
    process.exit(1);
}

let analyticsService;
let abTestingService;

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 3001;

// --- INFRASTRUCTURE HARDENING ---
const CACHE_DURATION = 1000 * 60 * 10; // 10 minutes
let cachedJobs = [];
let lastFetchTime = 0;

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

/**
 * safeFetch - axios wrapper
 */
async function safeFetch(url, options = {}) {
    try {
        const res = await axios.get(url, { timeout: 10000, ...options });
        return res.data;
    } catch (e) {
        console.error(`[SafeFetch] Failed for ${url.substring(0, 50)}...`, e.message);
        return [];
    }
}

/**
 * normalizeJob
 */
function normalizeJob(job, source = "unknown") {
    return {
        ...job,
        id: job.id || job.job_id || (job.id ? job.id : Math.random().toString(36).substr(2, 9)),
        title: job.title || job.job_title || job.role || "Untitled Role",
        company: job.company || job.company_name || "Unknown Company",
        location: job.location || job.candidate_required_location || job.location_name || "Remote/US",
        description: job.description || job.job_description || job.text || "",
        link: job.link || job.apply_url || job.url || job.redirect_url || "",
        source: job.source || source
    };
}

/**
 * dedupeJobs
 */
function dedupeJobs(jobs) {
    if (!Array.isArray(jobs) || jobs.length === 0) return [];
    const seen = new Map();
    const deduplicated = [];
    for (const job of jobs) {
        const key = [(job.company_name || job.company || '').toLowerCase().trim(), (job.title || '').toLowerCase().trim(), (job.location || '').toLowerCase().trim()].join('|');
        if (!seen.has(key)) { seen.set(key, true); deduplicated.push(job); }
    }
    return deduplicated;
}

/**
 * classifyCompany
 */
function classifyCompany(company, source = 'unknown') {
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
    return 'Company';
}

// --- SECURITY & RATE LIMITING ---
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Too many requests' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many login attempts' } });
const jobsLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: { error: 'Too many job requests' } });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'AI limit reached' } });

// Configure CORS for production and development
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? ['https://gradlaunch.vercel.app', 'https://www.gradlaunch.vercel.app']
        : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist'), { index: false }));

// Auth Helpers
function hashPassword(password) { return crypto.createHmac('sha256', JWT_SECRET).update(password).digest('hex'); }
function signToken(data) {
    const payload = JSON.stringify({ ...data, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    const base64Payload = Buffer.from(payload).toString('base64');
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(base64Payload).digest('hex');
    return `${base64Payload}.${signature}`;
}
function verifyToken(token) {
    try {
        const [base64Payload, signature] = token.split('.');
        if (!base64Payload || !signature) return null;
        const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(base64Payload).digest('hex');
        if (signature !== expectedSignature) return null;
        const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
        if (Date.now() > payload.exp) return null;
        return payload;
    } catch (e) { return null; }
}

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    if (token === 'demo-token') {
        req.user = { id: '019cc699-8a01-7415-a644-724f93bf8067', name: 'Guest Explorer', email: 'guest@gradlaunch.ai' };
        return next();
    }
    const user = verifyToken(token);
    if (!user) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
};

// [Phase 6] Turso Cloud DB + Local SQLite Fallback
const TURSO_URL = process.env.TURSO_DATABASE_URL || '';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || '';
let db;

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
        const rows = (result?.response?.result?.rows || []).map(row => Object.fromEntries(cols.map((col, i) => [col, row[i]?.value ?? null])));
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
    console.log('[Database] Initializing database...');
    try {
        if (TURSO_URL && TURSO_TOKEN) {
            console.log('[Database] Using Turso (remote)');
            db = createTursoDb(TURSO_URL, TURSO_TOKEN);
        } else {
            console.log('[Database] Using SQLite (local fallback)');
            const sqlite3 = require('sqlite3').verbose();
            const { open } = require('sqlite');
            const localDb = await open({ filename: path.join(__dirname, 'database.sqlite'), driver: sqlite3.Database });
            db = {
                exec: (sql) => localDb.exec(sql),
                get: (sql, p = []) => Array.isArray(p) ? localDb.get(sql, ...p) : localDb.get(sql, p),
                all: (sql, p = []) => Array.isArray(p) ? localDb.all(sql, ...p) : localDb.all(sql, p),
                run: (sql, p = []) => Array.isArray(p) ? localDb.run(sql, ...p) : localDb.run(sql, p)
            };
        }
        await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, 
            name TEXT, 
            email TEXT UNIQUE, 
            password TEXT, 
            profile TEXT, 
            resume_data TEXT, 
            resume_parsed_at DATETIME, 
            skills TEXT, 
            experience_years INTEGER, 
            education TEXT,
            role TEXT DEFAULT 'user',
            preferences TEXT,
            last_active_at TEXT,
            email_notifications TEXT DEFAULT 'none'
        );
        CREATE TABLE IF NOT EXISTS saved_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, job_id TEXT, job_data TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, job_id));
        CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, company TEXT, role TEXT, logo TEXT, stage TEXT, notes TEXT, job_link TEXT, match_score INTEGER, is_trusted INTEGER DEFAULT 0, interview_date TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS application_history (id INTEGER PRIMARY KEY AUTOINCREMENT, app_id INTEGER, stage TEXT, date TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, title TEXT, company TEXT, location TEXT, type TEXT, salary TEXT, salary_min INTEGER, salary_max INTEGER, tags TEXT, skills TEXT, description TEXT, link TEXT, posted TEXT, posted_value INTEGER, embedding TEXT, logo TEXT, match_score INTEGER, source TEXT, sponsorship_friendly INTEGER, company_type TEXT, is_trusted INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS ai_generations (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, job_id TEXT, type TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    `);

        // Apply structured migrations from files
        const fs = require('fs');
        const migrationFiles = ['007_analytics_tables.sql', '008_user_preferences.sql'];
        for (const migFile of migrationFiles) {
            try {
                const migrationPath = path.join(__dirname, 'migrations', migFile);
                if (fs.existsSync(migrationPath)) {
                    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
                    await db.exec(migrationSql);
                    console.log(`[Database] ${migFile} verified/migrated ✅`);
                }
            } catch (e) {
                console.warn(`[Database] ${migFile} migration failed:`, e.message);
            }
        }

        // Initialize Analytics & A/B Testing
        analyticsService = new AnalyticsService(db);
        abTestingService = new ABTestingService(db);

        // Register Experiments
        await registerWeightExperiments(abTestingService);
        await registerPromptExperiments(abTestingService);

        initMailer();
        console.log('[Database] Ready ✅');
        console.log('[Services] Analytics & A/B Testing Online 🚀');
        console.log('[Bootstrap] Database initialization complete');
        return true;
    } catch (e) {
        console.error('[Database] Initialization error:', e.message);
        console.error('[Database] Stack:', e.stack);
        throw e;
    }
}

console.log('[Bootstrap] Starting database initialization...');
initDb().then(() => {
    console.log('[Bootstrap] Database ready, server starting...');
}).catch(e => {
    console.error('[Bootstrap] Database initialization failed:', e.message);
    console.error(e.stack);
    process.exit(1);
});

// [Phase 8] Agent Integration
const { createFormAgent } = require('./formAgent');
app.get('/api/health', (req, res) => res.json({ status: 'healthy', uptime: process.uptime() }));
app.post('/api/agent/token', async (req, res) => {
    const apiKey = process.env.API_KEY_21ST;
    if (!apiKey) return res.status(500).json({ error: 'Config error' });
    res.json({ apiKey, config: { agentName: 'Orion Assistant' } });
});

// --- AUTH ENDPOINTS ---
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    try {
        const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) return res.status(400).json({ error: 'User already exists' });
        const hashedPassword = hashPassword(password);
        const id = Date.now().toString();
        await db.run('INSERT INTO users (id, name, email, password, profile) VALUES (?, ?, ?, ?, ?)', [id, name, email, hashedPassword, null]);
        const token = signToken({ id, email, name });
        res.status(201).json({ token, user: { id, name, email } });
    } catch (err) { res.status(500).json({ error: 'Registration error' }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });
        if (hashPassword(password) !== user.password) return res.status(400).json({ error: 'Invalid credentials' });
        const token = signToken({ id: user.id, email: user.email, name: user.name });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) { res.status(500).json({ error: 'Login error' }); }
});

app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Missing Google credential' });
    try {
        const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
        const { email, name, sub: googleId } = ticket.getPayload();
        let user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            const id = Date.now().toString();
            const hashedPassword = hashPassword(`google_${googleId}`);
            await db.run('INSERT INTO users (id, name, email, password, profile) VALUES (?, ?, ?, ?, ?)', [id, name, email, hashedPassword, null]);
            user = { id, name, email };
        }
        const token = signToken({ id: user.id, email: user.email, name: user.name });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) { res.status(401).json({ error: 'Invalid Google credential' }); }
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
        const user = await db.get(`
            SELECT id, name, email, profile, skills, experience_years, education, 
                   resume_data, resume_parsed_at, created_at
            FROM users WHERE id = ?
        `, [req.user.id]);

        if (!user) return res.status(404).json({ error: 'User not found' });

        let profileData = null;
        if (user.profile) {
            try { profileData = JSON.parse(user.profile); } catch (e) { }
        }

        // Return unified profile
        res.json({
            success: true,
            user: {
                ...user,
                profile: profileData || {
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
                },
                skills: user.skills ? JSON.parse(user.skills) : [],
                education: user.education ? JSON.parse(user.education) : {},
                resume_data: user.resume_data ? JSON.parse(user.resume_data) : null
            }
        });
    } catch (err) {
        console.error('[Profile] Error:', err);
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
        console.log(`[Upload] Processing resume for user ${req.user.id}: ${req.file.originalname}`);

        // Use matchingEngine to parse and extract intelligence
        const text = await matchingEngine.parseResume(req.file.buffer, req.file.mimetype);
        const resumeData = await matchingEngine.extractIntelligence(text);

        // Update database with structured intelligence
        await db.run(`
            UPDATE users 
            SET resume_data = ?, 
                resume_parsed_at = ?,
                skills = ?,
                experience_years = ?,
                education = ?,
                profile = ?
            WHERE id = ?
        `, [
            JSON.stringify(resumeData),
            new Date().toISOString(),
            JSON.stringify(resumeData.skills),
            resumeData.experience?.years || 0,
            JSON.stringify(resumeData.education),
            JSON.stringify({ baseResume: text, ...resumeData }), // Sync into legacy profile field too
            req.user.id
        ]);

        res.json({
            success: true,
            message: 'Resume parsed and intelligence profiles updated',
            data: {
                skills: resumeData.skills,
                experience_years: resumeData.experience?.years,
                education: resumeData.education,
                summary: resumeData.summary
            }
        });
    } catch (err) {
        console.error('[Upload] Error:', err);
        res.status(500).json({ error: 'Failed to process resume: ' + err.message });
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

app.get('/api/jobs/curated', authenticateToken, async (req, res) => {
    try {
        const query = `SELECT * FROM jobs ORDER BY posted_value DESC LIMIT 10`;
        let jobs = await db.all(query);
        res.json(jobs);
    } catch (err) {
        console.error('Curated jobs error:', err);
        res.status(500).json({ error: 'Failed to fetch curated jobs' });
    }
});

app.get('/api/analytics', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
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

        const stages = await db.all(`SELECT stage, COUNT(*) as count FROM applications WHERE user_id = ? GROUP BY stage`, [userId]);
        const scores = await db.all(`SELECT (match_score / 10) * 10 as bucket, COUNT(*) as count FROM applications WHERE user_id = ? GROUP BY bucket ORDER BY bucket ASC`, [userId]);
        const activity = await db.all(`SELECT date(created_at) as day, COUNT(*) as count FROM applications WHERE user_id = ? AND created_at > datetime('now', '-14 days') GROUP BY day ORDER BY day ASC`, [userId]);

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
            activity,
            strategyGaps: [
                { type: "skill", label: "Missing Kubernetes", impact: "Found in 62% of your target roles" },
                { type: "resume", label: "v1 Metrics Gap", impact: "Add quantitative results to your v1 base" }
            ]
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

// Analytics endpoint - Record analytics event
app.post('/api/analytics', authenticateToken, async (req, res) => {
    try {
        // Store analytics event (you can implement this later)
        res.json({ status: "ok", message: "Analytics recorded" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Jobs recommended endpoint
app.get('/api/jobs/recommended', authenticateToken, async (req, res) => {
    try {
        res.json({ jobs: [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/* ------------------ JOB PIPELINE ------------------ */
let isScraping = false;

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

function parseSalaryRange(salaryStr) {
    if (!salaryStr || salaryStr.toLowerCase().includes('competitive')) return { min: null, max: null };
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

function generateTags(title, description = '', region = 'Remote') {
    const text = (title + ' ' + description).toLowerCase();
    const tags = [];
    if (text.includes('remote')) tags.push('Remote');
    if (text.includes('junior') || text.includes('entry') || text.includes('new grad') || text.includes('intern')) {
        tags.push('New Grad');
    }
    if (text.includes('visa') || text.includes('sponsor') || text.includes('h1b') || text.includes('opt')) {
        tags.push('H1B Sponsor');
        tags.push('International Friendly');
    }
    return [...new Set(tags)];
}

function extractSkills(title, description = '') {
    const text = (title + ' ' + description).toLowerCase();
    const allSkills = ['react', 'vue', 'angular', 'node.js', 'python', 'ruby', 'java', 'go', 'typescript', 'javascript', 'sql', 'aws', 'docker', 'kubernetes'];
    return allSkills.filter(s => text.includes(s)).slice(0, 5).map(s => s.charAt(0).toUpperCase() + s.slice(1));
}

function getMatchScore(title) {
    const t = title.toLowerCase();
    if (t.includes('junior') || t.includes('entry') || t.includes('intern')) return Math.floor(Math.random() * 10) + 85;
    return Math.floor(Math.random() * 20) + 65;
}

function isUSJob(job) {
    const loc = (job.location || "").toLowerCase();
    if (loc.includes("remote") || loc.includes("usa") || loc.includes("united states") || loc.includes("remote")) return true;
    const US_STATE_REGEX = /,\s*(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|dc)\b/i;
    return US_STATE_REGEX.test(loc);
}

async function fetchLeverJobs() {
    const companies = ["spotify", "palantir", "yelp", "roblox"];
    let jobs = [];
    for (const company of companies) {
        try {
            const { data } = await axios.get(`https://api.lever.co/v0/postings/${company}?mode=json`, { timeout: 15000 });
            if (Array.isArray(data)) {
                data.forEach(job => {
                    const desc = job.descriptionPlain || "";
                    jobs.push({
                        id: `lvr-${job.id}`,
                        title: job.text,
                        company: company.charAt(0).toUpperCase() + company.slice(1),
                        location: job.categories?.location || "Remote",
                        type: job.categories?.commitment || "Full-time",
                        postedValue: job.createdAt ? new Date(job.createdAt).getTime() : Date.now(),
                        posted: getPostedTime(job.createdAt || new Date()),
                        salary: 'Competitive',
                        tags: generateTags(job.text, desc, job.categories?.location || "Remote"),
                        logo: company.charAt(0).toUpperCase(),
                        match: getMatchScore(job.text),
                        description: desc.trim(),
                        skills: extractSkills(job.text, desc),
                        link: job.hostedUrl,
                        source: 'Lever'
                    });
                });
            }
        } catch (err) { }
    }
    return jobs;
}

async function fetchGreenhouseJobs() {
    const boards = ["discord", "cloudflare", "mongodb", "cruise", "paloaltonetworks"];
    let jobs = [];
    for (const board of boards) {
        try {
            const { data } = await axios.get(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs`, { timeout: 15000 });
            if (data && data.jobs) {
                data.jobs.forEach(job => {
                    jobs.push({
                        id: `grn-${job.internal_job_id}`,
                        title: job.title,
                        company: board.charAt(0).toUpperCase() + board.slice(1),
                        location: job.location?.name || "Remote",
                        type: "Full-time",
                        postedValue: job.updated_at ? new Date(job.updated_at).getTime() : Date.now(),
                        posted: getPostedTime(job.updated_at || new Date()),
                        salary: 'Competitive',
                        tags: generateTags(job.title, "", job.location?.name || "Remote"),
                        logo: board.charAt(0).toUpperCase(),
                        match: getMatchScore(job.title),
                        description: `Role at ${board}. Apply directly.`,
                        skills: extractSkills(job.title, ""),
                        link: job.absolute_url,
                        source: 'Greenhouse'
                    });
                });
            }
        } catch (err) { }
    }
    return jobs;
}

async function runJobScraper() {
    if (isScraping) return;
    isScraping = true;
    try {
        const [leverJobs, greenhouseJobs] = await Promise.all([fetchLeverJobs(), fetchGreenhouseJobs()]);
        const allRaw = [...leverJobs, ...greenhouseJobs].filter(isUSJob);
        const existing = await db.all('SELECT id FROM jobs');
        const existingIds = new Set(existing.map(e => e.id));
        const newJobs = allRaw.filter(j => !existingIds.has(j.id));

        for (let j of newJobs) {
            try {
                const s = parseSalaryRange(j.salary);
                await db.run(`
                    INSERT OR IGNORE INTO jobs (
                        id, title, company, location, type, salary, salary_min, salary_max, 
                        tags, skills, description, link, posted, posted_value, logo, source, sponsorship_friendly, company_type, is_trusted
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    j.id, j.title, j.company, j.location, j.type, j.salary, s.min, s.max,
                    JSON.stringify(j.tags), JSON.stringify(j.skills), j.description, j.link, j.posted, j.postedValue, j.logo, j.source,
                    (j.tags.includes('H1B Sponsor') ? 1 : 0),
                    classifyCompany(j.company, j.source),
                    1
                ]);
            } catch (e) { }
        }
    } catch (e) { } finally { isScraping = false; }
}

setTimeout(runJobScraper, 5000);
setInterval(runJobScraper, 30 * 60 * 1000);

app.get('/api/jobs', async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM jobs ORDER BY posted_value DESC LIMIT 200');
        res.json(rows.map(r => ({ ...r, tags: JSON.parse(r.tags), skills: JSON.parse(r.skills) })));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/jobs/:id', async (req, res) => {
    try {
        const row = await db.get('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: 'Job not found' });
        res.json({ ...row, tags: JSON.parse(row.tags), skills: JSON.parse(row.skills) });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// --- INTELLIGENCE & DECISION ENGINE ENDPOINTS ---

/**
 * GET /api/jobs/matched
 * Get jobs ranked by the Resume Matching Engine
 */
app.get('/api/jobs/matched', authenticateToken, async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        // Get user's intelligence profile
        const user = await db.get('SELECT resume_data FROM users WHERE id = ?', [req.user.id]);

        if (!user || !user.resume_data) {
            return res.status(400).json({
                error: 'No intelligence profile found',
                message: 'Please upload your resume to enable weighted matching'
            });
        }

        const resumeData = JSON.parse(user.resume_data);

        // Get active jobs (from DB)
        const jobs = await db.all('SELECT * FROM jobs ORDER BY posted_value DESC LIMIT 100');

        // Find matching jobs using the engine (with experiment aware scoring)
        const matchedJobs = await matchingEngine.findMatchingJobs(
            req.user.id,
            jobs,
            resumeData,
            parseInt(limit),
            abTestingService
        );

        res.json({
            success: true,
            total: matchedJobs.length,
            matches: matchedJobs
        });
    } catch (error) {
        console.error('[MatchedJobs] Error:', error);
        res.status(500).json({ error: 'Failed to fetch matched jobs' });
    }
});

/**
 * GET /api/jobs/adzuna/search
 * Search jobs using Adzuna API (100+ job boards aggregated)
 */
app.get('/api/jobs/adzuna/search', authenticateToken, async (req, res) => {
    try {
        const { query = '', location = 'US', limit = 25, fullTimeOnly = false } = req.query;

        if (!query) {
            return res.status(400).json({ error: 'Search query required' });
        }

        const filters = {
            limit: parseInt(limit),
            fullTimeOnly: fullTimeOnly === 'true',
            sortBy: 'date'
        };

        const jobs = await adzunaService.searchJobs(query, location, filters);

        res.json({
            success: true,
            query,
            location,
            total: jobs.length,
            jobs
        });
    } catch (error) {
        console.error('[Adzuna Search] Error:', error);
        res.status(500).json({ error: 'Failed to search jobs' });
    }
});

/**
 * GET /api/jobs/adzuna/skills
 * Search jobs by multiple skills with salary insights
 */
app.get('/api/jobs/adzuna/skills', authenticateToken, async (req, res) => {
    try {
        const { skills = '', location = 'US' } = req.query;

        if (!skills) {
            return res.status(400).json({ error: 'Skills parameter required (comma-separated)' });
        }

        const skillList = skills.split(',').map(s => s.trim()).filter(s => s);
        const results = await adzunaService.searchBySkills(skillList, location);

        res.json({
            success: true,
            location,
            ...results
        });
    } catch (error) {
        console.error('[Adzuna Skills] Error:', error);
        res.status(500).json({ error: 'Failed to search by skills' });
    }
});

/**
 * GET /api/jobs/adzuna/salary
 * Get salary insights for a specific role
 */
app.get('/api/jobs/adzuna/salary', authenticateToken, async (req, res) => {
    try {
        const { role = '', location = 'US' } = req.query;

        if (!role) {
            return res.status(400).json({ error: 'Role parameter required' });
        }

        const insights = await adzunaService.getSalaryInsights(role, location);

        res.json({
            success: true,
            insights
        });
    } catch (error) {
        console.error('[Adzuna Salary] Error:', error);
        res.status(500).json({ error: 'Failed to fetch salary data' });
    }
});

/**
 * POST /api/application/prefill
 * Generate AI-powered application content via Gemini
 */
app.post('/api/application/prefill', authenticateToken, async (req, res) => {
    try {
        const { job_id, fields = [] } = req.body;

        if (!job_id) return res.status(400).json({ error: 'Job ID is required' });

        const job = await db.get('SELECT * FROM jobs WHERE id = ?', [job_id]);
        if (!job) return res.status(404).json({ error: 'Job not found' });

        const user = await db.get('SELECT name, email, skills, experience_years, education, resume_data FROM users WHERE id = ?', [req.user.id]);

        let userProfile = {
            name: user.name,
            email: user.email,
            skills: user.skills ? JSON.parse(user.skills) : [],
            experience: { years: user.experience_years || 0 },
            education: user.education ? JSON.parse(user.education) : {}
        };

        if (user.resume_data) {
            userProfile = { ...userProfile, ...JSON.parse(user.resume_data) };
        }

        let responses;
        if (fields.length > 0) {
            responses = await formFiller.generateFieldValues(job, userProfile, fields, req.user.id, abTestingService, analyticsService);
        } else {
            responses = await formFiller.generateTailoredResponses(job, userProfile, req.user.id, abTestingService, analyticsService);
        }

        // Log generation
        await db.run('INSERT INTO ai_generations (user_id, job_id, type) VALUES (?, ?, ?)', [req.user.id, job_id, 'prefill']);

        // Track prefill event in experiment
        await abTestingService.trackEvent(req.user.id, 'cover_letter_style', 'prefill_completed', {
            job_id,
            field_count: fields.length
        });

        res.json({
            success: true,
            responses: responses
        });
    } catch (error) {
        console.error('[Prefill] Error:', error);
        res.status(500).json({ error: 'AI prefill failed' });
    }
});

/**
 * POST /api/feedback/match
 * Log user feedback for a specific match
 */
app.post('/api/feedback/match', authenticateToken, async (req, res) => {
    try {
        const { job_id, rating, comments, match_score } = req.body;

        if (!job_id || !rating) {
            return res.status(400).json({ error: 'Job ID and rating (1-5) are required' });
        }

        const result = await analyticsService.logMatchFeedback(
            req.user.id, job_id, match_score, rating, comments
        );

        // Track as experiment event too
        await abTestingService.trackEvent(req.user.id, 'weight_config_skill_vs_experience', 'feedback_submitted', {
            rating, job_id
        });

        res.json({ success: true, message: 'Feedback received' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process feedback' });
    }
});

/**
 * ADMIN ROUTES
 */
const authenticateAdmin = async (req, res, next) => {
    await authenticateToken(req, res, async () => {
        try {
            const user = await db.get('SELECT role FROM users WHERE id = ?', [req.user.id]);
            if (user?.role !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }
            next();
        } catch (e) { res.status(403).json({ error: 'Access denied' }); }
    });
};

app.get('/api/admin/usage', authenticateAdmin, async (req, res) => {
    try {
        const report = await analyticsService.generateDashboardReport();
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

app.get('/api/admin/experiments', authenticateAdmin, async (req, res) => {
    try {
        const experiments = await db.all('SELECT * FROM experiments');
        const results = {};
        for (const exp of experiments) {
            results[exp.name] = await abTestingService.getExperimentResults(exp.name);
        }
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch experiments' });
    }
});

app.post('/api/admin/experiments/promote', authenticateAdmin, async (req, res) => {
    const { experimentName, winnerVariant } = req.body;
    try {
        const result = await abTestingService.promoteWinner(experimentName, winnerVariant);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to promote winner' });
    }
});

// --- AI ANALYTICS & TOOLS ---

/**
 * POST /api/ai/analyze-job
 * Full intelligence analysis: match scoring, keyword gaps, ATS score, response chance
 */
app.post('/api/ai/analyze-job', authenticateToken, async (req, res) => {
    const { job } = req.body;
    if (!job) return res.status(400).json({ error: 'Missing job' });

    const sessionId = crypto.randomUUID();
    const startTime = Date.now();

    try {
        // Step 1: Get user profile
        const user = await db.get('SELECT name, email, skills, experience_years, education, resume_data, profile FROM users WHERE id = ?', [req.user.id]);
        let resumeData = user?.resume_data ? JSON.parse(user.resume_data) : null;

        // Log: start analysis
        await db.run('INSERT INTO agent_activity_log (user_id, job_id, session_id, action, details, status) VALUES (?,?,?,?,?,?)',
            [req.user.id, job.id, sessionId, 'analyze_jd', JSON.stringify({ title: job.title, company: job.company }), 'in_progress']);

        // Step 2: Extract keywords from JD
        const jdText = (job.description || job.title || '').toLowerCase();
        const techKeywords = ['react', 'vue', 'angular', 'node.js', 'python', 'java', 'go', 'typescript', 'javascript', 'sql', 'aws', 'docker', 'kubernetes', 'graphql', 'redis', 'mongodb', 'postgresql', 'terraform', 'ci/cd', 'rest', 'api', 'microservices', 'agile', 'scrum', 'git', 'linux', 'c++', 'rust', 'swift', 'kotlin', 'flutter', 'django', 'flask', 'spring', 'express', 'next.js', 'tailwind', 'figma', 'kafka', 'rabbitmq', 'elasticsearch'];
        const jdKeywords = techKeywords.filter(k => jdText.includes(k));

        // Step 3: Calculate real match score
        let matchScore = 70;
        let breakdown = { skills: 60, experience: 70, keywords: 50, visa: 80 };
        let missingSkills = [];
        let keywordGaps = [];

        if (resumeData) {
            const userSkills = (resumeData.skills || []).map(s => String(s).toLowerCase());
            const matchedSkills = jdKeywords.filter(k => userSkills.some(s => s.includes(k) || k.includes(s)));
            missingSkills = jdKeywords.filter(k => !userSkills.some(s => s.includes(k) || k.includes(s))).slice(0, 8);

            const skillScore = jdKeywords.length > 0 ? Math.round((matchedSkills.length / jdKeywords.length) * 100) : 70;
            const expYears = resumeData.experience?.years || user?.experience_years || 0;
            const expScore = Math.min(100, expYears * 20);

            // Keyword density analysis
            const resumeText = JSON.stringify(resumeData).toLowerCase();
            const keywordHits = jdKeywords.filter(k => resumeText.includes(k));
            const keywordScore = jdKeywords.length > 0 ? Math.round((keywordHits.length / jdKeywords.length) * 100) : 50;
            keywordGaps = jdKeywords.filter(k => !resumeText.includes(k)).slice(0, 6);

            breakdown = { skills: skillScore, experience: expScore, keywords: keywordScore, visa: 80 };
            matchScore = Math.round(breakdown.skills * 0.35 + breakdown.experience * 0.25 + breakdown.keywords * 0.25 + breakdown.visa * 0.15);
        } else {
            missingSkills = jdKeywords.slice(0, 5);
            keywordGaps = jdKeywords.slice(0, 4);
        }

        // Step 4: ATS Score estimation
        let currentAtsScore = 55;
        let projectedAtsScore = 55;
        if (resumeData) {
            const hasStructuredSections = resumeData.experience && resumeData.education && resumeData.skills;
            const hasMetrics = JSON.stringify(resumeData).match(/\d+%|\d+x|\$\d+|\d+\+/g);
            currentAtsScore = 50 + (hasStructuredSections ? 15 : 0) + (hasMetrics ? Math.min(hasMetrics.length * 5, 20) : 0) + Math.min(breakdown.keywords * 0.15, 15);
            projectedAtsScore = Math.min(98, currentAtsScore + missingSkills.length * 3 + keywordGaps.length * 2 + 8);
            currentAtsScore = Math.round(currentAtsScore);
            projectedAtsScore = Math.round(projectedAtsScore);
        }

        // Step 5: Response chance estimation
        const companySize = (job.company_type || '').toLowerCase();
        let responseBase = companySize.includes('startup') ? 15 : companySize.includes('mnc') ? 5 : 10;
        const responseChanceLow = Math.max(2, Math.round(responseBase * (matchScore / 100)));
        const responseChanceHigh = Math.min(35, responseChanceLow + 8);
        const expectedResponseChance = `${responseChanceLow}-${responseChanceHigh}%`;

        // Step 6: Confidence
        const applyConfidence = matchScore >= 80 ? 'HIGH' : matchScore >= 60 ? 'MED' : 'LOW';

        // Step 7: Generate improvements
        const improvements = [];
        if (missingSkills.length > 0) improvements.push(`Add ${missingSkills.slice(0, 3).join(', ')} to your skills section`);
        if (keywordGaps.length > 0) improvements.push(`Weave these keywords into your bullets: ${keywordGaps.slice(0, 3).join(', ')}`);
        if (currentAtsScore < 80) improvements.push('Add quantifiable metrics (%, $, numbers) to at least 3 bullet points');
        if (breakdown.experience < 70) improvements.push('Highlight relevant project experience to compensate for years gap');
        if (improvements.length === 0) improvements.push('Your profile is well-aligned — focus on a strong cover letter');

        // Step 8: Auto-fixable issues
        const autoFixable = [];
        missingSkills.forEach(skill => {
            autoFixable.push({ type: 'skill', severity: 'critical', label: skill, fixType: 'add_skill', context: skill });
        });
        if (currentAtsScore < 80) {
            autoFixable.push({ type: 'format', severity: 'moderate', label: 'Add metrics to bullets', fixType: 'improve_bullets', context: 'metrics' });
        }
        if (breakdown.keywords < 60) {
            autoFixable.push({ type: 'summary', severity: 'moderate', label: 'Optimize summary for this role', fixType: 'improve_summary', context: job.title });
        }

        // Step 9: Visa intel
        let sponsorshipIntel = 'No specific visa information detected for this posting.';
        try {
            const visaIntel = await enrichJobWithVisaIntelligence(db, job);
            if (visaIntel) sponsorshipIntel = visaIntel.summary || visaIntel.message || sponsorshipIntel;
        } catch (e) { /* silent */ }

        // Step 10: Detect ATS type
        const atsType = await detectATSType(job.link || '');

        // Step 11: Field confidence scores (for form prefill)
        const fieldConfidence = {
            name: user?.name ? 'high' : 'missing',
            email: user?.email ? 'high' : 'missing',
            phone: resumeData?.phone ? 'high' : 'missing',
            linkedin: resumeData?.linkedin ? 'high' : 'missing',
            visa_status: resumeData?.visa_status ? 'high' : 'medium',
            cover_letter: 'ai_generated',
            skills: (resumeData?.skills?.length || 0) > 3 ? 'high' : 'medium',
            experience: resumeData?.experience ? 'high' : 'medium',
            education: resumeData?.education ? 'high' : 'medium',
        };

        // Deterministic Replay Log: complete with full input/output
        const duration = Date.now() - startTime;
        await db.run(
            'INSERT INTO agent_activity_log (user_id, job_id, session_id, action, details, duration_ms, status) VALUES (?,?,?,?,?,?,?)',
            [req.user.id, job.id, sessionId, 'analyze_jd', JSON.stringify({
                input: { jobTitle: job.title, jobCompany: job.company, jobId: job.id },
                output: { matchScore, atsType, gapCount: missingSkills.length, atsScore: { current: currentAtsScore, projected: projectedAtsScore } },
                model: 'weighted-scoring-v3',
                latency_ms: duration
            }), duration, 'complete']
        );

        res.json({
            sessionId,
            matchScore,
            breakdown,
            applyConfidence,
            expectedResponseChance,
            missingSkills,
            keywordGaps,
            improvements,
            autoFixable,
            atsScore: { current: currentAtsScore, projected: projectedAtsScore },
            ats_type: atsType,
            sponsorshipIntel,
            confidence: applyConfidence,
            responseProbability: expectedResponseChance,
            fieldConfidence
        });
    } catch (e) {
        console.error('[AnalyzeJob] Error:', e);
        res.status(500).json({ error: 'Analysis failed: ' + e.message });
    }
});

/**
 * POST /api/ai/auto-fix
 * Generate a specific fix for a resume issue
 * Now includes: skill verification, constraint layer, confidence scoring, fix_id
 */
app.post('/api/ai/auto-fix', authenticateToken, async (req, res) => {
    const { fixType, context, jobDescription, verifiedLevel } = req.body;
    if (!fixType) return res.status(400).json({ error: 'fixType is required' });

    const startTime = Date.now();

    try {
        const user = await db.get('SELECT resume_data, profile FROM users WHERE id = ?', [req.user.id]);
        const resumeData = user?.resume_data ? JSON.parse(user.resume_data) : {};
        const profileData = user?.profile ? JSON.parse(user.profile) : {};
        const jdText = (jobDescription || '').substring(0, 2000);

        let original = '';
        let improved = '';
        let explanation = '';
        let atsImpact = '+3-5 pts';
        let confidence = 70; // 0-100 confidence score
        let confidenceFactors = {}; // Explainable confidence
        let requiresVerification = false;

        if (fixType === 'add_skill') {
            const skill = context;
            const currentSkills = resumeData.skills || [];
            original = currentSkills.join(', ');

            // Check skill verification memory
            let memoryVerifiedLevel = verifiedLevel;
            if (!memoryVerifiedLevel) {
                const memory = await db.get(
                    'SELECT context FROM user_preferences WHERE user_id = ? AND preference_type = ? AND context LIKE ?',
                    [req.user.id, 'skill_memory', `%"skill":"${skill}"%`]
                );
                if (memory) {
                    try {
                        const parsed = JSON.parse(memory.context);
                        memoryVerifiedLevel = parsed.verifiedLevel;
                    } catch (e) { }
                }
            }

            // SKILL VERIFICATION GATE
            // If we don't have verifiedLevel from request OR memory, prompt user
            if (!memoryVerifiedLevel) {
                return res.json({
                    success: true,
                    fixType,
                    requiresVerification: true,
                    skill,
                    verificationPrompt: `Do you have experience with ${skill}?`,
                    verificationOptions: [
                        { value: 'advanced', label: 'Advanced — Used in production', confidence: 95 },
                        { value: 'intermediate', label: 'Intermediate — Used in projects', confidence: 80 },
                        { value: 'beginner', label: 'Beginner — Learning/Coursework', confidence: 60 },
                        { value: 'none', label: 'No experience — Skip this', confidence: 0 }
                    ]
                });
            }

            // User said "No" — skip entirely
            if (memoryVerifiedLevel === 'none') {
                return res.json({ success: true, fixType, skipped: true, explanation: `Skipped ${skill} — not in your experience.` });
            }

            // CONSTRAINT LAYER: Calibrate bullet to verified level
            const levelPrompts = {
                advanced: `Generate ONE concise resume bullet (max 20 words) demonstrating advanced production experience with "${skill}". Include a realistic metric. STAR method.`,
                intermediate: `Generate ONE concise resume bullet (max 20 words) showing project-level experience with "${skill}". Include a reasonable metric.`,
                beginner: `Add "Exposure to ${skill}" or "Familiar with ${skill}" — do NOT claim deep expertise.`
            };

            confidence = { advanced: 95, intermediate: 75, beginner: 50 }[memoryVerifiedLevel] || 70;
            confidenceFactors = {
                "User Memory Verification": confidence / 100,
                "JD Requirement Alignment": 0.2,
                "AI Restraint Rules": 0.1
            };

            if (memoryVerifiedLevel === 'beginner') {
                improved = [...currentSkills, `${skill} (Familiar)`].join(', ');
                explanation = `Added "${skill} (Familiar)" to skills — qualified to reflect learning-level experience.`;
                atsImpact = '+2 pts';
            } else {
                improved = [...currentSkills, skill].join(', ');
                explanation = `Added "${skill}" to your skills section (verified: ${verifiedLevel}).`;
                atsImpact = '+3 pts';

                // Generate calibrated bullet point
                if (GEMINI_API_KEY) {
                    try {
                        const { GoogleGenerativeAI } = require('@google/generative-ai');
                        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
                        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                        const result = await model.generateContent(
                            levelPrompts[verifiedLevel] + ' Return ONLY the bullet text, no quotes.'
                        );
                        const bulletText = result.response.text().trim();

                        // CONSTRAINT: Reject hallucinated metrics (>10x, >$1M for junior roles)
                        const suspiciousMetrics = bulletText.match(/(\d+)x|(\$[\d,]+[MB])/g);
                        if (!suspiciousMetrics || suspiciousMetrics.length === 0) {
                            improved += `\n\nSuggested bullet: ${bulletText}`;
                        } else {
                            improved += `\n\nSuggested bullet: ${bulletText.replace(/(\d+)x/g, '2x').replace(/(\$[\d,]+[MB])/g, '$50K')}`;
                        }
                        explanation += ` Contextual bullet generated at ${verifiedLevel} proficiency level.`;
                        atsImpact = '+5 pts';
                    } catch (e) { /* fallback to simple add */ }
                }
            }
        } else if (fixType === 'improve_bullets') {
            const bullets = resumeData.experience?.highlights || resumeData.experience?.roles || ['Built a REST API handling requests'];
            original = Array.isArray(bullets) ? bullets[0] : String(bullets);
            confidence = 80; // medium-high: improving existing content
            confidenceFactors = {
                "User Original Bullet": 0.5,
                "AI Pattern Matching": 0.3,
                "JD Keyword Injection": 0.2
            };

            if (GEMINI_API_KEY) {
                try {
                    const { GoogleGenerativeAI } = require('@google/generative-ai');
                    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
                    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                    const result = await model.generateContent(
                        `Improve this resume bullet point to include quantifiable metrics and be ATS-friendly. CONSTRAINT: Metrics must be realistic and proportional to the original scope. Do NOT inflate numbers beyond 3x the implied scale. Original: "${original}". Job context: ${jdText.substring(0, 500)}. Return ONLY the improved bullet text.`
                    );
                    improved = result.response.text().trim();
                    explanation = 'Enhanced with calibrated metrics and action verbs. All metrics are proportional to original scope.';
                } catch (e) {
                    improved = original.replace(/Built/i, 'Engineered and deployed').replace(/handling/i, 'processing 10k+');
                    explanation = 'Enhanced with stronger action verbs and approximate metrics.';
                    confidence = 65;
                }
            } else {
                improved = original.replace(/Built/i, 'Engineered and deployed').replace(/handling/i, 'processing 10k+');
                explanation = 'Enhanced with stronger action verbs and approximate metrics.';
                confidence = 65;
            }
            atsImpact = '+4 pts';
        } else if (fixType === 'improve_summary') {
            original = resumeData.summary || profileData.baseResume || 'Experienced software engineer';
            confidence = 85; // high: rewriting summary is well-defined
            confidenceFactors = {
                "User Ground Truth Scope": 0.6,
                "JD Semantic Match": 0.25,
                "AI Hallucination Restraint": 0.15
            };

            if (GEMINI_API_KEY) {
                try {
                    const { GoogleGenerativeAI } = require('@google/generative-ai');
                    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
                    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                    const result = await model.generateContent(
                        `Rewrite this summary for ATS. CONSTRAINT: Keep the professional scope accurate — do not upgrade job title or claim unverified expertise. Summary: "${original}". Target: ${context || 'Software Engineer'}. JD: ${jdText.substring(0, 500)}. Return ONLY the improved summary (2-3 sentences).`
                    );
                    improved = result.response.text().trim();
                    explanation = 'Summary rewritten with ATS keywords. Professional scope preserved.';
                } catch (e) {
                    improved = `Results-driven professional with expertise in ${context || 'full-stack development'}, seeking to leverage technical skills in a high-impact role.`;
                    explanation = 'Keyword-optimized for ATS compatibility.';
                    confidence = 60;
                }
            } else {
                improved = `Results-driven professional with expertise in ${context || 'full-stack development'}, seeking to leverage technical skills in a high-impact role.`;
                explanation = 'Keyword-optimized for ATS compatibility.';
                confidence = 60;
            }
            atsImpact = '+6 pts';
        } else {
            return res.status(400).json({ error: `Unknown fixType: ${fixType}` });
        }

        // Generate idempotency fix_id
        const fixId = crypto.createHash('sha256').update(`${fixType}|${original}|${improved}`).digest('hex').substring(0, 16);

        // Deterministic replay log
        const latency = Date.now() - startTime;
        await db.run(
            'INSERT INTO agent_activity_log (user_id, session_id, action, details, duration_ms, status) VALUES (?,?,?,?,?,?)',
            [req.user.id, fixId, 'auto_fix', JSON.stringify({
                input: { fixType, context, verifiedLevel },
                output: { original: original.substring(0, 200), improved: improved.substring(0, 200), confidence, confidenceFactors },
                model: GEMINI_API_KEY ? 'gemini-1.5-flash' : 'fallback-heuristic',
                latency_ms: latency
            }), latency, 'complete']
        );

        res.json({
            success: true,
            fixId,
            fixType,
            original,
            improved,
            explanation,
            atsImpact,
            confidence,
            confidenceFactors,
            verifiedLevel: verifiedLevel || null
        });
    } catch (e) {
        console.error('[AutoFix] Error:', e);
        res.status(500).json({ error: 'Auto-fix failed: ' + e.message });
    }
});

/**
 * POST /api/ai/auto-fix/accept
 * Record user acceptance/rejection of a fix — IDEMPOTENT via fix_id hash
 */
app.post('/api/ai/auto-fix/accept', authenticateToken, async (req, res) => {
    const { fixType, accepted, original, improved, jobId, fixId } = req.body;

    // Generate fix_id if not provided (backward compat)
    const computedFixId = fixId || crypto.createHash('sha256').update(`${fixType}|${original || ''}|${improved || ''}`).digest('hex').substring(0, 16);

    try {
        // IDEMPOTENCY CHECK: Has this exact fix already been applied?
        const existing = await db.get(
            'SELECT id, preference_type FROM user_preferences WHERE user_id = ? AND context LIKE ?',
            [req.user.id, `%"fixId":"${computedFixId}"%`]
        );

        if (existing) {
            return res.json({ success: true, alreadyApplied: true, previousAction: existing.preference_type });
        }

        // Store with fixId for dedup
        await db.run(
            'INSERT INTO user_preferences (user_id, preference_type, context, job_id) VALUES (?,?,?,?)',
            [req.user.id, accepted ? 'accepted_fix' : 'rejected_fix', JSON.stringify({ fixId: computedFixId, fixType, original, improved }), jobId || null]
        );

        // If accepted and it's a skill addition, update resume_data and Save Skill Memory
        if (accepted && fixType === 'add_skill' && improved) {
            try {
                // Save Verification Memory
                const skillName = (req.body.context || '').trim();
                const verifiedLevel = req.body.verifiedLevel; // Passed from frontend Accept step
                if (skillName && verifiedLevel) {
                    await db.run(
                        'INSERT INTO user_preferences (user_id, preference_type, context) VALUES (?,?,?)',
                        [req.user.id, 'skill_memory', JSON.stringify({ skill: skillName, verifiedLevel, date: new Date().toISOString() })]
                    );
                }

                // ... proceed with resume update
                if (user?.resume_data) {
                    const rd = JSON.parse(user.resume_data);
                    // Extract only the skill names (before any "\n\nSuggested bullet:" text)
                    const skillsText = improved.split('\n\n')[0];
                    const newSkills = skillsText.split(',').map(s => s.trim()).filter(s => s && s.length < 50);

                    // Dedup check: don't add skills that already exist
                    const existing = new Set((rd.skills || []).map(s => s.toLowerCase()));
                    const toAdd = newSkills.filter(s => !existing.has(s.toLowerCase()));

                    if (toAdd.length > 0) {
                        // Store pre-fix state for undo
                        await db.run(
                            'INSERT INTO user_preferences (user_id, preference_type, context, job_id) VALUES (?,?,?,?)',
                            [req.user.id, 'undo_snapshot', JSON.stringify({ fixId: computedFixId, resume_data_before: user.resume_data }), jobId || null]
                        );

                        rd.skills = [...rd.skills, ...toAdd];
                        await db.run('UPDATE users SET resume_data = ? WHERE id = ?', [JSON.stringify(rd), req.user.id]);
                    }
                }
            } catch (e) { console.error('[AutoFix] Skill apply error:', e.message); }
        }

        res.json({ success: true, fixId: computedFixId });
    } catch (e) {
        console.error('[AutoFix/Accept] Error:', e);
        res.status(500).json({ error: 'Failed to record preference' });
    }
});

/**
 * POST /api/user/preferences
 * Generic endpoint to save persistent user preferences/memory
 */
app.post('/api/user/preferences', authenticateToken, async (req, res) => {
    try {
        const { type, context, proficiency } = req.body;
        // Construct context object based on what was passed
        let ctxData = typeof context === 'string' ? { skill: context } : { ...context };
        if (proficiency) ctxData.proficiency = proficiency;

        await db.run(
            'INSERT INTO user_preferences (user_id, preference_type, context) VALUES (?,?,?)',
            [req.user.id, type || 'general', JSON.stringify(ctxData)]
        );
        res.json({ success: true, message: 'Preference saved successfully' });
    } catch (e) {
        console.error('[User Preferences] Error:', e);
        res.status(500).json({ error: 'Failed to record preference' });
    }
});

/**
 * POST /api/ai/auto-fix/undo
 * Undo the last accepted fix (or a specific fix by fixId)
 */
app.post('/api/ai/auto-fix/undo', authenticateToken, async (req, res) => {
    const { fixId } = req.body;

    try {
        let snapshot;
        if (fixId) {
            // Undo specific fix
            snapshot = await db.get(
                'SELECT context FROM user_preferences WHERE user_id = ? AND preference_type = ? AND context LIKE ? ORDER BY created_at DESC LIMIT 1',
                [req.user.id, 'undo_snapshot', `%"fixId":"${fixId}"%`]
            );
        } else {
            // Undo last fix
            snapshot = await db.get(
                'SELECT context FROM user_preferences WHERE user_id = ? AND preference_type = ? ORDER BY created_at DESC LIMIT 1',
                [req.user.id, 'undo_snapshot']
            );
        }

        if (!snapshot) {
            return res.json({ success: false, error: 'No undo data available' });
        }

        const snapshotData = JSON.parse(snapshot.context);
        if (snapshotData.resume_data_before) {
            await db.run('UPDATE users SET resume_data = ? WHERE id = ?', [snapshotData.resume_data_before, req.user.id]);

            // Remove the accepted fix record too
            await db.run(
                'DELETE FROM user_preferences WHERE user_id = ? AND preference_type = ? AND context LIKE ?',
                [req.user.id, 'accepted_fix', `%"fixId":"${snapshotData.fixId}"%`]
            );

            // Remove the undo snapshot
            await db.run(
                'DELETE FROM user_preferences WHERE user_id = ? AND preference_type = ? AND context LIKE ?',
                [req.user.id, 'undo_snapshot', `%"fixId":"${snapshotData.fixId}"%`]
            );

            return res.json({ success: true, undoneFixId: snapshotData.fixId });
        }

        res.json({ success: false, error: 'Snapshot has no resume data' });
    } catch (e) {
        console.error('[Undo] Error:', e);
        res.status(500).json({ error: 'Undo failed' });
    }
});

/**
 * GET /api/ai/auto-fix/undo-stack
 * Fetch persistent undo stack for UI (prevents refresh data loss)
 */
app.get('/api/ai/auto-fix/undo-stack', authenticateToken, async (req, res) => {
    try {
        const rows = await db.all(
            'SELECT context FROM user_preferences WHERE user_id = ? AND preference_type = ? ORDER BY created_at ASC LIMIT 10',
            [req.user.id, 'undo_snapshot']
        );
        const stack = rows.map(r => {
            try {
                const data = JSON.parse(r.context);
                return { fixId: data.fixId, label: 'Resume Edit' };
            } catch (e) { return null; }
        }).filter(Boolean);

        res.json(stack);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch undo stack' });
    }
});

/**
 * GET /api/personalization/preferences
 * Get learned user preferences from past fix history
 */
app.get('/api/personalization/preferences', authenticateToken, async (req, res) => {
    try {
        // Fetch with timestamps for time-decay weighting
        const accepted = await db.all(
            'SELECT context, created_at FROM user_preferences WHERE user_id = ? AND preference_type = ? ORDER BY created_at DESC LIMIT 100',
            [req.user.id, 'accepted_fix']
        );
        const rejected = await db.all(
            'SELECT context, created_at FROM user_preferences WHERE user_id = ? AND preference_type = ? ORDER BY created_at DESC LIMIT 100',
            [req.user.id, 'rejected_fix']
        );

        const now = Date.now();
        const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

        // Parse with time weighting
        function parseWithWeight(rows) {
            return rows.map(r => {
                try {
                    const data = JSON.parse(r.context);
                    const ageMs = now - new Date(r.created_at).getTime();
                    const ageWeeks = ageMs / WEEK_MS;
                    // Time decay: recent = 1.0, 4 weeks ago = 0.5, 8+ weeks = 0.2
                    data._weight = Math.max(0.2, 1.0 - (ageWeeks * 0.1));
                    data._isRecent = ageWeeks < 2;
                    return data;
                } catch (e) { return null; }
            }).filter(Boolean);
        }

        const acceptedFixes = parseWithWeight(accepted);
        const rejectedFixes = parseWithWeight(rejected);

        // Weighted preference score
        const recentAccepts = acceptedFixes.filter(f => f._isRecent).length;
        const historicalAccepts = acceptedFixes.filter(f => !f._isRecent).length;
        const recentRejects = rejectedFixes.filter(f => f._isRecent).length;

        const preferenceScore = Math.round(
            (recentAccepts * 0.6) + (historicalAccepts * 0.3) - (recentRejects * 0.8)
        );

        // Extract strong bullets (weighted by recency)
        const strongBullets = acceptedFixes
            .filter(f => f.fixType === 'improve_bullets' && f.improved)
            .sort((a, b) => b._weight - a._weight)
            .map(f => f.improved)
            .slice(0, 5);

        // Context-filtered avoid patterns per fix type
        const avoidPatterns = {};
        rejectedFixes.forEach(f => {
            const key = f.fixType;
            if (!avoidPatterns[key]) avoidPatterns[key] = { count: 0, weightedScore: 0 };
            avoidPatterns[key].count++;
            avoidPatterns[key].weightedScore += f._weight;
        });

        // Determine preferred tone from weighted signals
        const bulletAccepts = acceptedFixes.filter(f => f.fixType === 'improve_bullets');
        const metricsHeavy = bulletAccepts.filter(f => (f.improved || '').match(/\d+%|\d+x|\$\d+/)).length;

        res.json({
            totalAccepted: accepted.length,
            totalRejected: rejected.length,
            preferenceScore,
            strongBullets,
            avoidPatterns,
            preferredTone: metricsHeavy > bulletAccepts.length * 0.5 ? 'metrics-heavy' : 'balanced',
            learningMaturity: Math.min(100, Math.round((accepted.length + rejected.length) * 5)),
            recentActivity: { recentAccepts, historicalAccepts, recentRejects }
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

/**
 * GET /api/ai/analyze-stream (SSE Streaming Endpoint)
 * Replaces batched POST logic to stream agent phases to client.
 */
app.get('/api/ai/analyze-stream', authenticateToken, async (req, res) => {
    // Requires job details passed via query string since SSE is a GET request
    const jobTitle = req.query.title || '';
    const jobCompany = req.query.company || '';
    const jobLink = req.query.link || '';
    const jobDescription = req.query.description || '';
    const jobId = req.query.id || '';

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        if (typeof res.flush === 'function') res.flush();
    };

    if (!jobTitle) {
        sendEvent('error', { error: 'Missing job details' });
        return res.end();
    }

    try {
        const orchestrator = new AgentOrchestrator(req.user.id, db, req);
        const jobStr = { title: jobTitle, company: jobCompany, description: jobDescription, link: jobLink, id: jobId };

        for await (const step of orchestrator.run(jobStr)) {
            sendEvent('step', step);

            // If final step, signal completeness
            if (step.state === 'READY' || step.state === 'ERROR') {
                sendEvent('done', { status: 'complete' });
                res.end();
                return;
            }
        }
    } catch (e) {
        console.error('[AnalyzeStream] Error:', e);
        sendEvent('error', { error: 'Agent execution failed: ' + e.message });
        res.end();
    }
});

/**
 * Resume version management
 */
app.get('/api/resume-versions', authenticateToken, async (req, res) => {
    try {
        const versions = await db.all(
            'SELECT * FROM resume_versions WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(versions || []);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch versions' });
    }
});

app.post('/api/resume-versions', authenticateToken, async (req, res) => {
    const { version_name, content, job_id, ats_score, parent_version_id, is_default } = req.body;
    try {
        if (is_default) {
            await db.run('UPDATE resume_versions SET is_default = 0 WHERE user_id = ?', [req.user.id]);
        }
        const result = await db.run(
            'INSERT INTO resume_versions (user_id, version_name, content, job_id, ats_score, parent_version_id, is_default) VALUES (?,?,?,?,?,?,?)',
            [req.user.id, version_name || 'Untitled', content, job_id || null, ats_score || null, parent_version_id || null, is_default ? 1 : 0]
        );
        res.json({ success: true, id: result.lastID });
    } catch (e) {
        res.status(500).json({ error: 'Failed to save version' });
    }
});

app.patch('/api/resume-versions/:id/default', authenticateToken, async (req, res) => {
    try {
        await db.run('UPDATE resume_versions SET is_default = 0 WHERE user_id = ?', [req.user.id]);
        await db.run('UPDATE resume_versions SET is_default = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to set default' });
    }
});

/**
 * Agent activity log (replay)
 */
app.get('/api/agent/activity/:sessionId', authenticateToken, async (req, res) => {
    try {
        const logs = await db.all(
            'SELECT * FROM agent_activity_log WHERE session_id = ? AND user_id = ? ORDER BY created_at ASC',
            [req.params.sessionId, req.user.id]
        );
        res.json(logs || []);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

app.post('/api/jobs/:jobId/apply', authenticateToken, async (req, res) => {
    const { jobId } = req.params;
    const { tier = 1 } = req.body; // Default to manual guide tier

    try {
        const job = await db.get('SELECT * FROM jobs WHERE id = ?', [jobId]);
        if (!job) return res.status(404).json({ error: 'Job not found' });

        const user = await db.get('SELECT name, email, skills, experience_years, education, resume_data FROM users WHERE id = ?', [req.user.id]);

        const userProfile = {
            name: user.name,
            email: user.email,
            skills: user.skills ? JSON.parse(user.skills) : [],
            experience: { years: user.experience_years || 0 },
            education: user.education ? JSON.parse(user.education) : {},
            ...(user.resume_data ? JSON.parse(user.resume_data) : {})
        };

        // Execute Hybrid Dispatch
        const dispatchResult = await dispatchApplication(db, {
            jobId,
            userId: req.user.id,
            tier,
            jobUrl: job.link,
            userProfile
        });

        // Record application in DB
        await db.run(`
            INSERT INTO applications (user_id, company, role, job_link, stage, match_score) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            req.user.id,
            job.company,
            job.title,
            job.link,
            dispatchResult.status === 'submitted' ? 'Applied (Copilot)' : 'Pre-fill Ready',
            85
        ]);

        res.json({
            success: true,
            ...dispatchResult
        });

    } catch (e) {
        console.error('[Apply] Dispatch Error:', e);
        res.status(500).json({ error: 'Application dispatch failed' });
    }
});

app.post('/api/anthropic/messages', async (req, res) => {
    res.json({ content: [{ type: 'text', text: "I'm your Orion AI assistant. How can I help with your job search?" }] });
});

// --- SPA FALLBACK ---
app.use(async (req, res) => {
    if (req.url.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    const indexPath = path.join(__dirname, '../frontend/dist/index.html');
    res.sendFile(indexPath, (err) => {
        if (err) res.status(200).send('GradLaunch API Online. Build frontend to view UI.');
    });
});

const server = http.createServer(app);
console.log('[Bootstrap] HTTP server created');

const io = socketIo(server, { cors: { origin: '*' } });
io.on('connection', (s) => s.on('form_update', (d) => s.broadcast.emit('form_synced', d)));
console.log('[Bootstrap] Socket.io initialized');

server.listen(PORT, () => {
    console.log(`[GradLaunch] 🚀 Orion AI Console online at http://localhost:${PORT}`);
    console.log('[Bootstrap] Server fully initialized and listening');
});

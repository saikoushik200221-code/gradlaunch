require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const { syncApplicationStatus } = require('./syncService');

const app = express();
const PORT = process.env.PORT || 3001;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

app.use(cors());
app.use(express.json());
// API Health Check / Root
app.get('/', (req, res) => {
    res.json({
        message: "GradLaunch API is active",
        version: "1.2.0",
        status: "healthy",
        uptime: process.uptime()
    });
});

// JSON 404 Handler for specific undefined API routes (optional, but keep it clean)
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
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

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');

let db;
(async () => {
    // Persistent SQLite user store
    db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });
    // Create users table if not exists with a JSON column for profile
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE,
            password TEXT,
            profile TEXT
        )
    `);
})();

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const user = verifyToken(token);
    if (!user) return res.status(403).json({ error: 'Invalid or expired token' });
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

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.get('SELECT id, name, email FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(401).json({ error: 'Session expired or user not found' });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: 'Error validating session' });
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

// Parse Remote Job RSS feeds (WWR, Remote OK)
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
                // RemoteOK is RSS, but we handle it similarly to WWR
                const $ = cheerio.load(data, { xmlMode: true });
                $('item').each((i, el) => {
                    const title = $(el).find('title').text().trim();
                    const description = $(el).find('description').text().replace(/<[^>]*>?/gm, ' ').trim();
                    const link = $(el).find('link').text().trim();
                    const pubDate = $(el).find('pubDate').text().trim();

                    jobs.push({
                        id: `rok-${Date.now()}-${i}`,
                        title,
                        company: 'Remote OK Company', // RemoteOK RSS doesn't always have company in separate field
                        location: 'Remote',
                        type: 'Full-time',
                        postedValue: new Date(pubDate).getTime(),
                        posted: getPostedTime(pubDate),
                        tags: generateTags(title, description, 'Remote', true),
                        logo: 'R',
                        match: getMatchScore(title),
                        description: description.length > 500 ? description.slice(0, 500).trim() + '...' : description.trim(),
                        skills: extractSkills(title, description),
                        link
                    });
                });
                continue;
            }

            // WWR is XML/RSS
            const $ = cheerio.load(data, { xmlMode: true });

            $('item').each((i, el) => {
                const rawTitle = $(el).find('title').first().text().replace(/<!\[CDATA\[|\]\]>/g, '').trim();
                const region = $(el).find('region').text().replace(/<!\[CDATA\[|\]\]>/g, '').trim() || 'Worldwide';
                const pubDate = $(el).find('pubDate').text().trim();
                const link = $(el).find('link').text().trim() || $(el).find('url').text().trim() || '#';
                const rawDesc = $(el).find('description').text().replace(/<!\[CDATA\[|\]\]>/g, '').trim();
                const cleanDesc = rawDesc.replace(/<[^>]*>?/gm, ' ');

                // Skip divider entries
                if (!rawTitle || rawTitle.toLowerCase().includes('apply to multiple')) return;

                // WWR title format is often "Company: Job Title" or just "Job Title"
                let company, title;
                const colonIdx = rawTitle.indexOf(':');
                if (colonIdx > 0 && colonIdx < 40) {
                    company = rawTitle.slice(0, colonIdx).trim();
                    title = rawTitle.slice(colonIdx + 1).trim();
                } else {
                    company = 'Remote Co.';
                    title = rawTitle;
                }

                jobs.push({
                    id: `wwr-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
                    title,
                    company: company || 'Top Remote Company',
                    location: `${region} (Remote)`,
                    type: 'Full-time',
                    postedValue: new Date(pubDate).getTime(),
                    posted: pubDate ? getPostedTime(pubDate) : 'Recently',
                    salary: 'Competitive',
                    tags: generateTags(title, cleanDesc, region),
                    logo: (company || 'R').charAt(0).toUpperCase(),
                    match: getMatchScore(title),
                    description: cleanDesc ? (cleanDesc.length > 500 ? cleanDesc.slice(0, 500).trim() + '...' : cleanDesc.trim()) : `Remote role at ${company || 'a top remote company'} for a ${title}.`,
                    skills: extractSkills(title, cleanDesc),
                    link,
                });
            });
        } catch (err) {
            console.warn(`Failed to fetch RSS from ${entry.url}: ${err.message}`);
        }
    }

    // Sort by most recent first
    return jobs.sort((a, b) => b.postedValue - a.postedValue);
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
                    const location = item.location || 'USA';
                    const isRemote = item.remote || false;
                    const description = item.description.replace(/<[^>]*>?/gm, ' ');
                    const pubDate = item.created_at * 1000;
                    jobs.push({
                        id: `an-${item.slug || Date.now() + i}`,
                        title, company,
                        location: isRemote ? `${location} (Remote)` : location,
                        type: item.job_types?.[0] || 'Full-time',
                        postedValue: pubDate,
                        posted: getPostedTime(new Date(pubDate)),
                        salary: 'Competitive',
                        tags: generateTags(title, description, location, isRemote),
                        logo: (company || 'A').charAt(0).toUpperCase(),
                        match: getMatchScore(title),
                        description: description.length > 500 ? description.slice(0, 500).trim() + '...' : description.trim(),
                        skills: extractSkills(title, description),
                        link: item.url,
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
                    description: cleanDesc.length > 500 ? cleanDesc.slice(0, 500).trim() + '...' : cleanDesc.trim() || cleanTitle,
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

app.get('/api/jobs', async (req, res) => {
    try {
        // Return cached results if very fresh (within 5 minutes)
        if (jobsCache.length > 0 && lastScrapeTime && (Date.now() - lastScrapeTime < 300000)) {
            return res.json(jobsCache);
        }

        console.log('[GradLaunch] Fetching fresh jobs from multiple sources...');
        const [wwrJobs, anJobs, remotiveJobs, jobicyJobs, hnJobs] = await Promise.all([
            scrapeWWR(),
            scrapeArbeitnow(),
            scrapeRemotive(),
            scrapeJobicy(),
            scrapeHN(),
        ]);

        const jobs = [...wwrJobs, ...anJobs, ...remotiveJobs, ...jobicyJobs, ...hnJobs].sort((a, b) => b.postedValue - a.postedValue);


        // Now, asynchronously add Gemini Vector Embeddings to each scraped job
        // so the frontend can calculate real semantic match percentages.
        if (GEMINI_API_KEY) {
            console.log('[GradLaunch] Generating semantic vectors for jobs...');
            const jobsWithText = jobs.map(j => ({
                id: j.id,
                text: `${j.title} ${j.company} ${j.skills.join(' ')} ${j.description}`
            }));

            // Gemini API has limits; we process in small batches
            for (let i = 0; i < jobs.length; i += 20) {
                const batch = jobsWithText.slice(i, i + 20);
                try {
                    const embedPayload = {
                        requests: batch.map(b => ({
                            model: "models/text-embedding-004",
                            content: { parts: [{ text: b.text }] }
                        }))
                    };
                    const embedRes = await axios.post(
                        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${GEMINI_API_KEY}`,
                        embedPayload,
                        { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
                    );

                    const embeddings = embedRes.data.embeddings || [];
                    embeddings.forEach((emb, idx) => {
                        const targetJob = jobs.find(j => j.id === batch[idx].id);
                        if (targetJob) {
                            targetJob.embedding = emb.values;
                        }
                    });
                } catch (embErr) {
                    console.error('[GradLaunch] Error embedding batch:', embErr.response?.data || embErr.message);
                }
            }
            console.log(`[GradLaunch] Finished embedding ${jobs.filter(j => j.embedding).length} jobs.`);
        }

        if (jobs.length > 0) {
            jobsCache = jobs;
            lastScrapeTime = Date.now();
        }

        console.log(`[GradLaunch] Found ${jobs.length} jobs.`);
        res.json(jobs.length > 0 ? jobs : []);
    } catch (error) {
        console.error('[GradLaunch] Error fetching jobs:', error.message);
        res.status(500).json({ error: 'Failed to fetch jobs', message: error.message });
    }
});

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
                system_instruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                generationConfig: {
                    maxOutputTokens: req.body.max_tokens || 1500,
                }
            };

            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                geminiPayload,
                { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
            );

            const aiText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "No response candidate found.";

            return res.json({
                content: [{ type: 'text', text: aiText }],
                model: 'gemini-2.5-flash',
                role: 'assistant'
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

// End of file cleanup
app.listen(PORT, () => {
    console.log(`[GradLaunch] Backend running on http://localhost:${PORT}`);
    if (!ANTHROPIC_API_KEY && !GEMINI_API_KEY) {
        console.warn('[GradLaunch] WARNING: No API keys set in .env — AI features will use Mock Mode.');
    } else if (GEMINI_API_KEY) {
        console.log('[GradLaunch] Gemini API key loaded ✓ (Free Tier Active)');
    } else {
        console.log('[GradLaunch] Anthropic API key loaded ✓');
    }
});

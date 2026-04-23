// backend/routes/resume.js
// Drop-in route for resume upload + per-job tailoring.
// Wire into server.js:  app.use('/api/resume', require('./routes/resume'));
 
const express = require('express');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@libsql/client');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
 
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
 
// --- clients ---
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:database.sqlite",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});
 
// --- one-time schema (run on boot or via migration) ---
async function ensureSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS resumes (
      user_id TEXT PRIMARY KEY,
      raw_text TEXT NOT NULL,
      parsed_json TEXT NOT NULL,
      uploaded_at INTEGER NOT NULL
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tailored_resumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      bullets_json TEXT NOT NULL,
      ats_score INTEGER NOT NULL,
      changes_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(user_id, job_id)
    );
  `);
}
ensureSchema().catch(console.error);
 
// --- helpers ---
async function extractText(file) {
  if (file.mimetype === 'application/pdf') {
    const out = await pdfParse(file.buffer);
    return out.text;
  }
  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const out = await mammoth.extractRawText({ buffer: file.buffer });
    return out.value;
  }
  throw new Error('Unsupported file type. Upload PDF or DOCX.');
}
 
const PARSE_PROMPT = `Extract this resume into structured JSON. Output ONLY valid JSON, no commentary.
Schema: { name, email, phone, education: [{school, degree, gpa, dates}], experience: [{company, role, dates, bullets: []}], skills: [], projects: [{name, bullets: []}] }
If a field is missing, omit it. Do not invent anything.
 
Resume:
`;
 
const TAILOR_PROMPT = (resume, jd) => `You are a resume editor. Rewrite the candidate's experience bullets to match this job description.
 
RULES (strict):
1. Use keywords from the JD naturally — never keyword-stuff.
2. Add quantified metrics ONLY if the original bullet implies them. Never invent numbers, tools, or achievements.
3. Lead with strong action verbs matching the JD's seniority tone.
4. Keep each bullet to one line (~20 words).
5. Preserve factual accuracy above all else.
 
Return ONLY this JSON (no markdown fences):
{
  "bullets": ["..."],
  "ats_score": 0-100,
  "changes_made": ["brief description of each change"],
  "keywords_added": ["keyword1", "keyword2"]
}
 
CANDIDATE RESUME (JSON):
${JSON.stringify(resume, null, 2)}
 
JOB DESCRIPTION:
${jd}
`;
 
// --- routes ---
 
// POST /api/resume/upload
router.post('/upload', upload.single('resume'), async (req, res) => {
  try {
    const userId = req.user?.id || req.body.user_id || 'demo-user';
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
 
    const rawText = await extractText(req.file);
 
    // parse with Claude (Haiku is fine for extraction — fast + cheap)
    const parseResp = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [{ role: 'user', content: PARSE_PROMPT + rawText }],
    });
 
    const parsedText = parseResp.content[0].text.trim().replace(/^```json\s*|\s*```$/g, '');
    const parsed = JSON.parse(parsedText);
 
    await db.execute({
      sql: 'INSERT OR REPLACE INTO resumes (user_id, raw_text, parsed_json, uploaded_at) VALUES (?, ?, ?, ?)',
      args: [userId, rawText, JSON.stringify(parsed), Date.now()],
    });
 
    res.json({ success: true, parsed });
  } catch (err) {
    console.error('Resume upload error:', err);
    res.status(500).json({ error: err.message });
  }
});
 
// POST /api/resume/tailor
// body: { job_id, job_title, company, job_description }
router.post('/tailor', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.user_id || 'demo-user';
    const { job_id, job_description } = req.body;
    if (!job_id || !job_description) {
      return res.status(400).json({ error: 'job_id and job_description required' });
    }
 
    // check cache (7-day freshness)
    const cached = await db.execute({
      sql: 'SELECT * FROM tailored_resumes WHERE user_id = ? AND job_id = ? AND created_at > ?',
      args: [userId, job_id, Date.now() - 7 * 24 * 60 * 60 * 1000],
    });
    if (cached.rows.length > 0) {
      const row = cached.rows[0];
      return res.json({
        cached: true,
        bullets: JSON.parse(row.bullets_json),
        ats_score: row.ats_score,
        changes_made: JSON.parse(row.changes_json),
      });
    }
 
    // load resume
    const resumeRow = await db.execute({
      sql: 'SELECT parsed_json FROM resumes WHERE user_id = ?',
      args: [userId],
    });
    if (resumeRow.rows.length === 0) {
      return res.status(404).json({ error: 'No resume uploaded yet' });
    }
    const resume = JSON.parse(resumeRow.rows[0].parsed_json);
 
    // tailor with Sonnet (better reasoning for rewrites)
    const resp = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [{ role: 'user', content: TAILOR_PROMPT(resume, job_description) }],
    });
 
    const rawOutput = resp.content[0].text.trim().replace(/^```json\s*|\s*```$/g, '');
    const result = JSON.parse(rawOutput);
 
    // cache
    await db.execute({
      sql: 'INSERT OR REPLACE INTO tailored_resumes (user_id, job_id, bullets_json, ats_score, changes_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [userId, job_id, JSON.stringify(result.bullets), result.ats_score, JSON.stringify(result.changes_made), Date.now()],
    });
 
    res.json({ cached: false, ...result });
  } catch (err) {
    console.error('Tailor error:', err);
    res.status(500).json({ error: err.message });
  }
});
 
// GET /api/resume/me
router.get('/me', async (req, res) => {
  const userId = req.user?.id || req.query.user_id || 'demo-user';
  const row = await db.execute({
    sql: 'SELECT parsed_json, uploaded_at FROM resumes WHERE user_id = ?',
    args: [userId],
  });
  if (row.rows.length === 0) return res.json({ hasResume: false });
  res.json({
    hasResume: true,
    parsed: JSON.parse(row.rows[0].parsed_json),
    uploaded_at: row.rows[0].uploaded_at,
  });
});
 
module.exports = router;

/**
 * Monitor CLI Script - GradLaunch Intelligence Suite
 * Provides a daily report of Gemini usage, costs, and experiment performance.
 */
require('dotenv').config();
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
const axios = require('axios');

async function createDb() {
  const TURSO_URL = process.env.TURSO_DATABASE_URL || '';
  const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

  if (TURSO_URL && TURSO_TOKEN) {
    const apiBase = TURSO_URL.replace('libsql://', 'https://');
    const execute = async (sql, args = []) => {
      const res = await axios.post(`${apiBase}/v2/pipeline`, {
        requests: [{ 
            type: 'execute', 
            stmt: { 
                sql, 
                args: args.map(a => a === null ? { type: 'null' } : { type: typeof a === 'number' ? 'integer' : 'text', value: String(a) }) 
            } 
        }, { type: 'close' }]
      }, {
        headers: { 'Authorization': `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
        timeout: 30000
      });
      const result = res.data.results?.[0];
      const cols = result?.response?.result?.cols?.map(c => c.name) || [];
      const rows = (result?.response?.result?.rows || []).map(row => Object.fromEntries(cols.map((col, i) => [col, row[i]?.value ?? null])));
      return rows;
    };
    return {
      all: (sql, p = []) => execute(sql, p),
      get: (sql, p = []) => execute(sql, p).then(r => r[0] || null)
    };
  } else {
    const dbPath = path.join(__dirname, '../database.sqlite');
    const localDb = await open({ filename: dbPath, driver: sqlite3.Database });
    return {
      all: (sql, p = []) => localDb.all(sql, ...p),
      get: (sql, p = []) => localDb.get(sql, ...p)
    };
  }
}

async function runMonitor() {
  console.log('\n📊 GradLaunch Intelligence Monitor');
  console.log('====================================');
  
  try {
    const db = await createDb();
    
    // 1. Overall Usage (Last 24 Hours)
    const usage = await db.get(`
      SELECT 
        COUNT(*) as requests,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost) as total_cost,
        AVG(duration_ms) as avg_latency
      FROM gemini_usage_logs
      WHERE created_at >= DATETIME('now', '-1 day')
    `);

    console.log('\n--- 24H Gemini Usage ---');
    console.log(`Requests:   ${usage.requests || 0}`);
    console.log(`Tokens:     ${(usage.total_tokens || 0).toLocaleString()}`);
    console.log(`Cost:       $${(usage.total_cost || 0).toFixed(4)}`);
    console.log(`Avg Latency: ${Math.round(usage.avg_latency || 0)}ms`);

    // 2. Experiment Results (Summary)
    const experiments = await db.all(`
      SELECT e.id, e.name, e.status, COUNT(DISTINCT ea.user_id) as assignments
      FROM experiments e
      LEFT JOIN experiment_assignments ea ON e.id = ea.experiment_id
      GROUP BY e.id
    `);

    console.log('\n--- Active Experiments ---');
    if (experiments.length === 0) {
      console.log('No experiments found.');
    } else {
      experiments.forEach(exp => {
        console.log(`${exp.name.padEnd(30)} | ${exp.status.padEnd(10)} | Users: ${exp.assignments}`);
      });
    }

    // 3. Match Feedback Performance
    const feedback = await db.get(`
      SELECT 
        AVG(user_rating) as avg_rating,
        COUNT(*) as total_feedback,
        SUM(CASE WHEN user_rating >= 4 THEN 1 ELSE 0 END) as positive_count
      FROM match_feedback
      WHERE created_at >= DATETIME('now', '-7 days')
    `);

    console.log('\n--- Match Quality (7D) ---');
    if (feedback.total_feedback > 0) {
      const positivePercent = ((feedback.positive_count / feedback.total_feedback) * 100).toFixed(1);
      console.log(`Avg Rating:     ${(feedback.avg_rating || 0).toFixed(2)}/5.0`);
      console.log(`Positive Match: ${positivePercent}% (${feedback.total_feedback} reviews)`);
    } else {
      console.log('No feedback data available for the last 7 days.');
    }

    // 4. Cost Recommendations
    if (usage.total_cost > 0.5) {
      console.log('\n💡 Recommendation: High cost detected. Consider switching to gemini-1.5-flash for pre-filling.');
    } else if (usage.avg_latency > 3000) {
      console.log('\n💡 Recommendation: High latency detected. Review experiment prompt complexity.');
    }

    console.log('\n====================================');
    console.log(`Generated at: ${new Date().toLocaleString()}\n`);

  } catch (err) {
    console.error('\n❌ Monitor failed:', err.message);
  }
}

runMonitor();

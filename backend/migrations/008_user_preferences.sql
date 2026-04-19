-- 008: User Preferences & Agent Activity Log
-- Tracks fix acceptance/rejection for personalization and agent replay

CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    preference_type TEXT NOT NULL,  -- 'accepted_fix', 'rejected_fix', 'tone_preference', 'style_preference'
    context TEXT,                    -- JSON: { original, improved, fixType, jobId }
    job_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    job_id TEXT,
    session_id TEXT NOT NULL,        -- Groups actions for a single apply session
    action TEXT NOT NULL,            -- 'analyze_jd', 'extract_keywords', 'score_resume', 'generate_fix', 'apply_fix', 'tailor_resume', 'dispatch'
    details TEXT,                    -- JSON: action-specific data
    duration_ms INTEGER,
    status TEXT DEFAULT 'complete',  -- 'in_progress', 'complete', 'failed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resume_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    version_name TEXT NOT NULL,       -- 'Master', 'Google SWE', 'Stripe Backend'
    content TEXT NOT NULL,
    job_id TEXT,                       -- Which job this was tailored for (null = master)
    ats_score INTEGER,
    parent_version_id INTEGER,        -- Links to the version it was based on
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_user ON agent_activity_log(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_resume_versions_user ON resume_versions(user_id);

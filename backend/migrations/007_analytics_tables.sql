-- ============================================
-- 007_analytics_tables.sql
-- Analytics, Experimentation, and Monitoring Tables
-- ============================================

-- 1. Gemini API Usage Logs
CREATE TABLE IF NOT EXISTS gemini_usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  model TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  response_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost REAL DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT 1,
  error_message TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Match Feedback
CREATE TABLE IF NOT EXISTS match_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  match_score REAL,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  user_comments TEXT,
  actual_application BOOLEAN DEFAULT 0,
  application_id INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- 3. A/B Testing Experiments
CREATE TABLE IF NOT EXISTS experiments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  variants TEXT NOT NULL, -- JSON array of {name, config}
  targeting TEXT, -- JSON object for user targeting rules
  start_date TEXT,
  end_date TEXT,
  metrics TEXT, -- JSON array of metric names
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  winner_variant TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

-- 4. Experiment Assignments
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  experiment_id INTEGER NOT NULL,
  variant TEXT NOT NULL,
  assigned_at TEXT NOT NULL,
  UNIQUE(user_id, experiment_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);

-- 5. Experiment Events
CREATE TABLE IF NOT EXISTS experiment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  experiment_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  metadata TEXT, -- JSON object
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);

-- 6. User Sessions (for engagement tracking)
CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  session_id TEXT UNIQUE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_seconds INTEGER,
  page_views INTEGER DEFAULT 0,
  actions_taken INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Daily Aggregates (for faster reporting)
CREATE TABLE IF NOT EXISTS daily_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT UNIQUE NOT NULL,
  total_users INTEGER,
  active_users INTEGER,
  gemini_requests INTEGER,
  gemini_tokens INTEGER,
  gemini_cost REAL,
  matches_shown INTEGER,
  matches_clicked INTEGER,
  applications_submitted INTEGER,
  feedback_submitted INTEGER,
  avg_match_rating REAL,
  created_at TEXT NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gemini_logs_user ON gemini_usage_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gemini_logs_cost ON gemini_usage_logs(estimated_cost, created_at);
CREATE INDEX IF NOT EXISTS idx_match_feedback_user ON match_feedback(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_user ON experiment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_experiment_events_experiment ON experiment_events(experiment_id, event_type);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date);

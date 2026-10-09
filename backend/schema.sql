PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS learners (
  reader_number INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL,
  code_hash TEXT NOT NULL UNIQUE,
  code_epoch INTEGER NOT NULL DEFAULT 1,
  plan_json TEXT NOT NULL DEFAULT '[]',
  plan_version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS learners_owner ON learners(owner_id, reader_number);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  code_epoch INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  plan_version INTEGER NOT NULL,
  revision INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  total INTEGER NOT NULL,
  first_try INTEGER NOT NULL,
  helped INTEGER NOT NULL,
  review INTEGER NOT NULL,
  complete INTEGER NOT NULL,
  targets_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS runs_learner_date ON runs(learner_id, updated_at);
CREATE TABLE IF NOT EXISTS activity_events (
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  revision INTEGER NOT NULL,
  total INTEGER NOT NULL,
  first_try INTEGER NOT NULL,
  helped INTEGER NOT NULL,
  review INTEGER NOT NULL,
  complete INTEGER NOT NULL,
  targets_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (run_id, revision)
);
CREATE INDEX IF NOT EXISTS activity_events_date ON activity_events(created_at);
CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  observation TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS observations_learner_date ON observations(learner_id, created_at);

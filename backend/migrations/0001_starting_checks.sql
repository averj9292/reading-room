CREATE TABLE IF NOT EXISTS placements (
  learner_id TEXT PRIMARY KEY REFERENCES learners(id) ON DELETE CASCADE,
  generation INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','complete','reviewed','overridden')),
  answers_json TEXT NOT NULL DEFAULT '[]',
  result_json TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  updated_at INTEGER NOT NULL
);

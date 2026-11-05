-- Run once in the Neon SQL Editor (or a PostgreSQL migration). No card or OAuth data.
CREATE TABLE IF NOT EXISTS learning_v44_snapshots (
  key TEXT PRIMARY KEY,
  sport TEXT NOT NULL CHECK (sport IN ('nba','football')),
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  team TEXT NOT NULL,
  position TEXT,
  fixture_day DATE NOT NULL,
  fixture_start TIMESTAMPTZ,
  captured_at TIMESTAMPTZ NOT NULL,
  pp NUMERIC(9,3) NOT NULL,
  q80 NUMERIC(9,3) NOT NULL,
  play_prob NUMERIC(7,5),
  official_score NUMERIC(9,3),
  official_source TEXT CHECK (official_source IS NULL OR official_source='sorare'),
  official_date TIMESTAMPTZ,
  appeared BOOLEAN,
  nba_three_made SMALLINT,
  nba_three_attempts SMALLINT,
  nba_minutes NUMERIC(7,2),
  pregame_three_made NUMERIC(7,3),
  pregame_three_attempts NUMERIC(7,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sport_key_match CHECK (key LIKE sport || ':%'),
  CONSTRAINT q80_gte_pp CHECK (q80 >= pp),
  CONSTRAINT nba_threes_only CHECK (sport='nba' OR (nba_three_made IS NULL AND nba_three_attempts IS NULL)),
  CONSTRAINT three_bounds CHECK (nba_three_made IS NULL OR (nba_three_attempts >= nba_three_made AND nba_three_made >= 0))
);
CREATE INDEX IF NOT EXISTS learning_v44_sport_day ON learning_v44_snapshots(sport,fixture_day DESC);
CREATE INDEX IF NOT EXISTS learning_v44_unresolved ON learning_v44_snapshots(sport,fixture_day DESC) WHERE official_score IS NULL;
CREATE INDEX IF NOT EXISTS learning_v44_three_hist ON learning_v44_snapshots(player_id,official_date DESC) WHERE nba_three_made IS NOT NULL;
CREATE TABLE IF NOT EXISTS learning_v44_models (
  sport TEXT PRIMARY KEY CHECK (sport IN ('nba','football')),
  version INTEGER NOT NULL DEFAULT 1,
  pp_offset NUMERIC(9,3) NOT NULL,
  q80_offset NUMERIC(9,3) NOT NULL,
  sample_count INTEGER NOT NULL,
  holdout_mae NUMERIC(9,3) NOT NULL,
  holdout_q80_loss NUMERIC(9,3) NOT NULL,
  holdout_coverage NUMERIC(9,3) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS learning_v44_jobs (
  scope TEXT PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL,
  ok BOOLEAN NOT NULL,
  message TEXT NOT NULL,
  count INTEGER
);

-- V4.5 incremental migration. Run once in Neon > SQL Editor AFTER learning-v44.sql.
-- Does not alter or delete existing snapshots, models, jobs or Sorare collections.
-- Every row is a provider-confirmed FINAL match + an observed individual player.
-- JSON `stats` contains ONLY fields actually reported by the provider.
-- Missing values are absent (never imputed as zero).
CREATE TABLE IF NOT EXISTS learning_v45_player_performances (
  sport TEXT NOT NULL CHECK (sport IN ('nba','football')),
  competition TEXT NOT NULL,
  game_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  team TEXT NOT NULL,
  opponent TEXT NOT NULL,
  position TEXT,
  fixture_start TIMESTAMPTZ NOT NULL,
  started BOOLEAN,
  minutes NUMERIC(7,2),
  stats JSONB NOT NULL DEFAULT '{}'::JSONB,
  reported_fields JSONB NOT NULL DEFAULT '[]'::JSONB,
  stat_count INTEGER NOT NULL CHECK (stat_count >= 1),
  source TEXT NOT NULL DEFAULT 'espn' CHECK (source = 'espn'),
  status TEXT NOT NULL DEFAULT 'final' CHECK (status = 'final'),
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (sport, competition, game_id, player_id),
  CHECK (jsonb_typeof(stats) = 'object'),
  CHECK (jsonb_typeof(reported_fields) = 'array'),
  CHECK (minutes IS NULL OR (minutes >= 0 AND minutes <= 150)),
  CHECK (sport = 'football' OR competition = 'nba'),
  CHECK (length(player_name) BETWEEN 2 AND 160)
);
CREATE INDEX IF NOT EXISTS learning_v45_sport_fixture
  ON learning_v45_player_performances(sport, fixture_start DESC);
CREATE INDEX IF NOT EXISTS learning_v45_player_history
  ON learning_v45_player_performances(sport, player_id, fixture_start DESC);

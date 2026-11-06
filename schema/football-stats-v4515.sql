-- V4.5.15 ADDITIVE migration. Apply AFTER schema/learning-v45-performance.sql.
-- Does not change forecasts, saved cards, existing snapshots, model weights or old data.
-- NEVER interpret missing stat keys as zero. Provider names are kept distinct.
CREATE TABLE IF NOT EXISTS football_stats_v4515_player_matches (
  source TEXT NOT NULL CHECK(source IN ('espn','understat')),
  source_game_id TEXT NOT NULL,
  source_player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  team TEXT NOT NULL,
  opponent TEXT NOT NULL,
  competition TEXT NOT NULL,
  fixture_start TIMESTAMPTZ NOT NULL,
  season TEXT,
  position TEXT,
  started BOOLEAN,
  minutes NUMERIC(7,2),
  stats JSONB NOT NULL CHECK(jsonb_typeof(stats)='object'),
  reported_fields JSONB NOT NULL CHECK(jsonb_typeof(reported_fields)='array'),
  sorare_slug TEXT,
  identity_evidence TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(source,source_game_id,source_player_id),
  CHECK(minutes IS NULL OR (minutes>=0 AND minutes<=150)),
  CHECK(length(player_name) BETWEEN 2 AND 160),
  CHECK(sorare_slug IS NULL OR sorare_slug ~ '^[a-z0-9-]+$')
);
CREATE INDEX IF NOT EXISTS football_stats_v4515_player_history ON football_stats_v4515_player_matches(source,source_player_id,fixture_start DESC);
CREATE INDEX IF NOT EXISTS football_stats_v4515_sorare_link ON football_stats_v4515_player_matches(sorare_slug,fixture_start DESC) WHERE sorare_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS football_stats_v4515_fixture ON football_stats_v4515_player_matches(fixture_start DESC);
CREATE INDEX IF NOT EXISTS football_stats_v4515_name ON football_stats_v4515_player_matches(lower(player_name));
-- Sorare's FINAL score, all-around/decisive and full available scoring event breakdown.
CREATE TABLE IF NOT EXISTS football_stats_v4515_sorare_scores (
  sorare_score_id TEXT PRIMARY KEY,
  sorare_slug TEXT NOT NULL CHECK(sorare_slug ~ '^[a-z0-9-]+$'),
  player_name TEXT NOT NULL,
  sorare_game_id TEXT NOT NULL,
  fixture_start TIMESTAMPTZ NOT NULL,
  competition TEXT NOT NULL,
  home TEXT NOT NULL,
  away TEXT NOT NULL,
  team TEXT,
  player_score NUMERIC(7,3) NOT NULL CHECK(player_score BETWEEN 0 AND 100),
  decisive_score NUMERIC(7,3),
  all_around_score NUMERIC(7,3),
  scoring_version INTEGER,
  official_stats JSONB NOT NULL DEFAULT '{}'::JSONB CHECK(jsonb_typeof(official_stats)='object'),
  breakdown JSONB NOT NULL DEFAULT '[]'::JSONB CHECK(jsonb_typeof(breakdown)='array'),
  score_status TEXT NOT NULL DEFAULT 'FINAL' CHECK(score_status='FINAL'),
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS football_stats_v4515_score_profile ON football_stats_v4515_sorare_scores(sorare_slug,fixture_start DESC);
CREATE INDEX IF NOT EXISTS football_stats_v4515_score_game ON football_stats_v4515_sorare_scores(sorare_game_id);
-- Only provider-verified links. Name-only guesses must NEVER be persisted as identity matches.
CREATE TABLE IF NOT EXISTS football_stats_v4515_identity_links (
  provider TEXT NOT NULL CHECK(provider IN ('espn','understat','reep')),
  provider_player_id TEXT NOT NULL,
  sorare_slug TEXT NOT NULL CHECK(sorare_slug ~ '^[a-z0-9-]+$'),
  evidence TEXT NOT NULL,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(provider,provider_player_id)
);
CREATE TABLE IF NOT EXISTS football_stats_v4515_import_cursor (
  scope TEXT PRIMARY KEY,
  next_offset INTEGER NOT NULL DEFAULT 0,
  last_run TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_status TEXT NOT NULL DEFAULT 'created'
);
-- Migrate already archived ESPN FINAL statistics, without rewriting their contents.
INSERT INTO football_stats_v4515_player_matches
  (source,source_game_id,source_player_id,player_name,team,opponent,competition,fixture_start,
   position,started,minutes,stats,reported_fields)
SELECT 'espn',game_id,player_id,player_name,team,opponent,competition,fixture_start,
       position,started,minutes,stats,reported_fields
FROM learning_v45_player_performances WHERE sport='football' AND status='final'
ON CONFLICT(source,source_game_id,source_player_id) DO NOTHING;

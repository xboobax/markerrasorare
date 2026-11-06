-- V4.5.16 additive migration. Apply AFTER schema/football-stats-v4515.sql.
-- Keeps original ESPN, Understat and Sorare scores. No forecast/learning modifications.
ALTER TABLE football_stats_v4515_player_matches
  DROP CONSTRAINT IF EXISTS football_stats_v4515_player_matches_source_check;
ALTER TABLE football_stats_v4515_player_matches
  ADD CONSTRAINT football_stats_v4515_player_matches_source_check
  CHECK(source IN ('espn','understat','fbref','sofascore','whoscored',
      'soccerdata_espn','matchhistory','clubelo','sofifa'));
ALTER TABLE football_stats_v4515_identity_links
  DROP CONSTRAINT IF EXISTS football_stats_v4515_identity_links_provider_check;
ALTER TABLE football_stats_v4515_identity_links
  ADD CONSTRAINT football_stats_v4515_identity_links_provider_check
  CHECK(provider IN ('espn','understat','fbref','sofascore','whoscored',
      'soccerdata_espn','matchhistory','clubelo','sofifa','reep'));
-- Flexible source-specific records: shot events, match events, lineups, season player stats,
-- team stats, Elo, SoFIFA ratings. NOT automatically treated as Sorare scoring.
CREATE TABLE IF NOT EXISTS football_stats_v4516_source_records (
  source TEXT NOT NULL CHECK(source IN ('understat','fbref','sofascore','whoscored',
      'soccerdata_espn','matchhistory','clubelo','sofifa')),
  kind TEXT NOT NULL CHECK(kind IN ('player_match','player_season','team_match','team_season',
      'shot_event','match_event','lineup','schedule','team_rating','player_rating')),
  external_id TEXT NOT NULL,
  player_id TEXT,player_name TEXT,team TEXT,opponent TEXT,competition TEXT,
  season TEXT,match_id TEXT,fixture_start TIMESTAMPTZ,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(stats)='object'),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(meta)='object'),
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(source,kind,external_id)
);
CREATE INDEX IF NOT EXISTS football_stats_v4516_record_player ON
  football_stats_v4516_source_records(lower(player_name),team,season)
  WHERE player_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS football_stats_v4516_record_match ON
  football_stats_v4516_source_records(source,match_id,fixture_start DESC);
CREATE INDEX IF NOT EXISTS football_stats_v4516_record_kind ON
  football_stats_v4516_source_records(source,kind,ingested_at DESC);

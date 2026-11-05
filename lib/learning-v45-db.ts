/** Server-only, additive V4.5 individual player-performance archive. */
import {neon} from '@neondatabase/serverless';
import {v452SportSql} from './learning-sport-sql';
import type {Sport} from './model';
import type {V45Performance,V45PerformanceSummary} from './learning-v45-performance';
import {v45Validated} from './learning-v45-performance';
import {v44DbConfigured} from './learning-v44-db';
const sql=()=>{if(!v44DbConfigured())throw new Error('DATABASE_URL ist nicht eingerichtet.');return neon(process.env.DATABASE_URL!);};
const query=async(text:string,params:unknown[]=[])=>sql().query(text,params as any[]);
const readQuery=async(text:string)=>sql().query(text,[],{fetchOptions:{cache:'no-store'}});

/** Single bounded bulk UPSERT. No one-query-per-player load or per-card data. */
export async function v45SavePerformances(sport:Sport,raw:V45Performance[]):Promise<number>{
  const rows=v45Validated(raw,sport).slice(0,500);
  if(!rows.length)return 0;
  const input=rows.map(r=>({sport:r.sport,competition:r.competition,game_id:r.gameId,player_id:r.playerId,
    player_name:r.playerName,team:r.team,opponent:r.opponent,position:r.position,fixture_start:r.fixtureStart,
    started:r.started,minutes:r.minutes,stats:r.stats,reported_fields:r.reportedFields,stat_count:r.statCount}));
  const result=await query(`WITH incoming AS (
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS row(
      sport text,competition text,game_id text,player_id text,player_name text,team text,opponent text,
      position text,fixture_start timestamptz,started boolean,minutes numeric,stats jsonb,reported_fields jsonb,stat_count integer)
  ) INSERT INTO learning_v45_player_performances AS history
    (sport,competition,game_id,player_id,player_name,team,opponent,position,fixture_start,started,minutes,stats,reported_fields,stat_count)
    SELECT sport,competition,game_id,player_id,player_name,team,opponent,position,fixture_start,started,minutes,stats,reported_fields,stat_count
    FROM incoming WHERE TRUE ON CONFLICT(sport,competition,game_id,player_id) DO UPDATE SET
      player_name=EXCLUDED.player_name,team=EXCLUDED.team,opponent=EXCLUDED.opponent,
      position=COALESCE(EXCLUDED.position,history.position),
      started=COALESCE(EXCLUDED.started,history.started),
      minutes=COALESCE(EXCLUDED.minutes,history.minutes),
      stats=history.stats || EXCLUDED.stats,
      reported_fields=(SELECT jsonb_agg(DISTINCT value) FROM jsonb_array_elements(history.reported_fields||EXCLUDED.reported_fields) AS element(value)),
      stat_count=(SELECT count(DISTINCT value) FROM jsonb_array_elements(history.reported_fields||EXCLUDED.reported_fields) AS element(value)),
      ingested_at=NOW()
    RETURNING sport`,[JSON.stringify(input)]);
  return result.length;
}
export type V45RecentPerformance={player:string;team:string;competition:string;fixtureStart:string;minutes:number|null;
  started:boolean|null;stats:Record<string,number>;reportedFields:string[]};
export async function v45PerformanceReport(sport:Sport):Promise<{summary:V45PerformanceSummary;recent:V45RecentPerformance[]}>{
  const [totals,recents]=await Promise.all([
    readQuery(`SELECT count(*) AS total,count(DISTINCT competition||':'||game_id) AS games,
      count(DISTINCT player_id) AS players,max(fixture_start) AS last_game,
      count(*) FILTER (WHERE minutes IS NOT NULL) AS with_minutes,
      count(*) FILTER (WHERE started IS NOT NULL) AS with_lineup,
      count(*) FILTER (WHERE stats ? 'accuratePasses') AS passing_samples,
      count(*) FILTER (WHERE stats ? 'duelsWon' OR stats ? 'duelsLost') AS duel_samples,
      count(*) FILTER (WHERE stats ? 'threes' AND stats ? 'threeAttempts') AS three_samples,
      avg((stats->>'threes')::numeric) FILTER (WHERE stats ? 'threes') AS avg_three_made
      FROM learning_v45_player_performances WHERE sport=${v452SportSql(sport)}`),
    readQuery(`SELECT player_name,team,competition,fixture_start,minutes,started,stats,reported_fields
      FROM learning_v45_player_performances WHERE sport=${v452SportSql(sport)} ORDER BY fixture_start DESC,player_name LIMIT 12`)
  ]);
  const r:any=totals[0];
  const summary:V45PerformanceSummary={sport,total:Number(r.total),games:Number(r.games),players:Number(r.players),
    lastGame:r.last_game?new Date(r.last_game).toISOString():null,withMinutes:Number(r.with_minutes),
    withLineup:Number(r.with_lineup),passingSamples:Number(r.passing_samples),duelSamples:Number(r.duel_samples),
    threeSamples:Number(r.three_samples),avgThreeMade:r.avg_three_made===null?null:Number(r.avg_three_made)};
  const recent:V45RecentPerformance[]=recents.map((entry:any)=>({player:String(entry.player_name),team:String(entry.team),
    competition:String(entry.competition),fixtureStart:new Date(entry.fixture_start).toISOString(),
    minutes:entry.minutes===null?null:Number(entry.minutes),started:entry.started===null?null:Boolean(entry.started),
    stats:entry.stats as Record<string,number>,reportedFields:entry.reported_fields as string[]}));
  return {summary,recent};
}

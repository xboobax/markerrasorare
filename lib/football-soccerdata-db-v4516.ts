/** SoccerData V4.5.16 independent archive; not a prediction input. */
import {neon} from '@neondatabase/serverless';
import type {SoccerDataRecord} from './football-soccerdata-v4516';
import {sorareNameKey} from './football-live-sorare';
const db=()=>{if(!process.env.DATABASE_URL)throw Error('DATABASE_URL fehlt');return neon(process.env.DATABASE_URL);};
const query=(sql:string,params:unknown[]=[])=>db().query(sql,params as any[],{fetchOptions:{cache:'no-store'}});
export async function saveSoccerdataRecords(rows:SoccerDataRecord[]):Promise<number>{
  if(!rows.length)return 0;
  const input=rows.map(r=>({source:r.source,kind:r.kind,external_id:r.externalId,player_id:r.playerId,
    player_name:r.playerName,team:r.team,opponent:r.opponent,competition:r.competition,
    season:r.season,match_id:r.matchId,fixture_start:r.fixtureStart,stats:r.stats,meta:r.meta}));
  const result=await query(`WITH incoming AS (SELECT * FROM jsonb_to_recordset($1::jsonb) AS v(
    source text,kind text,external_id text,player_id text,player_name text,team text,opponent text,
    competition text,season text,match_id text,fixture_start timestamptz,stats jsonb,meta jsonb))
    INSERT INTO football_stats_v4516_source_records AS old
      (source,kind,external_id,player_id,player_name,team,opponent,competition,season,match_id,
       fixture_start,stats,meta)
    SELECT source,kind,external_id,player_id,player_name,team,opponent,competition,season,
      match_id,fixture_start,stats,meta FROM incoming WHERE TRUE
    ON CONFLICT(source,kind,external_id) DO UPDATE SET
      player_id=COALESCE(EXCLUDED.player_id,old.player_id),
      player_name=COALESCE(EXCLUDED.player_name,old.player_name),
      team=COALESCE(EXCLUDED.team,old.team),
      opponent=COALESCE(EXCLUDED.opponent,old.opponent),
      competition=COALESCE(EXCLUDED.competition,old.competition),
      season=COALESCE(EXCLUDED.season,old.season),
      match_id=COALESCE(EXCLUDED.match_id,old.match_id),
      fixture_start=COALESCE(EXCLUDED.fixture_start,old.fixture_start),
      stats=old.stats||EXCLUDED.stats,meta=old.meta||EXCLUDED.meta,ingested_at=NOW()
    RETURNING source`,[JSON.stringify(input)]);
  return result.length;
}
export type SoccerDataProfileExtra=Pick<SoccerDataRecord,'source'|'kind'|'externalId'|'playerId'|
'playerName'|'team'|'opponent'|'competition'|'season'|'matchId'|'fixtureStart'|'stats'|'meta'>;
export async function readSoccerdataProfileExtras(name:string,team:string):Promise<SoccerDataProfileExtra[]>{
  if(name.length<2||name.length>160||team.length<2||team.length>160)return [];
  const data=await query(`SELECT source,kind,external_id,player_id,player_name,team,opponent,
    competition,season,match_id,fixture_start,stats,meta FROM football_stats_v4516_source_records
    WHERE lower(player_name)=lower($1)
    ORDER BY fixture_start DESC NULLS LAST,ingested_at DESC LIMIT 360`,[name]);
  const candidates=data.filter((r:any)=>r.team&&sorareNameKey(String(r.team))===sorareNameKey(team));
  const idsBySource=new Map<string,Set<string>>();
  for(const r of candidates){if(!r.player_id)continue;const source=String(r.source);
    const ids=idsBySource.get(source)??new Set<string>();ids.add(String(r.player_id));idsBySource.set(source,ids);}
  return candidates.filter((r:any)=>!r.player_id||idsBySource.get(String(r.source))?.size===1).slice(0,120).map((r:any)=>({source:r.source,kind:r.kind,externalId:r.external_id,
    playerId:r.player_id,playerName:r.player_name,team:r.team,opponent:r.opponent,
    competition:r.competition,season:r.season,matchId:r.match_id,
    fixtureStart:r.fixture_start?new Date(r.fixture_start).toISOString():null,
    stats:r.stats??{},meta:r.meta??{}}));
}
export async function soccerdataStatsDiagnostics(){
  const r=await query(`SELECT source,kind,count(*)::integer AS rows,
    count(*) FILTER(WHERE stats ? 'xg')::integer AS with_xg,
    count(*) FILTER(WHERE stats ? 'xa')::integer AS with_xa,
    max(ingested_at) AS last_import FROM football_stats_v4516_source_records
    GROUP BY source,kind ORDER BY source,kind`);
  return r.map((x:any)=>({...x,last_import:x.last_import?new Date(x.last_import).toISOString():null}));
}

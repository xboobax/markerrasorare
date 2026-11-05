/** Neon PostgreSQL persistence, server-only. No OAuth cookies or personal cards. */
import {neon} from '@neondatabase/serverless';
import {v452SportSql,v452JobLikeSql} from './learning-sport-sql';
import type {Sport} from './model';
import type {V44Row,V44Calibration,V44Candidate} from './learning-v44-calibration';
import type {TrackedPrediction} from './tracking';
import type {AutomaticResult} from './tracking-auto';
export const v44DbConfigured=()=>Boolean(process.env.DATABASE_URL && /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL));
const db=()=>{if(!v44DbConfigured())throw new Error('DATABASE_URL für Neon PostgreSQL ist nicht eingerichtet.');return neon(process.env.DATABASE_URL!);};
const sqlQuery=async (statement:string,params:unknown[]=[])=>await db().query(statement,params as any[]);
/** Read summaries are never allowed to use an outdated HTTP fetch cache. */
const readQuery=async(statement:string)=>await db().query(statement,[],{fetchOptions:{cache:'no-store'}});
const dateDay=(v:unknown)=>v instanceof Date?v.toISOString().slice(0,10):String(v).slice(0,10);
export type V44Job={scope:string;at:string;ok:boolean;message:string;count?:number};
export async function v44SaveJob(job:V44Job){await sqlQuery(`INSERT INTO learning_v44_jobs(scope,at,ok,message,count) VALUES($1,$2,$3,$4,$5)
 ON CONFLICT(scope) DO UPDATE SET at=EXCLUDED.at,ok=EXCLUDED.ok,message=EXCLUDED.message,count=EXCLUDED.count`,
 [job.scope,job.at,job.ok,job.message,job.count??null]);}
export async function v44ReadJobs(sport:Sport){const rows=await readQuery(`SELECT scope,at,ok,message,count FROM learning_v44_jobs WHERE scope LIKE ${v452JobLikeSql(sport)} ORDER BY at DESC LIMIT 20`);
  return rows.map((x:any)=>({scope:String(x.scope),at:new Date(x.at).toISOString(),ok:Boolean(x.ok),message:String(x.message),count:x.count===null?undefined:Number(x.count)})) as V44Job[];}
/** Freeze immutable PP/Q80 once per unique player+fixture key. No retrospective rewrite. */
export async function v44SaveSnapshots(sport:Sport,snapshots:TrackedPrediction[]):Promise<number>{
  let saved=0;
  for(const row of snapshots){
    if(row.sport!==sport||!row.engineV3PP||row.engineV3Q80===undefined||row.engineV3Q80<row.engineV3PP||!row.fixture)continue;
    const day=row.fixture.slice(0,10),when=row.fixtureTipoff??null;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day))continue;
    const pregame=when?Date.parse(row.savedAt)<Date.parse(when)-30*60000:row.savedAt.slice(0,10)<day;
    if(!pregame)continue;
    const values=await sqlQuery(`INSERT INTO learning_v44_snapshots
    (key,sport,player_id,player_name,team,position,fixture_day,fixture_start,captured_at,pp,q80,play_prob)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(key) DO NOTHING RETURNING key`,
    [row.key,sport,row.playerId,row.playerName,row.team,row.position??null,day,when,row.savedAt,row.engineV3PP,row.engineV3Q80,row.playProbability]);
    if(values.length)saved++;
  }
  return saved;
}
export async function v44Rows(sport:Sport,limit=3000):Promise<V44Row[]>{
  const max=Math.max(1,Math.min(10000,Math.floor(limit)));
  const rows=await readQuery(`SELECT key,sport,player_id,fixture_day,captured_at,fixture_start,pp,q80,official_score,
    official_source,appeared,nba_three_made,nba_three_attempts,pregame_three_made,pregame_three_attempts
    FROM learning_v44_snapshots WHERE sport=${v452SportSql(sport)} ORDER BY fixture_day DESC,captured_at DESC LIMIT ${max}`);
  return rows.map((r:any)=>({key:String(r.key),sport:r.sport as Sport,playerId:String(r.player_id),
    fixtureDay:dateDay(r.fixture_day),capturedAt:new Date(r.captured_at).toISOString(),
    fixtureStart:r.fixture_start?new Date(r.fixture_start).toISOString():null,
    pp:Number(r.pp),q80:Number(r.q80),actual:r.official_score===null?null:Number(r.official_score),
    actualSource:r.official_source==='sorare'?'sorare':null,appeared:r.appeared===null?null:Boolean(r.appeared),
    nba3pm:r.nba_three_made===null?null:Number(r.nba_three_made),nba3pa:r.nba_three_attempts===null?null:Number(r.nba_three_attempts),
    pregame3pm:r.pregame_three_made===null?null:Number(r.pregame_three_made),pregame3pa:r.pregame_three_attempts===null?null:Number(r.pregame_three_attempts)
  }));
}
export type V44Pending={key:string;sport:Sport;playerId:string;playerName:string;team:string;
  fixture:string;fixtureTipoff?:string;savedAt:string};
export async function v44Pending(sport:Sport,limit=1000):Promise<V44Pending[]>{
  const rows=await readQuery(`SELECT key,sport,player_id,player_name,team,fixture_day,fixture_start,captured_at
    FROM learning_v44_snapshots WHERE sport=${v452SportSql(sport)} AND official_score IS NULL AND fixture_day<CURRENT_DATE
    AND fixture_day>CURRENT_DATE-INTERVAL '90 days' ORDER BY fixture_day ASC,key ASC LIMIT ${Math.max(1,Math.min(1000,Math.floor(limit)))}`);
  return rows.map((r:any)=>({key:String(r.key),sport,playerId:String(r.player_id),playerName:String(r.player_name),team:String(r.team),
    fixture:`${dateDay(r.fixture_day)} fixture`,fixtureTipoff:r.fixture_start?new Date(r.fixture_start).toISOString():undefined,
    savedAt:new Date(r.captured_at).toISOString()}));
}
export async function v44SaveOfficial(sport:Sport,results:AutomaticResult[]):Promise<number>{
  let saved=0;
  for(const r of results){if(!r.key.startsWith(`${sport}:`)||!Number.isFinite(r.score)||r.score<0||r.score>500||!Number.isFinite(Date.parse(r.gameDate)))continue;
    const res=await sqlQuery(`UPDATE learning_v44_snapshots SET official_score=$3,official_source='sorare',official_date=$4,
      appeared=CASE WHEN $3>0 THEN TRUE ELSE appeared END
      WHERE sport=$1 AND key=$2 AND official_score IS NULL RETURNING key`,[sport,r.key,r.score,r.gameDate]);
    if(res.length)saved++;
  }return saved;
}
export type V44NbaPlayerStat={playerId:string;playerName:string;team:string;tipoff:string;threeMade:number;threeAttempts:number;minutes:number};
/** Require official Sorare FINAL for the same fixture before accepting ESPN 3PM/3PA. */
export async function v44SaveNbaThree(stats:V44NbaPlayerStat[]):Promise<number>{
  let count=0;
  for(const s of stats){if(!Number.isInteger(s.threeMade)||!Number.isInteger(s.threeAttempts)||s.threeMade<0||s.threeAttempts<s.threeMade||s.threeAttempts>60||!Number.isFinite(s.minutes)||s.minutes<=0)continue;
    // Full exact player name and verified kickoff, no fuzzy name match.
    const res=await sqlQuery(`UPDATE learning_v44_snapshots SET nba_three_made=$4,nba_three_attempts=$5,nba_minutes=$6,appeared=TRUE
      WHERE sport='nba' AND lower(player_name)=lower($1) AND lower(team)=lower($2)
      AND official_source='sorare' AND official_score IS NOT NULL AND fixture_start IS NOT NULL
      AND abs(extract(epoch from (fixture_start-$3::timestamptz)))<10800
      AND nba_three_made IS NULL RETURNING key`,[s.playerName,s.team,s.tipoff,s.threeMade,s.threeAttempts,s.minutes]);
    count+=res.length;
  }return count;
}
/** Historical 3PM/3PA trends are pre-game features only; never use future game data. */
export async function v44PopulatePregameThrees(sport:Sport,keys:string[]):Promise<number>{
  if(sport!=='nba'||!keys.length)return 0;let done=0;
  for(const key of keys.slice(0,120)){
    const updated=await sqlQuery(`WITH history AS (
      SELECT p.nba_three_made AS made,p.nba_three_attempts AS attempts FROM learning_v44_snapshots p
      JOIN learning_v44_snapshots current ON current.key=$1
      WHERE p.sport='nba' AND current.sport='nba' AND p.player_id=current.player_id
        AND p.official_source='sorare' AND p.official_date<current.captured_at
        AND p.nba_three_made IS NOT NULL AND p.nba_three_attempts IS NOT NULL
      ORDER BY p.official_date DESC LIMIT 5)
    UPDATE learning_v44_snapshots current SET pregame_three_made=(SELECT AVG(made) FROM history),
      pregame_three_attempts=(SELECT AVG(attempts) FROM history)
    WHERE current.key=$1 AND current.sport='nba' AND current.pregame_three_made IS NULL
      AND (SELECT COUNT(*) FROM history)>=3 RETURNING key`,[key]);
    done+=updated.length;
  }return done;
}
export async function v44ReadModel(sport:Sport):Promise<V44Calibration|null>{
  const rows=await readQuery(`SELECT sport,version,pp_offset,q80_offset,sample_count,holdout_mae,holdout_q80_loss,holdout_coverage,updated_at FROM learning_v44_models WHERE sport=${v452SportSql(sport)}`);
  const r:any=rows[0];return r?{sport,version:Number(r.version),ppOffset:Number(r.pp_offset),q80Offset:Number(r.q80_offset),
    sampleCount:Number(r.sample_count),holdoutMae:Number(r.holdout_mae),holdoutQ80Loss:Number(r.holdout_q80_loss),
    holdoutCoverage:Number(r.holdout_coverage),updatedAt:new Date(r.updated_at).toISOString()}:null;
}
/** Atomic compare-and-swap. Two sports never touch each other's row. */
export async function v44PromoteCandidate(sport:Sport,candidate:V44Candidate,expectedVersion:number):Promise<boolean>{
  if(!candidate.promotable||candidate.sport!==sport)return false;
  const rows=await sqlQuery(`INSERT INTO learning_v44_models
    (sport,version,pp_offset,q80_offset,sample_count,holdout_mae,holdout_q80_loss,holdout_coverage)
    VALUES($1,1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT(sport) DO UPDATE SET
       version=learning_v44_models.version+1,pp_offset=EXCLUDED.pp_offset,q80_offset=EXCLUDED.q80_offset,
       sample_count=EXCLUDED.sample_count,holdout_mae=EXCLUDED.holdout_mae,
       holdout_q80_loss=EXCLUDED.holdout_q80_loss,holdout_coverage=EXCLUDED.holdout_coverage,updated_at=NOW()
    WHERE learning_v44_models.version=$8 RETURNING version`,
    [sport,candidate.ppOffset,candidate.q80Offset,candidate.train,candidate.candidateMae,candidate.candidateQloss,candidate.candidateCoverage,expectedVersion]);
  return rows.length>0;
}

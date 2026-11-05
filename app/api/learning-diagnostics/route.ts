/** Read-only troubleshooting of a possible DB/branch mismatch. No credentials or player data. */
import {createHash} from 'node:crypto';
import {neon} from '@neondatabase/serverless';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const maxDuration=15;

const headers={'Cache-Control':'private, no-store, max-age=0'};

export async function GET(){
  const raw=process.env.DATABASE_URL;
  if(!raw || !/^postgres(ql)?:\/\//.test(raw)){
    return Response.json({configured:false,error:'DATABASE_URL ist nicht eingerichtet.'},{status:503,headers});
  }
  try{
    const url=new URL(raw);
    // Only a short digest of hostname + database + user; never include password or URL.
    const endpointFingerprint=createHash('sha256')
      .update(`${url.hostname}|${url.pathname}|${url.username}`).digest('hex').slice(0,16);
    const sql=neon(raw);
    const rows=await sql.query(`SELECT current_database() AS database_name,
      current_schema() AS schema_name,
      (SELECT count(*)::integer FROM learning_v44_snapshots) AS snapshots_total,
      (SELECT count(*)::integer FROM learning_v44_snapshots WHERE sport='nba') AS snapshots_nba,
      (SELECT count(*)::integer FROM learning_v44_snapshots WHERE sport='football') AS snapshots_football,
      (SELECT count(*)::integer FROM learning_v45_player_performances) AS performances_total,
      (SELECT count(*)::integer FROM learning_v45_player_performances WHERE sport='nba') AS performances_nba,
      (SELECT count(*)::integer FROM learning_v45_player_performances WHERE sport='football') AS performances_football,
      (SELECT count(*)::integer FROM learning_v44_jobs) AS jobs_total,
      (SELECT max(at) FROM learning_v44_jobs) AS latest_job_at`);
    const r:any=rows[0];
    // Compare both SQL read paths in one request, without exposing credentials or player records.
    // An exception here must NOT prevent returning the baseline database counts.
    let parameterReadCheck:{nbaSnapshots:number|null;nbaPerformances:number|null;consistent:boolean|null;error?:string}={
      nbaSnapshots:null,nbaPerformances:null,consistent:null};
    try{
      const [withParameter,perfParameter]=await Promise.all([
        sql.query('SELECT count(*)::integer AS n FROM learning_v44_snapshots WHERE sport=$1',['nba'],{fetchOptions:{cache:'no-store'}}),
        sql.query('SELECT count(*)::integer AS n FROM learning_v45_player_performances WHERE sport=$1',['nba'],{fetchOptions:{cache:'no-store'}})
      ]);
      const snapshots=Number(withParameter[0]?.n);
      const performances=Number(perfParameter[0]?.n);
      parameterReadCheck={nbaSnapshots:snapshots,nbaPerformances:performances,
        consistent:snapshots===Number(r.snapshots_nba)&&performances===Number(r.performances_nba)};
    }catch{parameterReadCheck={nbaSnapshots:null,nbaPerformances:null,consistent:null,error:'Parameter-Lesetest fehlgeschlagen'};}
    return Response.json({
      configured:true,
      generatedAt:new Date().toISOString(),
      deployment:{environment:process.env.VERCEL_ENV??'unknown',commit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,9)??'unknown'},
      connection:{endpointFingerprint,databaseInUrl:decodeURIComponent(url.pathname.slice(1)),
        databaseOnServer:String(r.database_name),schema:String(r.schema_name)},
      counts:{snapshotsTotal:Number(r.snapshots_total),nbaSnapshots:Number(r.snapshots_nba),
        footballSnapshots:Number(r.snapshots_football),performancesTotal:Number(r.performances_total),
        nbaPerformances:Number(r.performances_nba),footballPerformances:Number(r.performances_football),
        loggedJobs:Number(r.jobs_total)},
      latestJobAt:r.latest_job_at?new Date(r.latest_job_at).toISOString():null,
      parameterReadCheck,
      note:'Nur aggregierte Bestände. Keine Passwörter, Prognosewerte oder Spielerdaten.'
    },{headers});
  }catch(e){
    // Errors are intentionally generic to avoid leaking any sensitive connection details.
    return Response.json({configured:true,error:'Diagnoseabfrage fehlgeschlagen. Schema oder Neon-Verbindung prüfen.'},{status:503,headers});
  }
}

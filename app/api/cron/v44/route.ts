import {cronAuthorized} from '@/lib/learning-cron-auth';
import {v44DbConfigured} from '@/lib/learning-v44-db';
import {V44_SCOPES,v44Capture,v44Reconcile,v44Train,v44NbaThrees} from '@/lib/learning-v44-pipeline';
import type {Sport} from '@/lib/model';
import {v45NbaStats,v45FootballStats,validFootballStatBatch} from '@/lib/learning-v45-pipeline';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
/** Authenticated scheduler. A single Hobby-friendly daily cron rotates one bounded job.
 * For comprehensive per-match coverage invoke distinct jobs by an external scheduler.
 */
export async function GET(req:Request){
  if(!cronAuthorized(req.headers.get('authorization'),process.env.CRON_SECRET))return Response.json({error:'Unauthorized'},{status:401});
  if(!v44DbConfigured())return Response.json({error:'DATABASE_URL fehlt (Neon Postgres)'},{status:503});
  const url=new URL(req.url),job=url.searchParams.get('job')??'cycle';
  try{
    if(job==='capture'){const scope=url.searchParams.get('scope')??'';if(!V44_SCOPES.includes(scope))return Response.json({error:'Ungültiger Scope'},{status:400});return Response.json(await v44Capture(scope));}
    if(job==='results'){const sport=url.searchParams.get('sport'),shard=Number(url.searchParams.get('shard'));
      if((sport!=='nba'&&sport!=='football')||![0,1,2].includes(shard))return Response.json({error:'Ungültige Sportart oder Shard'},{status:400});
      return Response.json(await v44Reconcile(sport,shard));}
    if(job==='train'){const sport=url.searchParams.get('sport');if(sport!=='nba'&&sport!=='football')return Response.json({error:'Ungültige Sportart'},{status:400});
      return Response.json(await v44Train(sport));}
    if(job==='playerstats'){const sport=url.searchParams.get('sport');
      if(sport==='nba'){const shard=Number(url.searchParams.get('shard'));if(!Number.isInteger(shard)||shard<0||shard>4)return Response.json({error:'Ungültiger NBA-Stats-Shard'},{status:400});return Response.json(await v45NbaStats(shard));}
      if(sport==='football'){const batch=url.searchParams.get('batch')??'';if(!validFootballStatBatch(batch))return Response.json({error:'Ungültiger Fußball-Stats-Bereich'},{status:400});return Response.json(await v45FootballStats(batch));}
      return Response.json({error:'Ungültige Statistik-Sportart'},{status:400});}
    if(job==='threes'){const date=url.searchParams.get('date')??new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(new Date());
      return Response.json(await v44NbaThrees(date));}
    if(job!=='cycle')return Response.json({error:'Ungültiger Job'},{status:400});
    const day=Math.floor(Date.now()/86400000),sport:Sport=day%2===0?'nba':'football';
    const scopes=V44_SCOPES.filter(s=>s.startsWith(sport==='nba'?'nba-':'football-'));
    const phase=Math.floor(day/2)%3;
    if(phase===0)return Response.json({cycle:true,result:await v44Capture(scopes[Math.floor(day/6)%scopes.length])});
    if(phase===1)return Response.json({cycle:true,result:await v44Reconcile(sport,Math.floor(day/6)%3)});
    return Response.json({cycle:true,result:await v44Train(sport)});
  }catch(e){return Response.json({error:e instanceof Error?e.message:'Learning-Job fehlgeschlagen'},{status:503,headers:{'Cache-Control':'no-store'}});}
}

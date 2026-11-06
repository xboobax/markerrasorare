import {cronAuthorized} from '@/lib/learning-cron-auth';
import {v4515SorareScoreSync,v4515FootballHistoricBackfill,V4515_SCORE_SHARDS} from '@/lib/football-stats-pipeline-v4515';
import {validFootballStatBatch} from '@/lib/learning-v45-pipeline';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export async function GET(req:Request){
  if(!cronAuthorized(req.headers.get('authorization'),process.env.CRON_SECRET))return Response.json({error:'Unauthorized'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'DATABASE_URL fehlt'},{status:503});
  const url=new URL(req.url),job=url.searchParams.get('job');
  try{
    if(job==='sorare'){
      const shard=Number(url.searchParams.get('shard'));
      if(!Number.isInteger(shard)||shard<0||shard>=V4515_SCORE_SHARDS)return Response.json({error:'Ungültiger Shard'},{status:400});
      return Response.json(await v4515SorareScoreSync(shard),{headers:{'Cache-Control':'no-store'}});
    }
    if(job==='backfill'){
      const batch=url.searchParams.get('batch')??'',from=url.searchParams.get('from')??'';
      const days=Number(url.searchParams.get('days')??'1');
      if(!validFootballStatBatch(batch))return Response.json({error:'Ungültiger Wettbewerb-Batch'},{status:400});
      return Response.json(await v4515FootballHistoricBackfill(batch,from,days),{headers:{'Cache-Control':'no-store'}});
    }
    return Response.json({error:'Ungültiger Job: sorare|backfill'},{status:400});
  }catch(e){return Response.json({error:e instanceof Error?e.message:'Import fehlgeschlagen'},{status:503});}
}

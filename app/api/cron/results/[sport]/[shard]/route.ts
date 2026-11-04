import {cronAuthorized} from '@/lib/learning-cron-auth';
import {reconcileSport} from '@/lib/learning-pipeline';
import {writeJobStatus,cloudConfigured} from '@/lib/learning-cloud';
import type {Sport} from '@/lib/model';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(req:Request,{params}:{params:{sport:string;shard:string}}){
  if(!cronAuthorized(req.headers.get('authorization'),process.env.CRON_SECRET))return Response.json({error:'Unauthorized'},{status:401});
  if(!cloudConfigured())return Response.json({error:'UPSTASH_REDIS_REST_URL/TOKEN fehlen'},{status:503});
  const sport=params.sport,shard=Number(params.shard);
  if((sport!=='nba'&&sport!=='football')||![0,1,2].includes(shard))return Response.json({error:'Ungültiger Bereich'},{status:400});
  try{return Response.json(await reconcileSport(sport as Sport,shard),{headers:{'Cache-Control':'no-store'}});}
  catch(e){const detail=e instanceof Error?e.message:'Unbekannt';
    await writeJobStatus({scope:`results:${sport}-${shard}`,at:new Date().toISOString(),ok:false,message:detail}).catch(()=>undefined);
    return Response.json({error:'Abgleich fehlgeschlagen',detail},{status:503});}
}

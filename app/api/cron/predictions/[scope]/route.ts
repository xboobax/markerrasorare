import {cronAuthorized} from '@/lib/learning-cron-auth';
import {captureScope,validCaptureScope} from '@/lib/learning-pipeline';
import {writeJobStatus,cloudConfigured} from '@/lib/learning-cloud';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(req:Request,{params}:{params:{scope:string}}){
  if(!cronAuthorized(req.headers.get('authorization'),process.env.CRON_SECRET))return Response.json({error:'Unauthorized'},{status:401});
  if(!cloudConfigured())return Response.json({error:'UPSTASH_REDIS_REST_URL/TOKEN fehlen'},{status:503});
  const scope=params.scope;
  if(!validCaptureScope(scope))return Response.json({error:'Ungültiger Bereich'},{status:400});
  try{return Response.json(await captureScope(scope),{headers:{'Cache-Control':'no-store'}});}
  catch(e){const detail=e instanceof Error?e.message:'Unbekannt';
    await writeJobStatus({scope:`capture:${scope}`,at:new Date().toISOString(),ok:false,message:detail}).catch(()=>undefined);
    return Response.json({error:'Capture fehlgeschlagen',detail},{status:503});}
}

/** Opt-in external SoccerData importer: requires CRON_SECRET, explicit FINAL data.
 * Not enabled until source access/redistribution conditions are confirmed. */
import {cronAuthorized} from '@/lib/learning-cron-auth';
import {fromUnderstatPayload} from '@/lib/football-stats-v4515';
import {saveFootballMatchStats} from '@/lib/football-stats-db-v4515';
import {v44SaveJob} from '@/lib/learning-v44-db';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=30;
export async function POST(req:Request){
  if(!cronAuthorized(req.headers.get('authorization'),process.env.CRON_SECRET))return Response.json({error:'Unauthorized'},{status:401});
  if(Number(req.headers.get('content-length')||0)>240000)return Response.json({error:'Zu großer Import'},{status:413});
  let payload:unknown;
  try{const text=await req.text();if(text.length>240000)return Response.json({error:'Zu großer Import'},{status:413});payload=JSON.parse(text);}
  catch{return Response.json({error:'Ungültiges JSON'},{status:400});}
  const rows=fromUnderstatPayload(payload);
  if(!rows.length)return Response.json({error:'Keine validen abgeschlossenen Spielerleistungen. Nullen werden nicht erfunden.'},{status:422});
  try{
    const saved=await saveFootballMatchStats('understat',rows);
    await v44SaveJob({scope:'v4515:understat',at:new Date().toISOString(),ok:true,count:saved,
      message:`Understat: ${saved} validierte Einzelspiel-Zeilen gespeichert (kein Forecast-Learning)`});
    return Response.json({source:'understat',received:Array.isArray(payload)?payload.length:0,validated:rows.length,saved},
      {headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'Neon-Statistikarchiv nicht bereit. SQL-Migration ausführen.'},{status:503});}
}

/** Protected, bounded, opt-in ingestion of externally authorized SoccerData records. */
import {cronAuthorized} from '@/lib/learning-cron-auth';
import {normalizeSoccerdataRecords,soccerdataMatchRows} from '@/lib/football-soccerdata-v4516';
import {saveSoccerdataRecords} from '@/lib/football-soccerdata-db-v4516';
import {saveFootballMatchStats} from '@/lib/football-stats-db-v4515';
import {v44SaveJob} from '@/lib/learning-v44-db';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=30;
export async function POST(req:Request){
  if(!cronAuthorized(req.headers.get('authorization'),process.env.CRON_SECRET))
    return Response.json({error:'Unauthorized'},{status:401});
  if(Number(req.headers.get('content-length')||0)>160000)
    return Response.json({error:'Payload zu groß'},{status:413});
  let raw:unknown;
  try{const body=await req.text();if(body.length>160000)throw Error('size');raw=JSON.parse(body);}
  catch{return Response.json({error:'Ungültige JSON-Nutzlast'},{status:400});}
  if(!Array.isArray(raw)||raw.length<1||raw.length>80)
    return Response.json({error:'1–80 Records je Batch erforderlich'},{status:422});
  const records=normalizeSoccerdataRecords(raw,80);
  if(records.length===0)return Response.json({error:'Ungültige Source-Records; gesamter Batch abgelehnt'},{status:422});
  const providers=[...new Set(records.map(x=>x.source))];
  if(providers.length!==1)return Response.json({error:'Nur ein Provider pro Batch'},{status:422});
  const matches=soccerdataMatchRows(records),source=providers[0];
  try{
    const saved=await saveSoccerdataRecords(records);
    const matchSaved=matches.length?await saveFootballMatchStats(source,matches):0;
    await v44SaveJob({scope:`v4516:soccerdata:${source}`,at:new Date().toISOString(),ok:true,count:saved,
      message:`SoccerData ${source}: ${saved} Quell-Records, ${matchSaved} bestätigte Spieler-Matches, keine Prognoseänderung.`});
    return Response.json({source,received:records.length,saved,verifiedMatches:matchSaved,
      note:'Only verified FINAL matches become performance rows; other records remain source-specific.'},
      {headers:{'Cache-Control':'no-store'}});
  }catch(e){return Response.json({error:e instanceof Error?e.message:'Import fehlgeschlagen',
    migration:'schema/football-soccerdata-v4516.sql'},{status:503});}
}

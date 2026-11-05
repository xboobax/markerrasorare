import type {Sport} from '@/lib/model';
import {v44DbConfigured} from '@/lib/learning-v44-db';
import {v45PerformanceReport} from '@/lib/learning-v45-db';
export const runtime='nodejs';export const dynamic='force-dynamic';export const revalidate=0;export const fetchCache='force-no-store';export const maxDuration=15;
/** Read only a bounded summary, not the entire historical stats archive. */
export async function GET(req:Request){
  const input=new URL(req.url).searchParams.get('sport');
  if(input!=='nba'&&input!=='football')return Response.json({error:'Ungültige Sportart'},{status:400});
  const sport:Sport=input;
  if(!v44DbConfigured())return Response.json({sport,configured:false,schemaReady:false,summary:null,recent:[],
    message:'Neon ist noch nicht eingerichtet.'},{headers:{'Cache-Control':'no-store'}});
  try{const report=await v45PerformanceReport(sport);
    return Response.json({sport,configured:true,schemaReady:true,...report,
      message:'ESPN FINAL-Spielerstatistiken, keine offiziellen Sorare-Scores. Keine automatische Modellaktivierung durch Teilstatistiken.'},
      {headers:{'Cache-Control':'private, no-store'}});
  }catch{return Response.json({sport,configured:true,schemaReady:false,summary:null,recent:[],
    message:'V4.5-Statistiktabelle fehlt oder ist noch nicht erreichbar. Bitte schema/learning-v45-performance.sql in Neon ausführen.'},
    {headers:{'Cache-Control':'no-store'}});}
}

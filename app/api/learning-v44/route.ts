import type {Sport} from '@/lib/model';
import {v44DbConfigured,v44ReadModel,v44Rows,v44ReadJobs} from '@/lib/learning-v44-db';
import {v44Candidate,v44Evaluate} from '@/lib/learning-v44-calibration';
export const runtime='nodejs';export const dynamic='force-dynamic';export const revalidate=0;export const fetchCache='force-no-store';export const maxDuration=20;
export async function GET(req:Request){
  const sport:Sport=new URL(req.url).searchParams.get('sport')==='nba'?'nba':'football';
  if(!v44DbConfigured())return Response.json({sport,configured:false,active:null,summary:null,candidate:null,jobs:[],message:'Neon-Datenbank noch nicht eingerichtet; V3-Prognosen bleiben unverändert.'},{headers:{'Cache-Control':'no-store'}});
  try{const [rows,active,jobs]=await Promise.all([v44Rows(sport,3000),v44ReadModel(sport),v44ReadJobs(sport)]);
    return Response.json({sport,configured:true,active,summary:v44Evaluate(rows,sport),candidate:v44Candidate(rows,sport,active??{ppOffset:0,q80Offset:0}),jobs,
      message:'Nur vorab gespeicherte V3-Prognosen mit später eindeutig zugeordneten Sorare-FINAL-Scores werden bewertet.'},
      {headers:{'Cache-Control':'private, no-store, max-age=0'}});
  }catch{return Response.json({sport,configured:true,active:null,summary:null,candidate:null,jobs:[],message:'Neon ist nicht erreichbar oder das SQL-Schema fehlt.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}

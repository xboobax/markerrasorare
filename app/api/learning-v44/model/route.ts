import type {Sport} from '@/lib/model';
import {v44DbConfigured,v44ReadModel} from '@/lib/learning-v44-db';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:Request){
  const sport:Sport=new URL(req.url).searchParams.get('sport')==='nba'?'nba':'football';
  if(!v44DbConfigured())return Response.json({sport,model:null,configured:false},{headers:{'Cache-Control':'public, s-maxage=300'}});
  try{return Response.json({sport,model:await v44ReadModel(sport),configured:true},
    {headers:{'Cache-Control':'public, s-maxage=300, stale-while-revalidate=120'}});
  }catch{return Response.json({sport,model:null,configured:true,warning:'Kein aktives Modell abrufbar. Unveränderte V3-Prognose.'},
    {headers:{'Cache-Control':'no-store'}});}
}

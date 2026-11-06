import {footballStatsDiagnostic} from '@/lib/football-stats-db-v4515';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=15;
export async function GET(){
  try{return Response.json({schemaReady:true,...await footballStatsDiagnostic()},
    {headers:{'Cache-Control':'private, no-store'}});}
  catch{return Response.json({schemaReady:false,sourceStats:[],officialScores:null,verifiedLinks:[],jobs:[],
    migration:'schema/football-stats-v4515.sql',predictionModelChanged:false},
    {headers:{'Cache-Control':'private, no-store'}});}
}

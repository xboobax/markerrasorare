import {soccerdataStatsDiagnostics} from '@/lib/football-soccerdata-db-v4516';
import {footballStatsDiagnostic} from '@/lib/football-stats-db-v4515';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=15;
export async function GET(){
  try{const diagnostic=await footballStatsDiagnostic();let soccerdataRecords:Awaited<ReturnType<typeof soccerdataStatsDiagnostics>>=[];
    let soccerdataSchemaReady=false;try{soccerdataRecords=await soccerdataStatsDiagnostics();soccerdataSchemaReady=true;}catch{}
    return Response.json({schemaReady:true,...diagnostic,soccerdataSchemaReady,soccerdataRecords},
    {headers:{'Cache-Control':'private, no-store'}});}
  catch{return Response.json({schemaReady:false,sourceStats:[],officialScores:null,verifiedLinks:[],jobs:[],
    migration:'schema/football-stats-v4515.sql',predictionModelChanged:false},
    {headers:{'Cache-Control':'private, no-store'}});}
}

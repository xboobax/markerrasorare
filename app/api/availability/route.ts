import {getAvailabilitySnapshot} from "@/lib/availability-feed";
import {isFootballLeague} from "@/lib/leagues";

export const runtime="nodejs";
export const maxDuration=60;
export async function GET(request:Request):Promise<Response>{
  const url=new URL(request.url);
  const sport=url.searchParams.get("sport");
  const league=url.searchParams.get("league")??"__all";
  if(sport!=="nba"&&sport!=="football")return Response.json({error:"Ungültige Sportart"},{status:400});
  if(sport==="football"&&league!=="__all"&&!isFootballLeague(league))return Response.json({error:"Ungültige Liga"},{status:400});
  try{
    const report=await getAvailabilitySnapshot(sport,league);
    return Response.json(report,{headers:{"cache-control":"private, no-store"}});
  }catch{
    return Response.json({error:"Verletzungsdaten derzeit nicht verfügbar"},{status:503,headers:{"cache-control":"private, no-store"}});
  }
}

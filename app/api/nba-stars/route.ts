import {getNbaStarRatings} from "@/lib/nba-stars-feed";

export const runtime="nodejs";
export const maxDuration=60;

export async function POST(request:Request):Promise<Response> {
  let body:unknown;
  try{body=await request.json();}
  catch{return Response.json({error:"Ungültiger JSON-Abruf."},{status:400});}
  if(!body||typeof body!=="object"||Array.isArray(body))return Response.json({error:"Fehlende Spieler-IDs."},{status:400});
  const value=body as {slugs?:unknown;refresh?:unknown};
  try{
    const snapshot=await getNbaStarRatings(value.slugs,value.refresh===true);
    if(snapshot.requested>0&&snapshot.received===0&&snapshot.failedChunks>0)
      return Response.json({error:"Sorare-Sterne momentan nicht erreichbar.",...snapshot},{status:503,headers:{"cache-control":"no-store"}});
    return Response.json(snapshot,{headers:{"cache-control":"no-store"}});
  }catch(e){return Response.json({error:e instanceof Error?e.message:"Sterne konnten nicht geladen werden."},{status:400});}
}

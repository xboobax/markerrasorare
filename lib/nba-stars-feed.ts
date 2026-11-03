import {officialStarValue,type NbaStarRatings,type NbaStarSync} from "./nba-stars";

const ENDPOINT="https://api.sorare.com/graphql";
const CHUNK_SIZE=40;
const MAX_SLUGS=1500;
const SAFE_SLUG=/^[a-z0-9][a-z0-9-]{0,110}$/;

export function normalizeStarSlugs(input:unknown):string[] {
  if(!Array.isArray(input)||input.length>MAX_SLUGS)throw new Error("Zu viele Spieler für einen Sterneabruf.");
  const result=new Set<string>();
  for(const value of input){
    if(typeof value!=="string"||!SAFE_SLUG.test(value))throw new Error("Ungültige Spieler-ID im Sterneabruf.");
    result.add(value);
  }
  return [...result];
}

// Independent, narrow query. The proven L5/L10 roster queries in lib/sorare.ts
// never change and cannot fail just because stars are temporarily unavailable.
export function starQuery(slugs:string[]):string {
  return `{ players(slugs: ${JSON.stringify(slugs)}) { slug sport gameplayTierStars } }`;
}

async function fetchStarChunk(slugs:string[],force:boolean):Promise<NbaStarRatings> {
  const headers:Record<string,string>={"content-type":"application/json"};
  if(process.env.SORARE_API_KEY)headers.APIKEY=process.env.SORARE_API_KEY;
  const response=await fetch(ENDPOINT,{
    method:"POST",headers,body:JSON.stringify({query:starQuery(slugs)}),
    ...(force?{cache:"no-store" as const}:{next:{revalidate:900}}),
    signal:AbortSignal.timeout(11000),
  });
  if(!response.ok)throw new Error(`Sorare HTTP ${response.status}`);
  const data=await response.json() as {data?:{players?:Array<{slug?:unknown;sport?:unknown;gameplayTierStars?:unknown}>};errors?:Array<{message?:string}>};
  if(data.errors?.length)throw new Error(data.errors[0]?.message??"Sorare-GraphQL-Fehler");
  if(!Array.isArray(data.data?.players))throw new Error("Keine Sorare-Spielerantwort");
  const out:NbaStarRatings=Object.create(null);
  const allowed=new Set(slugs);
  for(const player of data.data.players) {
    if(typeof player.slug!=="string"||!allowed.has(player.slug)||player.sport!=="NBA")continue;
    const stars=officialStarValue(player.gameplayTierStars);
    if(stars!==null)out[player.slug]=stars;
  }
  return out;
}

/** Concurrency-limited requests with independent failures and no fabricated ratings. */
export async function getNbaStarRatings(input:unknown,force=false,fetchChunk=fetchStarChunk):Promise<NbaStarSync> {
  const slugs=normalizeStarSlugs(input);
  const chunks:string[][]=[];
  for(let i=0;i<slugs.length;i+=CHUNK_SIZE)chunks.push(slugs.slice(i,i+CHUNK_SIZE));
  const ratings:NbaStarRatings=Object.create(null);
  let failedChunks=0;
  let cursor=0;
  const worker=async()=>{
    while(cursor<chunks.length){
      const chunk=chunks[cursor++];
      try {Object.assign(ratings,await fetchChunk(chunk,force));}
      catch {failedChunks++;}
    }
  };
  await Promise.all(Array.from({length:Math.min(3,chunks.length)},()=>worker()));
  return {ratings,requested:slugs.length,received:Object.keys(ratings).length,
    failedChunks,fetchedAt:new Date().toISOString(),partial:failedChunks>0,
    source:"NBAPlayer.gameplayTierStars"};
}

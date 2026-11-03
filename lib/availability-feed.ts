import {parseApiFootballAvailability,parseEspnAvailability,type AvailabilityReport,type AvailabilitySnapshot} from "./availability";
import type {Sport} from "./model";
import {FOOTBALL_LEAGUES,isFootballLeague} from "./leagues";

const FOOTBALL:Record<string,{espn:string;id:number}>={"Bundesliga":{espn:"ger.1",id:78},"Premier League":{espn:"eng.1",id:39},"LaLiga":{espn:"esp.1",id:140},"Ligue 1":{espn:"fra.1",id:61}};
const ESPN="https://site.api.espn.com/apis/site/v2/sports/";
function plausibleInjuryFeed(data:unknown):boolean{
  if(!data||typeof data!=="object"||Array.isArray(data))return false;
  const obj=data as Record<string,unknown>;
  return ["injuries","items","athletes","players","teams","groups","entries"].some(key=>Array.isArray(obj[key]));
}
const TIMEOUT_MS=9000;
async function getJSON(url:string,headers?:Record<string,string>,ttl=180):Promise<unknown>{
  const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),TIMEOUT_MS);
  try{
    const res=await fetch(url,{signal:abort.signal,headers, next:{revalidate:ttl}});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    const data:unknown=await res.json();
    if(!data||typeof data!=="object")throw new Error("Leere oder ungültige Antwort");
    return data;
  } finally {clearTimeout(timeout);}
}
/** Server-only providers. Never deliver API-FOOTBALL_KEY to the browser. */
export async function getAvailabilitySnapshot(sport:Sport,league:string,now=new Date()):Promise<AvailabilitySnapshot>{
  const fetchedAt=now.toISOString(),notes:string[]=[],reports:AvailabilityReport[]=[],sources:string[]=[];
  const leagues=sport==="nba"?[]:league==="__all"?[...FOOTBALL_LEAGUES]:isFootballLeague(league)?[league]:[];
  let failed=0,success=0;
  const sourceTimes:string[]=[];
  if(sport==="nba"){
    try{
      const data=await getJSON(`${ESPN}basketball/nba/injuries`,undefined,120);
      if(!plausibleInjuryFeed(data))throw new Error("Unbekanntes Providerformat");
      const date=(data as Record<string,unknown>).timestamp;
      if(typeof date==="string"&&!Number.isNaN(Date.parse(date)))sourceTimes.push(new Date(date).toISOString());
      reports.push(...parseEspnAvailability(data));sources.push("ESPN NBA");success++;
    } catch {failed++;notes.push("ESPN NBA-Verletzungsfeed derzeit nicht abrufbar.");}
  }else{
    const key=process.env.API_FOOTBALL_KEY?.trim();
    const season=now.getUTCMonth()>=6?now.getUTCFullYear():now.getUTCFullYear()-1;
    await Promise.all(leagues.map(async item=>{
      const conf=FOOTBALL[item];
      // ESPN is a best-effort, undocumented fallback, not guaranteed coverage.
      try{
        const data=await getJSON(`${ESPN}soccer/${conf.espn}/injuries`,undefined,300);
        if(!plausibleInjuryFeed(data))throw new Error("Unbekanntes Providerformat");
        const date=(data as Record<string,unknown>).timestamp;
        if(typeof date==="string"&&!Number.isNaN(Date.parse(date)))sourceTimes.push(new Date(date).toISOString());
        reports.push(...parseEspnAvailability(data,item));sources.push(`ESPN ${item}`);success++;
      }catch{failed++;notes.push(`ESPN ${item}: keine abrufbaren Verletzungsdaten.`);}
      if(key){
        try{
          const url=`https://v3.football.api-sports.io/injuries?league=${conf.id}&season=${season}`;
          const data=await getJSON(url,{"x-apisports-key":key},4*3600);
          const apiResponse=data as {errors?:unknown;response?:unknown};
          if(apiResponse.errors&&JSON.stringify(apiResponse.errors)!=="[]"&&JSON.stringify(apiResponse.errors)!=="{}")throw new Error("Provider meldet Fehler");
          reports.push(...parseApiFootballAvailability(data,item,now.toISOString().slice(0,10)));
          sources.push(`API-Football ${item}`);success++;
        }catch{failed++;notes.push(`API-Football ${item}: Daten derzeit nicht abrufbar oder Tariflimit.`);}
      }
    }));
    if(!key)notes.push("API_FOOTBALL_KEY nicht eingerichtet: Fußball-Ausfälle hängen von der ESPN-Abdeckung ab. API-Football meldet normalerweise nur alle vier Stunden neue Verletzungsdaten.");
  }
  return {sport,league,fetchedAt,status:success===0?"unavailable":failed?"partial":"available",reports,
    sources:[...new Set(sources)],notes,providerUpdatedAt:sourceTimes.length?sourceTimes.sort()[0]:undefined};
}

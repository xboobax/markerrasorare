/** Server-only adapter: calls ESPN's publicly reachable but unsupported site API. */
import {parseEspnScoreboard,parseEspnSummary} from './nba-live-core';
const ESPN='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
export async function nbaEspnJson(path:string,revalidate:number):Promise<unknown>{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch(`${ESPN}/${path}`,{headers:{Accept:'application/json'},
      next:{revalidate},signal:controller.signal});
    if(!response.ok)throw new Error(`Live-Datenquelle antwortet mit HTTP ${response.status}.`);
    const data=await response.json();if(!data||typeof data!=='object')throw new Error('Live-Datenquelle lieferte kein gültiges JSON.');
    return data;
  }catch(error){
    if(controller.signal.aborted)throw new Error('Live-Datenquelle hat nicht rechtzeitig geantwortet.');
    throw error;
  }finally{clearTimeout(timeout);}
}
export async function nbaLiveScoreboard(date:string){
  // ESPN groups games by North-American calendar day. A German local date
  // can span TWO US game dates (e.g. 05 Nov 01:00 CET = 04 Nov US evening).
  const previous=new Date(Date.parse(`${date}T12:00:00Z`)-86400000).toISOString().slice(0,10);
  const days=[previous,date];
  const results=await Promise.allSettled(days.map(d=>nbaEspnJson(`scoreboard?dates=${d.replace(/-/g,'')}&limit=35`,20)));
  const updatedAt=new Date().toISOString();
  const pages=results.filter((r):r is PromiseFulfilledResult<unknown>=>r.status==='fulfilled');
  if(!pages.length)throw new Error('ESPN-Spielplan ist über beide Kalendertage nicht erreichbar.');
  const seen=new Set<string>();const games=pages.flatMap(r=>parseEspnScoreboard(r.value,updatedAt))
    .filter(g=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(g.date))===date)
    .filter(g=>{if(seen.has(g.id))return false;seen.add(g.id);return true})
    .sort((a,b)=>a.date.localeCompare(b.date));
  return {games,source:'ESPN Gamecast',updatedAt,
    warning:pages.length<days.length?'ESPN hat einen der beiden Zeitzonen-Tage nicht geliefert; der Spielplan kann unvollständig sein.':null};
}
export async function nbaLiveGame(eventId:string){
  const payload=await nbaEspnJson(`summary?event=${eventId}`,15);
  return parseEspnSummary(payload,eventId,new Date().toISOString());
}

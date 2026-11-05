/** Server-only adapter for ESPN's publicly reachable but unsupported soccer feed. */
import {FootballLeagueKey,footballLeagueKeys,parseEspnFootballScoreboard,parseEspnFootballSummary} from './football-live-core';
const ESPN='https://site.api.espn.com/apis/site/v2/sports/soccer';
export async function footballEspnJson(league:FootballLeagueKey,path:string,revalidate:number):Promise<unknown>{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch(`${ESPN}/${league}/${path}`,{headers:{Accept:'application/json'},next:{revalidate},signal:controller.signal});
    if(!response.ok)throw new Error(`Live-Datenquelle antwortet mit HTTP ${response.status}.`);
    const data=await response.json();if(!data||typeof data!=='object')throw new Error('Live-Datenquelle lieferte kein gültiges JSON.');
    return data;
  }catch(error){if(controller.signal.aborted)throw new Error('Live-Datenquelle hat nicht rechtzeitig geantwortet.');throw error;}finally{clearTimeout(timeout);}
}
export async function footballLiveScoreboard(date:string,league:FootballLeagueKey|'all'){
  const updatedAt=new Date().toISOString();
  const leagues=league==='all'?footballLeagueKeys:[league];
  const results=await Promise.allSettled(leagues.map(l=>footballEspnJson(l,`scoreboard?dates=${date.replace(/-/g,'')}&limit=60`,25)));
  const pages=results.map((result,index)=>({result,league:leagues[index]}));
  const ok=pages.filter((entry):entry is {result:PromiseFulfilledResult<unknown>;league:FootballLeagueKey}=>entry.result.status==='fulfilled');
  if(!ok.length)throw new Error('ESPN-Fußball-Scoreboard derzeit nicht erreichbar.');
  const games=ok.flatMap(({result,league:lg})=>parseEspnFootballScoreboard(result.value,updatedAt,lg)).sort((a,b)=>a.date.localeCompare(b.date));
  return {games,source:'ESPN Gamecast',updatedAt,warning:ok.length<leagues.length?'Mindestens eine Liga konnte nicht geladen werden; die Liste kann unvollständig sein.':null};
}
export async function footballLiveGame(eventId:string,league:FootballLeagueKey){
  const payload=await footballEspnJson(league,`summary?event=${eventId}`,15);
  return parseEspnFootballSummary(payload,eventId,new Date().toISOString(),league);
}

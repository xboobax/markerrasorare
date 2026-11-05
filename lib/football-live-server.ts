/** Server-only adapter for ESPN's publicly reachable but unsupported soccer feed. */
import {parseEspnFootballScoreboard,parseEspnFootballSummary} from './football-live-core';
import {footballCompetition,footballCompetitionsFor,isNationalFootballLeague,type FootballLeagueKey,type FootballCompetitionFilter} from './football-competitions';
const ESPN='https://site.api.espn.com/apis/site/v2/sports/soccer';
const berlinDay=(utc:string)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(utc));
const previousDay=(date:string)=>new Date(Date.parse(`${date}T12:00:00Z`)-86400000).toISOString().slice(0,10);
const compactDate=(date:string)=>date.replace(/-/g,'');
/** International matches can kick off late in the Americas: include the previous
 * UTC date to show those fixtures under the correct German calendar day.
 * ESPN supports a bounded scoreboard date range; this is not a season scan. */
export function footballScoreboardPath(date:string,league:FootballLeagueKey){
  const dates=isNationalFootballLeague(league)?`${compactDate(previousDay(date))}-${compactDate(date)}`:compactDate(date);
  return `scoreboard?dates=${dates}&limit=${isNationalFootballLeague(league)?100:65}`;
}
export async function footballEspnJson(league:FootballLeagueKey,path:string,revalidate:number):Promise<unknown>{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),7500);
  try{
    const response=await fetch(`${ESPN}/${league}/${path}`,{headers:{Accept:'application/json'},next:{revalidate},signal:controller.signal});
    if(!response.ok)throw new Error(`Live-Datenquelle antwortet mit HTTP ${response.status}.`);
    const data=await response.json();if(!data||typeof data!=='object')throw new Error('Live-Datenquelle lieferte kein gültiges JSON.');
    return data;
  }catch(error){if(controller.signal.aborted)throw new Error('Live-Datenquelle hat nicht rechtzeitig geantwortet.');throw error;}finally{clearTimeout(timeout);}
}
export async function footballLiveScoreboard(date:string,filter:FootballCompetitionFilter){
  const updatedAt=new Date().toISOString();
  const leagues=footballCompetitionsFor(filter);
  // Explicit competition groups are bounded. No other rosters, Sorare players,
  // or event summaries are loaded while listing matches.
  const results=await Promise.allSettled(leagues.map(async league=>{
    const payload=await footballEspnJson(league,footballScoreboardPath(date,league),40);
    return parseEspnFootballScoreboard(payload,updatedAt,league);
  }));
  const failed=results.flatMap((entry,i)=>entry.status==='rejected'?[footballCompetition(leagues[i]).name]:[]);
  const ok=results.filter((result):result is PromiseFulfilledResult<ReturnType<typeof parseEspnFootballScoreboard>>=>result.status==='fulfilled');
  if(!ok.length)throw new Error('ESPN-Fußball-Scoreboard derzeit für die ausgewählten Wettbewerbe nicht erreichbar.');
  const seen=new Set<string>();
  const games=ok.flatMap(result=>result.value)
    .filter(game=>berlinDay(game.date)===date)
    .filter(game=>{if(seen.has(game.id))return false;seen.add(game.id);return true;})
    .sort((a,b)=>a.date.localeCompare(b.date)||a.leagueName.localeCompare(b.leagueName));
  return {games,source:'ESPN Gamecast',updatedAt,
    warning:failed.length?`Nicht erreichbar: ${failed.join(', ')}. Die Spielübersicht kann unvollständig sein.`:null,
    failedCompetitions:failed};
}
export async function footballLiveGame(eventId:string,league:FootballLeagueKey){
  const payload=await footballEspnJson(league,`summary?event=${eventId}`,15);
  return parseEspnFootballSummary(payload,eventId,new Date().toISOString(),league);
}

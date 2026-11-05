/** Bounded, anonymous ESPN diagnostic; no club credentials or database mutation. */
import {isFootballLeagueKey} from '@/lib/football-competitions';
import {footballLiveScoreboard,footballEspnJson} from '@/lib/football-live-server';
import {parseEspnFootballSummary} from '@/lib/football-live-core';
import {v454AuditFootballSummary} from '@/lib/learning-v454-football-audit';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=30;
const headers={'Cache-Control':'private, no-store, max-age=0'};
const localDay=(d:Date)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
export async function GET(req:Request){
  const url=new URL(req.url);
  const league=url.searchParams.get('competition')??'uefa.champions';
  if(!isFootballLeagueKey(league))return Response.json({error:'Ungültiger Wettbewerb'},{status:400,headers});
  const today=localDay(new Date()),day=url.searchParams.get('day')??today;
  const delta=(Date.parse(day+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isInteger(delta)||delta< -7||delta>1)
    return Response.json({error:'Tag nur innerhalb der letzten 7 Tage bis morgen möglich.'},{status:400,headers});
  try{
    const board=await footballLiveScoreboard(day,league);
    const finals=board.games.filter(game=>game.status==='final').sort((a,b)=>b.date.localeCompare(a.date));
    const samples=[];
    for(const game of finals.slice(0,2)){
      try{
        const raw=await footballEspnJson(league,`summary?event=${game.id}`,60);
        const detail=parseEspnFootballSummary(raw,game.id,new Date().toISOString(),league);
        samples.push(v454AuditFootballSummary(raw,detail));
      }catch{samples.push({reason:'summary_fetch_or_parse_failed'});}
    }
    return Response.json({competition:league,day,finalGames:finals.length,inspectedGames:samples.length,
      samples,sourceWarning:board.warning,
      note:'Anonyme Prüfung: nur Zahlen und Strukturgründe. Ein fehlender ESPN-Boxscore ist kein Sorare-Score.'},{headers});
  }catch{return Response.json({competition:league,day,error:'ESPN-Scoreboard ist derzeit nicht abrufbar.'},{status:503,headers});}
}

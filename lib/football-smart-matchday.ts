/** Football Optimizer 3.0. Sorare confirms a fixture's date and teams, ESPN
 * supplies an independently verified kickoff only when uniquely matched.
 * An unverified timestamp is never invented for the rolling 24h window. */
import type {Forecast} from './model';
import {berlinCalendarDay,offsetBerlinDay} from './builder-pool';
import type {FootballLiveGame} from './football-live-core';
export type FootballMatchdayWindow='today'|'24h'|'tomorrow'|'7d';
export type ConfirmedFootballKickoff={home:string;away:string;tipoff:string;status:string;league:string};
export const footballWindowLabel=(v:FootballMatchdayWindow)=>({today:'Heute','24h':'Nächste 24 Stunden',tomorrow:'Morgen','7d':'Nächste 7 Tage (Spielplan)'}[v]);
const fixturePattern=/^(\d{4}-\d{2}-\d{2})\s+(.+?)\s+-\s+(.+)$/;
const alias:Record<string,string>={
  'man utd':'manchesterunited','manunited':'manchesterunited','manchesterutd':'manchesterunited',
  'man city':'manchestercity','manchestercityfc':'manchestercity',
  'psg':'parissaintgermain','parissg':'parissaintgermain','parissaintgermainfc':'parissaintgermain',
  'bayernmunich':'bayernmunchen','bayernmuenchen':'bayernmunchen','fcbayernmunchen':'bayernmunchen',
  'intermilan':'internazionale','fcinternazionale':'internazionale',
  'athleticbilbao':'athleticclub','atleticomadrid':'atleticodemadrid',
  'borussiadortmund':'dortmund','bvb':'dortmund',
  'tottenhamhotspur':'tottenham','tottenhamhotspurfc':'tottenham',
  'newcastleunited':'newcastle','newcastleunitedfc':'newcastle',
  'westhamunited':'westham','westhamunitedfc':'westham',
  'sportingcp':'sportinglisbon','sportingclubeportugal':'sportinglisbon',
  'rcstrasbourg':'strasbourg','racingclubdestrasbourg':'strasbourg',
};
export function canonicalFootballTeam(v:string):string{
  const key=v.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/\bfc\b|\bafc\b|\bsc\b|\bcf\b|\bfk\b|\bsv\b/g,'')
    .replace(/&/g,'and').replace(/[^a-z0-9]/g,'');
  return alias[key]??key;
}
const isValidDay=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
export function playerFootballFixture(p:Pick<Forecast,'hasGame'|'nextGame'>):{day:string;home:string;away:string}|null{
  if(p.hasGame===false)return null;
  const parts=fixturePattern.exec(p.nextGame?.trim()??'');
  if(!parts||!isValidDay(parts[1])||parts[2]==='?'||parts[3]==='?'||!parts[2].trim()||!parts[3].trim())return null;
  return {day:parts[1],home:parts[2],away:parts[3]};
}
export function footballKickoffsFromScoreboards(boards:readonly {games?:FootballLiveGame[]}[]):ConfirmedFootballKickoff[]{
  const games=boards.flatMap(b=>Array.isArray(b.games)?b.games:[]);
  const unique=new Map<string,ConfirmedFootballKickoff>();
  for(const g of games){
    if(!g||!['scheduled','live','final'].includes(g.status)||!g.date||!Number.isFinite(Date.parse(g.date)))continue;
    if(!/([zZ]|[+-]\d\d:\d\d)$/.test(g.date))continue;
    const home=canonicalFootballTeam(g.home?.name||''),away=canonicalFootballTeam(g.away?.name||'');
    if(!home||!away||home===away)continue;
    const key=g.id+':'+g.leagueKey;
    unique.set(key,{home:g.home.name,away:g.away.name,tipoff:g.date,status:g.status,league:g.leagueName});
  }
  return [...unique.values()];
}
export function confirmedFootballKickoff(p:Pick<Forecast,'hasGame'|'nextGame'>,fixtures:readonly ConfirmedFootballKickoff[]):string|null{
  const original=playerFootballFixture(p);if(!original)return null;
  const home=canonicalFootballTeam(original.home),away=canonicalFootballTeam(original.away);
  if(!home||!away||home===away)return null;
  const matched=fixtures.filter(f=>canonicalFootballTeam(f.home)===home&&canonicalFootballTeam(f.away)===away&&
    berlinCalendarDay(new Date(f.tipoff))===original.day&&f.status==='scheduled');
  // Ambiguous matching is not proof of a kickoff.
  return matched.length===1?matched[0].tipoff:null;
}
export function eligibleFootballOptimizerIds(players:readonly Pick<Forecast,'id'|'hasGame'|'nextGame'|'nextGameTipoff'>[],window:FootballMatchdayWindow,now:Date,kickoffs:readonly ConfirmedFootballKickoff[]=[]):Set<string>{
  const accepted=new Set<string>();const today=berlinCalendarDay(now),tomorrow=offsetBerlinDay(now,1),limit=offsetBerlinDay(now,7);
  for(const p of players){
    const fixture=playerFootballFixture(p);if(!fixture)continue;
    if(window==='today'&&fixture.day===today||window==='tomorrow'&&fixture.day===tomorrow||window==='7d'&&fixture.day>=today&&fixture.day<limit){accepted.add(p.id);continue;}
    if(window!=='24h')continue;
    // Only a uniquely matched ESPN scheduled kickoff counts as an exact 24h proof.
    const when=confirmedFootballKickoff(p,kickoffs);
    if(when){const t=Date.parse(when);if(t>=now.getTime()&&t<now.getTime()+86400000)accepted.add(p.id);}
  }
  return accepted;
}
export function verifyFootballOptimizerTransfer(ids:readonly string[],positions:ReadonlyMap<string,string>,allowed:ReadonlySet<string>,captainId:string|null):string|null{
  if(ids.length!==5||new Set(ids).size!==5)return 'Es müssen genau fünf verschiedene Spieler ausgewählt sein.';
  if(ids.some(id=>!allowed.has(id)))return 'Ein Spieler ist nicht für den gewählten Zeitraum bestätigt oder steht auf OUT/Ausschluss.';
  const slots=['GK','DEF','MID','FWD','FLEX'];
  if(ids.some((id,i)=>i<4?positions.get(id)!==slots[i]:!['DEF','MID','FWD'].includes(positions.get(id)??'')))
    return 'Torwart, Abwehr, Mittelfeld, Sturm und Extra-Feldspieler müssen korrekt besetzt sein.';
  if(!captainId||!ids.includes(captainId))return 'Bitte einen Captain aus den fünf gewählten Spielern bestimmen.';
  return null;
}

import type {Forecast,Sport} from './model';
import type {ScheduleData} from './gameweek-center';
import {canonicalNbaTeam} from './nba-fixture-mapping';
import {offsetBerlinDay,playsOnBerlinDay} from './builder-pool';

/** Daily Mission recommendations are rankings, NOT calibrated success probabilities.
 * No play-by-play football actions are currently present in the Sorare player feed.
 */
export type MissionWindow='today'|'tomorrow'|'next24';
export type DailyMissionCandidate=Forecast & {
  xg?:number|null; xa?:number|null; opponentRating?:number|null;
  matchupAdjustmentPct?:number;
};
export type MissionRow={
  player:DailyMissionCandidate;
  rankIndex:number;
  kind:'nba'|'field'|'goalkeeper';
  reason:string;
  quality:'limited'|'partial'|'history';
  threshold?:number;
  l10?:number;
  forecastMargin?:number;
  historicalHits?:number;
  historicalGames?:number;
};
export type MissionOptions={
  sport:Sport; window:MissionWindow; now:Date; nbaSchedule:ScheduleData;
  ownedOnly?:boolean; ownedIds?:ReadonlySet<string>; excludedIds?:ReadonlySet<string>;
};
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const clamp=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));
const normScores=(p:Forecast)=> (p.recentScores??[]).filter((v):v is number=>finite(v)&&v>=0&&v<=500).slice(0,10);

/** Today/tomorrow use Berlin dates; next24 requires a verified NBA tipoff. */
export function dailyMissionHasFixture(p:DailyMissionCandidate,opts:MissionOptions):boolean{
  if(!Number.isFinite(opts.now.getTime())||p.hasGame===false)return false;
  if(opts.window==='today'||opts.window==='tomorrow'){
    if(!playsOnBerlinDay(p,opts.sport,offsetBerlinDay(opts.now,opts.window==='tomorrow'?1:0),opts.nbaSchedule))return false;
    if(opts.sport==='football'){
      // A verified individual kickoff can exclude already-started fixtures.
      if(p.nextGameTipoff){const t=new Date(p.nextGameTipoff).getTime();return Number.isFinite(t)&&t>=opts.now.getTime();}
      return true; // football nextGame usually has a day, not a verified kickoff
    }
    const team=canonicalNbaTeam(p.team);
    if(!team)return false;
    const day=offsetBerlinDay(opts.now,opts.window==='tomorrow'?1:0);
    return opts.nbaSchedule.fixtures.some(f=>{
      if(!((canonicalNbaTeam(f.home)===team)||(canonicalNbaTeam(f.away)===team)))return false;
      if(!f.tipoff)return false; // do not recommend without a reliable NBA start time
      const t=new Date(f.tipoff);
      return Number.isFinite(t.getTime())&&t.getTime()>=opts.now.getTime()&&
        offsetBerlinDay(t,0)===day;
    });
  }
  if(opts.sport!=='nba'||opts.nbaSchedule.status!=='available')return false;
  const team=canonicalNbaTeam(p.team);
  if(!team)return false;
  return opts.nbaSchedule.fixtures.some(f=>{
    if(!f.tipoff)return false;
    const date=new Date(f.tipoff).getTime();
    return Number.isFinite(date)&&date>=opts.now.getTime()&&date<=opts.now.getTime()+86400000&&
      (canonicalNbaTeam(f.home)===team||canonicalNbaTeam(f.away)===team);
  });
}

function nbaMissionRow(p:DailyMissionCandidate):MissionRow|null{
  // Screenshot: >= L10+7 AND >=20 manager points; both must hold.
  // Only an actual L10 source is permitted. A shorter recent-score mean is not L10.
  const l10=finite(p.averageL10)&&p.averageL10>=0?p.averageL10:null;
  if(l10===null)return null;
  const threshold=Math.max(20,l10+7);
  const history=normScores(p);
  const hits=history.filter(v=>v>=threshold).length;
  const modelSpread=Math.max(8,finite(p.variability)?p.variability:8);
  const margin=p.expected-threshold;
  // A smooth ranking signal: NOT a statistical probability of achieving the mission.
  const expectedFit=1/(1+Math.exp(-clamp(margin/modelSpread,-12,12)*1.5));
  const historyFit=history.length>=5?hits/history.length:null;
  const base=historyFit===null?expectedFit:0.68*expectedFit+0.32*historyFit;
  const dataPenalty=history.length>=8?1:history.length>=5?0.97:0.90;
  const index=100*base*clamp(p.playProb,0,1)*dataPenalty;
  const historyLabel=history.length?`${hits}/${history.length} letzte Scores erreichten die Marke`:'Keine Einzelscores verfügbar';
  return {player:p,rankIndex:index,kind:'nba',threshold,l10,forecastMargin:margin,
    historicalHits:hits,historicalGames:history.length,quality:history.length>=5?'history':'limited',
    reason:`Ziel ≥ ${threshold.toFixed(1)} · Prognose bei Einsatz ${p.expected.toFixed(1)} · ${historyLabel}`};
}
function footballMissionRow(p:DailyMissionCandidate):MissionRow|null{
  const keeper=p.position==='GK';
  if(!keeper&&!['DEF','MID','FWD'].includes(p.position))return null;
  // Football event-level goal/assist/goal-line clearance/penalty save/clean-sheet
  // records are not in this app's feed. Do not claim to estimate event odds.
  // Historical Sorare point totals are only a low-confidence proxy.
  const history=normScores(p);
  const score=finite(p.expected)?p.expected:0;
  const form=finite(p.last5Avg)?p.last5Avg:score;
  const formMix=0.70*score+0.30*form;
  const minutes=clamp(p.playProb,0,1);
  const scout=(!keeper&&finite(p.xg)&&p.xg>=0?clamp(p.xg,0,2):0)+
    (!keeper&&finite(p.xa)&&p.xa>=0?clamp(p.xa,0,2):0);
  const hasScout=!keeper&&((finite(p.xg)&&p.xg>=0)||(finite(p.xa)&&p.xa>=0));
  const base=clamp(formMix/80,0,1);
  // Mild positional priors reflect attacking involvement in scoring actions.
  // No supposed historical decisive-event frequencies are inferred.
  const role=keeper?0.94:p.position==='FWD'?1.08:p.position==='MID'?1.02:0.88;
  const ranking=100*minutes*(0.28+0.72*base)*role*(hasScout?1+0.10*clamp(scout,0,2):1);
  const evidence=hasScout?'Zusätzliche xG/xA-Angaben vorhanden · ':'Nur Punkte-/Einsatzdaten · ';
  return {player:p,rankIndex:clamp(ranking,0,100),kind:keeper?'goalkeeper':'field',
    quality:hasScout?'partial':'limited',reason:evidence+(keeper
      ?'Clean Sheet und gehaltener Elfmeter sind nicht separat messbar'
      :'Tore, Assists und Klärungen auf der Linie sind nicht separat messbar')};
}
/** Input should be the currently loaded roster; do not imply global Sorare coverage. */
export function rankDailyMissionPlayers(pool:DailyMissionCandidate[],opts:MissionOptions):MissionRow[]{
  const rows:MissionRow[]=[];
  for(const p of pool){
    if(opts.excludedIds?.has(p.id)||opts.ownedOnly&&!opts.ownedIds?.has(p.id)||!dailyMissionHasFixture(p,opts)||
      p.injuries>0||p.playProb<=0||!p.forecastSources?.length)continue;
    const row=opts.sport==='nba'?nbaMissionRow(p):footballMissionRow(p);
    if(row)rows.push(row);
  }
  return rows.sort((a,b)=>b.rankIndex-a.rankIndex||b.player.playProb-a.player.playProb||a.player.name.localeCompare(b.player.name,'de'));
}

export function missionDescription(sport:Sport):string{
  return sport==='nba'
    ?'Daily Picker Classic: mindestens 20 Managerpunkte und mindestens 7 Punkte über dem offiziellen L10.'
    :'Entscheidende Aktion: Feldspieler – Tor, Assist oder Klärung auf der Linie; Torhüter – Elfmeter gehalten oder zu null gespielt.';
}

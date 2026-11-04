import type {Forecast,Sport} from './model';
import type {ScheduleData} from './gameweek-center';
import type {AvailabilityReport,AvailabilityStatus} from './availability';
import {canonicalNbaTeam} from './nba-fixture-mapping';
import {offsetBerlinDay,playsOnBerlinDay} from './builder-pool';

/** Free data only. Rankings and safety labels are NOT calibrated success probabilities.
 * Individual football action events (goals, assists, goal-line clearances, penalty saves,
 * clean sheets) are not available from the existing roster feed.
 */
export type MissionWindow='today'|'tomorrow'|'next24';
export type DailyMissionCandidate=Forecast & {
  xg?:number|null;xa?:number|null;opponentRating?:number|null;
  matchupAdjustmentPct?:number;
};
export type MissionSafetyLevel='ready'|'caution'|'high';
export type MissionSafety={level:MissionSafetyLevel;riskIndex:number;notes:string[];availabilityLabel:string};
export type MissionRow={
  player:DailyMissionCandidate;
  rankIndex:number;
  kind:'nba'|'field'|'goalkeeper';
  reason:string;
  quality:'limited'|'partial'|'history';
  safety:MissionSafety;
  threshold?:number;
  l10?:number;
  forecastMargin?:number;
  historicalHits?:number;
  historicalGames?:number;
};
export type MissionOptions={
  sport:Sport;window:MissionWindow;now:Date;nbaSchedule:ScheduleData;
  ownedOnly?:boolean;ownedIds?:ReadonlySet<string>;excludedIds?:ReadonlySet<string>;
  availabilityById?:Readonly<Record<string,AvailabilityReport|undefined>>;
  availabilityStatus?:'available'|'partial'|'unavailable';
  availabilityFetchedAt?:string;
};
export type MissionPoolReview={withoutFixture:number;injuredOrOut:number;missingL10:number;excluded:number;notOwned:number};
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const clamp=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));
const normScores=(p:Forecast)=>(p.recentScores??[]).filter((v):v is number=>finite(v)&&v>=0&&v<=500).slice(0,10);
const round=(n:number)=>Math.round(n*10)/10;
const AVAILABILITY_LABEL:Record<AvailabilityStatus,string>={
  out:'OUT',doubtful:'Doubtful',questionable:'Questionable',probable:'Probable',available:'Verfügbar',
};

/** Today/tomorrow use Berlin dates; next24 requires a verified NBA tipoff. */
export function dailyMissionHasFixture(p:DailyMissionCandidate,opts:MissionOptions):boolean{
  if(!Number.isFinite(opts.now.getTime())||p.hasGame===false)return false;
  if(opts.window==='today'||opts.window==='tomorrow'){
    if(!playsOnBerlinDay(p,opts.sport,offsetBerlinDay(opts.now,opts.window==='tomorrow'?1:0),opts.nbaSchedule))return false;
    if(opts.sport==='football'){
      // A verified individual kickoff can exclude already-started fixtures.
      if(p.nextGameTipoff){const t=new Date(p.nextGameTipoff).getTime();return Number.isFinite(t)&&t>=opts.now.getTime();}
      return true; // Football nextGame usually has a calendar date, not a verified kickoff.
    }
    if(opts.nbaSchedule.status!=='available')return false;
    const team=canonicalNbaTeam(p.team);
    if(!team)return false;
    const day=offsetBerlinDay(opts.now,opts.window==='tomorrow'?1:0);
    return opts.nbaSchedule.fixtures.some(f=>{
      if(!(canonicalNbaTeam(f.home)===team||canonicalNbaTeam(f.away)===team)||!f.tipoff)return false;
      const t=new Date(f.tipoff);
      return Number.isFinite(t.getTime())&&t.getTime()>=opts.now.getTime()&&offsetBerlinDay(t,0)===day;
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

/** A high 'risk' index is a screening heuristic, NOT a player injury probability. */
export function missionSafetyForPlayer(p:DailyMissionCandidate,opts:MissionOptions):MissionSafety{
  const notes:string[]=[];
  const report=opts.availabilityById?.[p.id];
  const fetched=opts.availabilityFetchedAt?Date.parse(opts.availabilityFetchedAt):NaN;
  const statusFresh=opts.availabilityStatus!=='unavailable'&&Number.isFinite(fetched)&&
    fetched<=opts.now.getTime()+5*60000&&opts.now.getTime()-fetched<=6*3600000;
  let risk=clamp((1-clamp(p.playProb,0,1))*64,0,64);
  if(p.injuries>0){risk=Math.max(risk,90);notes.push('Verletzungsflag im Sorare-Profil');}
  if(p.hasGame===false){risk=100;notes.push('Kein bestätigtes Spiel');}
  const spread=finite(p.variability)?clamp(p.variability/Math.max(15,p.expected),0,2):1;
  risk+=Math.min(12,spread*9);
  if((p.recentScores?.length??0)<5){risk+=7;notes.push('Wenige historische Einzelscores');}
  if(p.confidence==='gering'){risk+=7;notes.push('Begrenzte Prognosedaten');}
  let availabilityLabel='Status nicht bestätigt';
  if(report?.status==='out'){
    risk=100;notes.push('Als OUT gemeldet');availabilityLabel='OUT';
  } else if(statusFresh&&report){
    availabilityLabel=AVAILABILITY_LABEL[report.status];
    if(report.status==='doubtful'){risk+=47;notes.push('Doubtful: Einsatz sehr fraglich');}
    else if(report.status==='questionable'){risk+=27;notes.push('Questionable: Einsatz ungewiss');}
    else if(report.status==='probable'){risk+=5;notes.push('Probable ist keine Startgarantie');}
  }else{
    risk+=9;
    notes.push('Kein aktuell bestätigter Gesundheitsstatus');
  }
  if(opts.sport==='football'&&!p.nextGameTipoff){risk+=8;notes.push('Anstoßzeit nicht bestätigt – Teilnahmefrist prüfen');}
  if(p.playProb<0.65)notes.push('Niedrige modellierte Einsatzchance');
  const riskIndex=Math.round(clamp(risk,0,100));
  const level:MissionSafetyLevel=report?.status==='out'||p.injuries>0||p.playProb<0.35||
    (statusFresh&&report?.status==='doubtful')||riskIndex>=70?'high':
    riskIndex>=34||!statusFresh||!report?'caution':'ready';
  return {level,riskIndex,notes,availabilityLabel};
}

function nbaMissionRow(p:DailyMissionCandidate,safety:MissionSafety):MissionRow|null{
  // Screenshot: >= L10+7 AND >=20 manager points; both conditions must hold.
  // Never substitute a short-run average for Sorare's official L10.
  const l10=finite(p.averageL10)&&p.averageL10>=0?p.averageL10:null;
  if(l10===null)return null;
  const threshold=Math.max(20,l10+7);
  const history=normScores(p);
  const hits=history.filter(v=>v>=threshold).length;
  const spread=Math.max(6,finite(p.variability)?p.variability:8);
  const margin=p.expected-threshold;
  // Heuristic upside fit + history. Scores from the same player don't prove future success.
  const expectedFit=1/(1+Math.exp(-clamp(margin/spread,-12,12)*1.6));
  const pastFit=history.length>=5?(hits+1)/(history.length+2):null; // conservative smoothing
  const base=pastFit===null?expectedFit:0.70*expectedFit+0.30*pastFit;
  const dataPenalty=history.length>=8?1:history.length>=5?0.96:0.85;
  const index=100*base*clamp(p.playProb,0,1)*dataPenalty*(1-0.30*safety.riskIndex/100);
  const historyLabel=history.length?`${hits}/${history.length} letzte Scores erreichten die Marke`:'Keine Einzelscores verfügbar';
  return {player:p,rankIndex:clamp(index,0,100),kind:'nba',threshold:round(threshold),l10,
    forecastMargin:round(margin),historicalHits:hits,historicalGames:history.length,
    safety,quality:history.length>=5?'history':'limited',
    reason:`Ziel ≥ ${threshold.toFixed(1)} · Prognose bei Einsatz ${p.expected.toFixed(1)} · ${historyLabel}`};
}
function footballMissionRow(p:DailyMissionCandidate,safety:MissionSafety):MissionRow|null{
  const keeper=p.position==='GK';
  if(!keeper&&!['DEF','MID','FWD'].includes(p.position))return null;
  // The free feed contains no verified football action counts. Don't convert point
  // history into claimed goal / clean-sheet frequencies or invent xG/xA values.
  const score=finite(p.expected)?p.expected:0;
  const form=finite(p.last5Avg)?p.last5Avg:score;
  const formMix=0.70*score+0.30*form;
  const xg=finite(p.xg)&&p.xg>=0?clamp(p.xg,0,2):null;
  const xa=finite(p.xa)&&p.xa>=0?clamp(p.xa,0,2):null;
  const hasScout=!keeper&&(xg!==null||xa!==null);
  const scorerSignal=hasScout?0.5*(xg??0)+0.5*(xa??0):0;
  const base=clamp(formMix/80,0,1);
  const role=keeper?0.94:p.position==='FWD'?1.08:p.position==='MID'?1.02:0.88;
  const ranking=100*clamp(p.playProb,0,1)*(0.28+0.72*base)*role*
    (hasScout?1+0.12*clamp(scorerSignal,0,2):1)*(1-0.35*safety.riskIndex/100);
  return {player:p,rankIndex:clamp(ranking,0,100),kind:keeper?'goalkeeper':'field',safety,
    quality:hasScout?'partial':'limited',reason:hasScout
      ?`xG/xA-Signal vorhanden · ${keeper?'Clean Sheet / Elfmeter nicht separat messbar':'Tor / Assist / Torlinienklärung nicht separat messbar'}`
      :keeper?'Clean Sheet und gehaltener Elfmeter sind nicht separat messbar'
      :'Tore, Assists und Klärungen auf der Linie sind nicht separat messbar'};
}

/** Input is ONLY the currently loaded roster; there is no claim of global coverage. */
export function rankDailyMissionPlayers(pool:DailyMissionCandidate[],opts:MissionOptions):MissionRow[]{
  const rows:MissionRow[]=[];
  for(const p of pool){
    if(opts.excludedIds?.has(p.id)||opts.ownedOnly&&!opts.ownedIds?.has(p.id)||
      p.injuries>0||p.playProb<=0||opts.availabilityById?.[p.id]?.status==='out'||
      !dailyMissionHasFixture(p,opts)||!p.forecastSources?.length)continue;
    const safety=missionSafetyForPlayer(p,opts);
    const row=opts.sport==='nba'?nbaMissionRow(p,safety):footballMissionRow(p,safety);
    if(row)rows.push(row);
  }
  return rows.sort((a,b)=>b.rankIndex-a.rankIndex||b.player.playProb-a.player.playProb||a.player.id.localeCompare(b.player.id));
}

/** One click MUST use a confirmed owned card; an unowned Top Pick is informational only.
 * Never automatically choose an OUT / doubtful / very low-play candidate.
 */
export function pickOneClickDailyMission(rows:MissionRow[],ownedIds:ReadonlySet<string>,verifiedOwnership:boolean):
  {row:MissionRow|null;message:string}{
  if(!verifiedOwnership)return {row:null,message:'Bitte zuerst im Tab Sammlung den Kartenbesitz synchronisieren.'};
  const owned=rows.filter(row=>ownedIds.has(row.player.id));
  if(!owned.length)return {row:null,message:'Keine eigenen Karten mit passendem Spiel und vollständiger Missionsbewertung gefunden.'};
  const usable=owned.filter(row=>row.safety.level!=='high');
  if(!usable.length)return {row:null,message:'Alle verfügbaren eigenen Kandidaten haben ein hohes Einsatzrisiko. Kein automatischer Pick.'};
  const best=usable[0];
  return {row:best,message:best.safety.level==='ready'?'Bester geprüfter eigener Kandidat.':
    'Bester verfügbarer eigener Kandidat – Gesundheitsstatus oder Datenlage nicht vollständig bestätigt.'};
}

export function reviewDailyMissionPool(pool:DailyMissionCandidate[],opts:MissionOptions):MissionPoolReview{
  const review={withoutFixture:0,injuredOrOut:0,missingL10:0,excluded:0,notOwned:0};
  for(const p of pool){
    if(opts.excludedIds?.has(p.id)){review.excluded++;continue;}
    if(opts.ownedOnly&&!opts.ownedIds?.has(p.id)){review.notOwned++;continue;}
    if(!dailyMissionHasFixture(p,opts)){review.withoutFixture++;continue;}
    if(p.injuries>0||p.playProb<=0||opts.availabilityById?.[p.id]?.status==='out'){
      review.injuredOrOut++;continue;
    }
    if(opts.sport==='nba'&&(!finite(p.averageL10)||p.averageL10<0))review.missingL10++;
  }
  return review;
}

export function missionDescription(sport:Sport):string{
  return sport==='nba'
    ?'Daily Picker Classic: mindestens 20 Managerpunkte und mindestens 7 Punkte über dem offiziellen L10.'
    :'Entscheidende Aktion: Feldspieler – Tor, Assist oder Klärung auf der Linie; Torhüter – Elfmeter gehalten oder zu null gespielt.';
}

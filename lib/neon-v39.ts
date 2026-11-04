import type {Forecast,Sport} from './model';
import type {ScheduleData} from './gameweek-center';
import type {OptimizedLineup} from './arcade';
import type {MissionRow} from './daily-mission';
import type {TrackedPrediction} from './tracking';
import {canonicalNbaTeam} from './nba-fixture-mapping';
import {playsOnBerlinDay,offsetBerlinDay} from './builder-pool';

const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const round=(n:number)=>Math.round(n*10)/10;
export type GamedayPulse={playing:number;ownedPlaying:number;nextKickoff:string|null;unknownKickoff:number;label:string};
/** A verified fixture time is a kickoff / tipoff, NEVER an asserted Sorare mission deadline. */
export function gamedayPulse(players:Forecast[],sport:Sport,schedule:ScheduleData,ownedIds:ReadonlySet<string>,now:Date):GamedayPulse{
  const day=offsetBerlinDay(now,0);
  const eligible=players.filter(p=>p.hasGame!==false&&playsOnBerlinDay(p,sport,day,schedule));
  const upcoming=eligible.filter(p=>{
    if(sport==='nba')return schedule.status==='available';
    if(!p.nextGameTipoff)return true; // exact football time may be missing
    return Number.isFinite(Date.parse(p.nextGameTipoff))&&Date.parse(p.nextGameTipoff)>=now.getTime();
  });
  const times:number[]=[];
  if(sport==='nba'&&schedule.status==='available'){
    const teams=new Set(upcoming.map(p=>canonicalNbaTeam(p.team)).filter(Boolean));
    for(const f of schedule.fixtures){
      const time=Date.parse(f.tipoff??'');
      if(finite(time)&&time>=now.getTime()&&time<now.getTime()+48*3600000&&
        (teams.has(canonicalNbaTeam(f.home))||teams.has(canonicalNbaTeam(f.away))))times.push(time);
    }
  }else if(sport==='football')for(const p of upcoming){
    const time=Date.parse(p.nextGameTipoff??'');
    if(finite(time)&&time>=now.getTime()&&time<now.getTime()+48*3600000)times.push(time);
  }
  const next=times.length?new Date(Math.min(...times)).toISOString():null;
  return {playing:upcoming.length,ownedPlaying:upcoming.filter(p=>ownedIds.has(p.id)).length,
    nextKickoff:next,unknownKickoff:sport==='football'?upcoming.filter(p=>!p.nextGameTipoff).length:0,
    label:day};
}
export type BreakoutInsight={playerId:string;name:string;signal:number;label:string;why:string};
/** NBA breakout discovery is measured against the ACTUAL mission threshold; index != calibrated chance. */
export function nbaBreakoutFinder(rows:MissionRow[],limit=3):BreakoutInsight[]{
  return rows.filter(r=>r.kind==='nba'&&finite(r.threshold)&&r.safety.level!=='high')
    .map(r=>{
      const p=r.player, margin=r.forecastMargin??p.expected-(r.threshold??0);
      const upside=Math.max(0,p.ceiling-(r.threshold??0));
      const hits=r.historicalGames??0;
      const samples=hits>=5?Math.min(1,(r.historicalHits??0)/hits):0;
      const signal=Math.max(0,Math.min(100,48+margin*1.2+upside*.4+samples*16-r.safety.riskIndex*.38));
      return {playerId:p.id,name:p.name,signal:round(signal),label:`Ziel ${round(r.threshold??0)} · Prognose ${round(p.expected)}`,
        why:`${margin>=0?'+':''}${round(margin)} Pkt. zur Zielmarke · Ceiling ${round(p.ceiling)} · ${hits?`${r.historicalHits}/${hits} historische Treffer`:'wenige Einzelscores'}`};
    }).sort((a,b)=>b.signal-a.signal||a.name.localeCompare(b.name,'de')).slice(0,Math.max(1,Math.min(10,limit)));
}
export type ActionInsight={playerId:string;name:string;role:string;signal:number;why:string};
/** No invented goal / assist / clean-sheet rates: only a transparent scouting index. */
export function footballActionHunter(rows:MissionRow[],limit=3):ActionInsight[]{
  return rows.filter(r=>r.kind==='field'||r.kind==='goalkeeper')
    .map(r=>{
      const p=r.player,keeper=r.kind==='goalkeeper',xg=finite(p.xg)&&p.xg>=0?p.xg:null,
        xa=finite(p.xa)&&p.xa>=0?p.xa:null;
      const scout=!keeper&&(xg!==null||xa!==null);
      const signal=round(r.rankIndex+(scout?Math.min(10,(xg??0)*6+(xa??0)*5):0));
      return {playerId:p.id,name:p.name,role:keeper?'Torwart':'Feldspieler',signal,
        why:keeper?`Clean-Sheet-Kandidat · Einsatzmodell ${Math.round(p.playProb*100)} % · echte Aktionsdaten fehlen`
          :scout?`xG ${xg===null?'—':round(xg)} · xA ${xa===null?'—':round(xa)} · keine bestätigte Aktionsquote`
          :`Form / Einsatz / Gegner als Näherung · keine Tor- oder Assist-Einzelstatistik`};
    }).sort((a,b)=>b.signal-a.signal||a.name.localeCompare(b.name,'de')).slice(0,Math.max(1,Math.min(10,limit)));
}

export type PortfolioPulse={teams:number;averageScore:number;highestScore:number;differentPlayers:number;maxReuse:number;averageShared:number;warning:string|null};
export function portfolioPulse(lines:OptimizedLineup[]):PortfolioPulse{
  if(!lines.length)return {teams:0,averageScore:0,highestScore:0,differentPlayers:0,maxReuse:0,averageShared:0,warning:null};
  const usage=new Map<string,number>(),teamSets=lines.map(l=>new Set(l.picks.map(p=>p.player.id)));
  for(const s of teamSets)for(const id of s)usage.set(id,(usage.get(id)??0)+1);
  let shared=0,pairs=0;
  for(let i=0;i<teamSets.length;i++)for(let j=i+1;j<teamSets.length;j++){
    shared+=[...teamSets[i]].filter(id=>teamSets[j].has(id)).length;pairs++;
  }
  const maxReuse=usage.size?Math.max(...usage.values()):0;
  return {teams:lines.length,averageScore:round(lines.reduce((sum,l)=>sum+l.projectedScore,0)/lines.length),
    highestScore:round(Math.max(...lines.map(l=>l.projectedScore))),differentPlayers:usage.size,
    maxReuse,averageShared:round(pairs?shared/pairs:0),
    warning:maxReuse>=lines.length&&lines.length>1?'Mindestens eine Karte kommt in allen Varianten vor. Kartennutzung prüfen.':null};
}
/** Selects legal PRECOMPUTED lineups only. Does not alter any player, score or Sorare limit.
 * Strict max-uses is respected; a missing feasible line is never replaced by an invalid one.
 */
export function diversifyPortfolio(lines:OptimizedLineup[],maxUses:number,limit=5,minimumScoreRatio=.9):OptimizedLineup[]{
  const sorted=lines.filter(l=>l.picks.length===5&&finite(l.projectedScore)&&l.projectedScore>=0)
    .sort((a,b)=>b.projectedScore-a.projectedScore);
  if(!sorted.length)return [];
  const highest=sorted[0].projectedScore,used=new Map<string,number>(),keys=new Set<string>(),out:OptimizedLineup[]=[];
  while(out.length<Math.max(1,Math.min(5,limit))){
    const feasible=sorted.filter(l=>l.projectedScore+1e-9>=highest*minimumScoreRatio &&
      !keys.has(l.picks.map(p=>p.player.id).sort().join('|')) &&
      l.picks.every(p=>(used.get(p.player.id)??0)<Math.max(1,maxUses)));
    if(!feasible.length)break;
    const chosen=feasible.sort((a,b)=>{
      const score=(l:OptimizedLineup)=>l.projectedScore-
        l.picks.reduce((s,p)=>s+(used.get(p.player.id)??0)*Math.max(5,highest*.035),0);
      return score(b)-score(a)||b.projectedScore-a.projectedScore;
    })[0];
    out.push(chosen);keys.add(chosen.picks.map(p=>p.player.id).sort().join('|'));
    for(const p of chosen.picks)used.set(p.player.id,(used.get(p.player.id)??0)+1);
  }
  return out;
}

export type RealityPulse={matched:number;mae:number|null;bias:number|null;source:'official';message:string};
/** Only FINAL official results and predictions frozen before verified kickoff enter the evaluation. */
export function predictionRealityCheck(items:TrackedPrediction[]):RealityPulse{
  const done=items.filter(r=>r.actualSource==='sorare'&&finite(r.actual)&&finite(r.predicted)&&
    !!r.fixtureTipoff&&finite(Date.parse(r.fixtureTipoff))&&
    finite(Date.parse(r.savedAt))&&Date.parse(r.savedAt)<Date.parse(r.fixtureTipoff));
  if(!done.length)return {matched:0,mae:null,bias:null,source:'official',message:'Noch keine verifizierten Vor-Spiel-Prognosen mit FINAL-Scores.'};
  const errors=done.map(r=>r.predicted-(r.actual as number));
  const mae=round(errors.reduce((s,e)=>s+Math.abs(e),0)/errors.length);
  const bias=round(errors.reduce((s,e)=>s+e,0)/errors.length);
  return {matched:done.length,mae,bias,source:'official',
    message:done.length<20?'Vorläufig: für belastbare Aussagen mindestens 20 bestätigte Paare sammeln.':'Nur bestätigte Vor-Spiel-Paare; keine automatische Anpassung der Prognose-Engine.'};
}

export type AdvisorAdvice={headline:string;detail:string};
export function neonSmartAdvisor(players:Forecast[],ownedIds:ReadonlySet<string>,sport:Sport):AdvisorAdvice{
  const available=players.filter(p=>ownedIds.has(p.id)&&p.hasGame!==false&&p.injuries===0&&p.playProb>=.6&&p.weighted>0&&p.forecastSources.length);
  const strong=available.sort((a,b)=>b.weighted-a.weighted)[0];
  if(!strong)return {headline:'Noch kein sicher bewertbarer eigener Spieler',detail:'Sammlung synchronisieren und Spieltag prüfen. Unbekannter Gesundheitsstatus ist keine Einsatzgarantie.'};
  const reason=sport==='nba'?`Forecast ${round(strong.weighted)} · L10 ${finite(strong.averageL10)?round(strong.averageL10):'unbekannt'}`
    :`Forecast ${round(strong.weighted)} · Form ${strong.formDirection}`;
  return {headline:`Scouting-Tipp: ${strong.name}`,
    detail:`${reason} · modellierte Einsatzchance ${Math.round(strong.playProb*100)} %. Bevorzugter Kandidat im geladenen, bestätigten Besitz; kein bestätigter Start.`};
}

import type {CardInput} from './arcade';
import type {ManualSelection} from './manual-lineup';
import {evaluateManualLineup,normalizeManualSelection} from './manual-lineup';
import {smartFillEmptySlots} from './builder-neon';
import type {Strategy} from './arcade';
import type {BuilderV30Settings} from './builder-v30';

export type RebuildResult={selection:ManualSelection;changed:number;reason:string|null;replaced:string[]};
/** Explicit, reversible repair only; never removes a locked player, never changes a healthy pick.
 * Failed completion does not destroy the original team.
 */
export function oneClickRebuild(args:{selection:ManualSelection;cards:CardInput[];sport:Sport;
  lockedIds?:string[];blockedIds?:string[];allowedIds?:string[];strategy?:Strategy;
  advancedSettings?:BuilderV30Settings;targetScore?:number|null;
}):RebuildResult{
  const original=normalizeManualSelection(args.selection),byId=new Map(args.cards.map(c=>[c.player.id,c]));
  const blocked=new Set(args.blockedIds??[]),locked=new Set(args.lockedIds??[]);
  const unsafe=(id:string)=>{
    const card=byId.get(id),p=card?.player;
    return !card||!p||blocked.has(id)||p.hasGame===false||p.injuries>0||p.playProb<.35;
  };
  const lockedUnsafe=original.filter((id):id is string=>!!id&&locked.has(id)&&unsafe(id));
  if(lockedUnsafe.length)return {selection:original,changed:0,replaced:[],reason:'Fixierter Spieler ist verletzt, OUT oder ohne Spiel. Erst Fixierung prüfen; nichts verändert.'};
  const removed=original.filter((id):id is string=>!!id&&!locked.has(id)&&unsafe(id));
  const cleaned=original.map(id=>id&&!locked.has(id)&&unsafe(id)?null:id);
  if(cleaned.every(Boolean))return {selection:original,changed:0,replaced:[],reason:'Kein freier oder eindeutig problematischer Slot. Team bleibt unverändert.'};
  const available=args.allowedIds?new Set(args.allowedIds):null;
  const chosenAllowed=args.cards.filter(c=>(!available||available.has(c.player.id))&&!unsafe(c.player.id))
    .map(c=>c.player.id);
  const filled=smartFillEmptySlots(cleaned,args.cards,args.sport,{
    allowedIds:chosenAllowed,excludedIds:[...blocked],strategy:args.strategy??'balanced',
    advancedSettings:args.advancedSettings,targetScore:args.targetScore,
  });
  if(filled.reason)return {selection:original,changed:0,replaced:[],reason:filled.reason};
  const result=evaluateManualLineup(filled.selection,args.cards,args.sport,args.targetScore);
  if(!result.valid)return {selection:original,changed:0,replaced:[],reason:'Neuaufbau erfüllt die Positions- oder NBA-Sterneregeln nicht.'};
  const changed=filled.selection.filter((id,i)=>id!==original[i]).length;
  return {selection:filled.selection,changed,replaced:removed,reason:null};
}

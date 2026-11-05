/**
 * MarkErras Prediction Engine 3.0 – transparent, conditional score distribution.
 * This is an uncalibrated estimate, NOT SoProb's proprietary model. Inputs come
 * from the existing Sorare forecast and optional, explicitly supplied scouting.
 * No inferred injuries, confirmed starters, historical game minutes or xG.
 *
 * PP Raw and Q80 Raw are BOTH conditional on a player appearing. Risk-adjusted
 * PP is separate. The card bonus is applied to both raw values exactly once.
 * There are no external requests and each calculation is bounded O(10).
 */
import type {Sport} from './model';
import type {ScoutedForecast} from './matchups';
import {buildPredictionV2,robustScoreSpread,type PredictionV2} from './prediction-engine-v2';
import {pointsAtLeast} from './forecast-v18';

export type PredictionV3={
  version:'3.0.0';applicable:boolean;sport:Sport;
  ppRaw:number|null;q80Raw:number|null;q20Raw:number|null;
  riskAdjustedPP:number|null;playProbability:number;
  conditionalSd:number|null;sampleSize:number;
  p70Conditional:number|null;p80Conditional:number|null;
  p70IncludingDnp:number|null;p80IncludingDnp:number|null;
  quality:'hoch'|'mittel'|'gering';
  source:'Sorare-Prognose + Sorare-Scores + optionale Scoutingdaten';
  reasons:string[];
};
export type PredictionV3Card={pp:number|null;q80:number|null;q20:number|null;bonusPercent:number};
const cap=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
// Quantile of a standard normal; avoids 100 CDF iterations per player render.
const NORMAL_Q80=0.8416212335729143;

export function buildPredictionV3(p:ScoutedForecast,sport:Sport,v2:PredictionV2=buildPredictionV2(p,sport)):PredictionV3{
  const applicable=v2.applicable&&finite(v2.expected)&&v2.expected>0;
  const playProbability=cap(finite(p.playProb)?p.playProb:0,0,1);
  const reasons:string[]=[];
  if(!applicable){
    reasons.push('Keine verwertbare Scorebasis – keine PP-/Q80-Prognose.');
    return {version:'3.0.0',applicable:false,sport,ppRaw:null,q80Raw:null,q20Raw:null,
      riskAdjustedPP:null,playProbability,conditionalSd:null,sampleSize:v2.sampleSize,
      p70Conditional:null,p80Conditional:null,p70IncludingDnp:null,p80IncludingDnp:null,
      quality:'gering',source:'Sorare-Prognose + Sorare-Scores + optionale Scoutingdaten',reasons};
  }
  const ppRaw=v2.expected;
  // Robust observed dispersion when available; shrink toward the V2 spread to
  // avoid declaring a nearly deterministic future on only a handful of games.
  const observations=(p.recentScores??[]).filter((s):s is number=>finite(s)&&s>=0&&s<=200).slice(0,10);
  const sampleSd=robustScoreSpread(observations);
  const fraction=observations.length>=8?.55:observations.length>=5?.38:observations.length>=2?.20:0;
  const adjustedObservedSd=sampleSd===null?v2.conditionalSd:sampleSd*
    (1+v2.matchupPct/100)*(1+v2.minutesPct/100);
  const sd=cap((1-fraction)*v2.conditionalSd+fraction*adjustedObservedSd,3,100);
  // One single conditional distribution generates BOTH Q20 and Q80. No DNP
  // mass is mixed in: the separate play probability belongs to risk ranking.
  const q20Raw=Math.max(0,ppRaw-NORMAL_Q80*sd);
  const q80Raw=ppRaw+NORMAL_Q80*sd;
  const p70Conditional=pointsAtLeast(ppRaw,sd,1,70);
  const p80Conditional=pointsAtLeast(ppRaw,sd,1,80);
  if(observations.length<5)reasons.push('Wenig Einzelscores; Q80 ist besonders unsicher.');
  if(p.opponentRating===null)reasons.push('Keine bewertete Gegnerstärke; neutraler Gegnerfaktor.');
  if(p.expectedMinutes===null||p.typicalMinutes===null)reasons.push('Keine verifizierte Minutenprognose; neutraler Minutenfaktor.');
  if(sport==='football')reasons.push('Keine gesondert kalibrierten Tor-/Assist-/AA-Modelle vorhanden.');
  if(sport==='nba')reasons.push('Q80 gilt für ein einzelnes Spiel, nicht automatisch das Maximum mehrerer GW-Spiele.');
  reasons.push('Einsatzmodell wird NUR für risikoangepasste Punkte berücksichtigt; nicht für PP/Q80.');
  reasons.push('Q80 ist ein geschätztes 80. Perzentil, noch nicht anhand offizieller Scores kalibriert.');
  return {version:'3.0.0',applicable,sport,ppRaw,q80Raw,q20Raw,
    riskAdjustedPP:ppRaw*playProbability,playProbability,
    conditionalSd:sd,sampleSize:observations.length,
    p70Conditional,p80Conditional,
    p70IncludingDnp:p70Conditional===null?null:p70Conditional*playProbability,
    p80IncludingDnp:p80Conditional===null?null:p80Conditional*playProbability,
    quality:v2.quality,source:'Sorare-Prognose + Sorare-Scores + optionale Scoutingdaten',reasons};
}

/** Bonus is only applied after the raw score distribution; no double counting. */
export function withPredictionV3Bonus(p:PredictionV3,rawBonus:unknown):PredictionV3Card{
  const bonus=finite(rawBonus)?cap(rawBonus,0,50):0;
  const factor=1+bonus/100;
  return {pp:p.ppRaw===null?null:p.ppRaw*factor,q80:p.q80Raw===null?null:p.q80Raw*factor,
    q20:p.q20Raw===null?null:p.q20Raw*factor,bonusPercent:bonus};
}

/** Prospective, official-only validation. Predictions MUST have been frozen before kickoff. */
export type PredictionV3EvaluationRow={
  actual:number|null;actualSource?:string;fixtureTipoff?:string;savedAt:string;appeared?:boolean;
  engineV3PP?:number;engineV3Q80?:number;
};
export function evaluatePredictionV3(rows:readonly PredictionV3EvaluationRow[]){
  // Conditional PP/Q80 can only be evaluated when the official data confirms
  // the player actually appeared. A 0 score alone does not prove DNP.
  const valid=rows.filter(r=>r.appeared===true&&r.actualSource==='sorare'&&finite(r.actual)&&r.actual>=0&&r.actual<=500&&
    finite(r.engineV3PP)&&r.engineV3PP>=0&&r.engineV3PP<=500&&
    finite(r.engineV3Q80)&&r.engineV3Q80>=0&&r.engineV3Q80<=500&&
    !!r.fixtureTipoff&&Number.isFinite(Date.parse(r.fixtureTipoff))&&Number.isFinite(Date.parse(r.savedAt))&&
    Date.parse(r.fixtureTipoff)>Date.parse(r.savedAt));
  const count=valid.length;
  if(!count)return {count:0,ppMae:null as number|null,q80Coverage:null as number|null};
  const round=(n:number)=>Math.round(n*1000)/1000;
  return {count,ppMae:round(valid.reduce((s,r)=>s+Math.abs(r.engineV3PP!-r.actual!),0)/count),
    q80Coverage:round(valid.filter(r=>r.actual!<=r.engineV3Q80!).length/count)};
}

/** Applies ONLY an independently validated per-sport calibration. No rerender API calls. */
export function withV44Calibration(p:PredictionV3,model:{sport:Sport;ppOffset:number;q80Offset:number}|null):PredictionV3{
  if(!p.applicable||!model||model.sport!==p.sport||!finite(p.ppRaw)||!finite(p.q80Raw)||
     !finite(model.ppOffset)||!finite(model.q80Offset))return p;
  const ppRaw=cap(p.ppRaw+model.ppOffset,0,500),q80Raw=cap(Math.max(ppRaw,p.q80Raw+model.q80Offset),0,500);
  const q20Raw=p.q20Raw===null?null:cap(p.q20Raw+model.ppOffset,0,500);
  const sd=p.conditionalSd;
  const p70Conditional=sd!==null?pointsAtLeast(ppRaw,sd,1,70):null;
  const p80Conditional=sd!==null?pointsAtLeast(ppRaw,sd,1,80):null;
  return {...p,ppRaw,q80Raw,q20Raw,riskAdjustedPP:ppRaw*p.playProbability,
    p70Conditional,p80Conditional,p70IncludingDnp:p70Conditional===null?null:p70Conditional*p.playProbability,
    p80IncludingDnp:p80Conditional===null?null:p80Conditional*p.playProbability,
    reasons:[...p.reasons,`V4.4: ${p.sport.toUpperCase()}-PP/Q80 durch getrennt validierten Modell-Offset kalibriert.`]};
}

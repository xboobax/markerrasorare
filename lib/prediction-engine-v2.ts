/**
 * Prediction Engine 2.0: auditable, conservative challenger for NBA + football.
 * No fabricated statistics, probabilities or inferred opponent/minute data.
 * enrichForecast already includes matchup/minutes adjustment in expected and
 * variability; apply that factor to raw historical trend only, ONCE.
 * Form is captured in recent observations, never added twice.
 */
import type {Sport} from './model';
import type {ScoutedForecast} from './matchups';
import {mixtureQuantile,robustRecentMean} from './forecast-v18';

export type PredictionV2={
  version:'2.0.0';applicable:boolean;expected:number;weighted:number;floor:number;ceiling:number;
  conditionalSd:number;unconditionalP10:number;unconditionalP90:number;
  baselineWeighted:number;changePercent:number;sampleSize:number;
  quality:'hoch'|'mittel'|'gering';riskIndex:number;riskLabel:'niedrig'|'mittel'|'hoch';
  recentMean:number|null;recentWeight:number;matchupPct:number;minutesPct:number;
  formChangePct:number|null;reasons:string[];
};
const cap=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const avg=(a:number[])=>a.reduce((s,n)=>s+n,0)/a.length;
const median=(a:number[])=>{const v=[...a].sort((x,y)=>x-y);return (v[Math.floor((v.length-1)/2)]+v[Math.floor(v.length/2)])/2};

/** Robust spread: trim extreme results when ≥5 observations exist. */
export function robustScoreSpread(values:readonly number[]):number|null {
  const scores=values.filter(n=>finite(n)&&n>=0&&n<=200).slice(0,10);
  if(scores.length<2)return null;
  const center=median(scores),mad=median(scores.map(n=>Math.abs(n-center)));
  const width=scores.length>=5?Math.max(10,2.75*1.4826*mad,center*.22):Infinity;
  const capped=scores.map(n=>cap(n,Math.max(0,center-width),center+width));
  const mu=avg(capped);
  return Math.sqrt(capped.reduce((s,n)=>s+(n-mu)**2,0)/(capped.length-1));
}

export function buildPredictionV2(p:ScoutedForecast,sport:Sport):PredictionV2 {
  const baseline=finite(p.expected)?Math.max(0,p.expected):0;
  const playProb=cap(finite(p.playProb)?p.playProb:0,0,1);
  const scores=(p.recentScores??[]).filter(n=>finite(n)&&n>=0&&n<=200).slice(0,10);
  const sampleSize=scores.length;
  const applicable=p.forecastSources.length>0&&baseline>0;
  const quality:PredictionV2['quality']=sampleSize>=8&&finite(p.proj)?'hoch':
    sampleSize>=4||(applicable&&(finite(p.proj)||finite(p.avg)))?'mittel':'gering';
  const matchupPct=finite(p.matchupAdjustmentPct)?cap(p.matchupAdjustmentPct,-20,20):0;
  const minutesPct=finite(p.minutesAdjustmentPct)?cap(p.minutesAdjustmentPct,-20,20):0;
  const scoutingFactor=(1+matchupPct/100)*(1+minutesPct/100);
  const recentMean=robustRecentMean(scores);
  const recentWeight=applicable&&recentMean!==null&&sampleSize>=2?
    (sport==='nba'?.36:.30)*cap(sampleSize/8,0,1):0;
  const recentAdjusted=recentMean===null?baseline:recentMean*scoutingFactor;
  // Recency-weighted recentMean already captures form; no separate L5 uplift.
  const rawExpected=applicable?baseline*(1-recentWeight)+recentAdjusted*recentWeight:0;
  const expected=applicable?cap(rawExpected,baseline*.86,baseline*1.14):0;
  const spread=robustScoreSpread(scores);
  const minSd=expected*(sampleSize>=8?.17:sampleSize>=4?.24:.32);
  const sampleSd=spread===null?0:spread*scoutingFactor*.85;
  const conditionalSd=applicable?cap(Math.max(3,minSd,sampleSd,p.variability*.75),3,125):0;
  const floor=applicable?Math.max(0,expected-1.28*conditionalSd):0;
  const ceiling=applicable?expected+1.28*conditionalSd:0;
  const weighted=expected*playProb;
  const volatility=applicable?cap(conditionalSd/Math.max(15,expected),0,1):1;
  const riskIndex=Math.round(cap((1-playProb)*53+volatility*28+
    (quality==='gering'?16:quality==='mittel'?7:0)+(p.hasGame===null?7:0)+
    (playProb===0?24:0)+(p.hasGame===false?12:0),0,100));
  const riskLabel:PredictionV2['riskLabel']=riskIndex<30?'niedrig':riskIndex<55?'mittel':'hoch';
  const reasons:string[]=[];
  if(!applicable)reasons.push('Keine verwertbare Scorebasis · keine V2.0-Prognose');
  else if(recentWeight>0)reasons.push(`${sampleSize} echte Einzelscores · robuster Formtrend mit ${Math.round(recentWeight*100)} % Gewicht`);
  else reasons.push('Zu wenige Einzelscores · Basisprognose bleibt maßgeblich');
  if(p.formChangePct!==null&&finite(p.formChangePct))reasons.push(`L5/L10-Trend ${p.formChangePct>0?'+':''}${p.formChangePct.toFixed(1)} % · kein zusätzlicher Trendbonus`);
  if(p.opponentRating!==null)reasons.push(`Gegner ${matchupPct>0?'+':''}${matchupPct.toFixed(1)} % · bereits einmal berücksichtigt`);
  else reasons.push('Gegner nicht bewertet · neutral');
  if(p.expectedMinutes!==null&&p.typicalMinutes!==null)reasons.push(`Manuelle Minuten ${minutesPct>0?'+':''}${minutesPct.toFixed(1)} % · bereits einmal berücksichtigt`);
  else reasons.push('Keine vollständigen Minutenwerte · keine erfundenen Minuten');
  if(playProb<.7)reasons.push('Erhöhtes Einsatzrisiko senkt erwartete Punkte');
  if(p.hasGame===false)reasons.push('Kein Spiel im gewählten Zeitraum');
  else if(p.hasGame===null)reasons.push('Spieltermin nicht bestätigt');
  if(sampleSize<5)reasons.push('Kurze Historie · breites Unsicherheitsband, keine behauptete Präzision');
  return {version:'2.0.0',applicable,expected,weighted,floor,ceiling,conditionalSd,
    unconditionalP10:applicable?mixtureQuantile(expected,conditionalSd,playProb,.1):0,
    unconditionalP90:applicable?mixtureQuantile(expected,conditionalSd,playProb,.9):0,
    baselineWeighted:applicable?baseline*playProb:0,
    changePercent:applicable&&baseline>0?(expected/baseline-1)*100:0,
    sampleSize,quality,riskIndex,riskLabel,recentMean,recentWeight,matchupPct,minutesPct,
    formChangePct:p.formChangePct,reasons};
}

/** Prospective official-only comparison; never recompute old forecasts. */
export type EngineV2Backtest={count:number;days:number;v18Mae:number|null;v2Mae:number|null;deltaMae:number|null};
export type V2SnapshotRow={
  actual:number|null;actualSource?:string;actualGameDate?:string;savedAt:string;
  advancedPredicted?:number;engineV2Predicted?:number;
};
export function backtestPredictionV2(rows:readonly V2SnapshotRow[]):EngineV2Backtest {
  const valid=rows.filter(r=>r.actualSource==='sorare'&&finite(r.actual)&&r.actual>=0&&r.actual<=500&&
    finite(r.advancedPredicted)&&r.advancedPredicted>=0&&r.advancedPredicted<=500&&
    finite(r.engineV2Predicted)&&r.engineV2Predicted>=0&&r.engineV2Predicted<=500&&
    typeof r.actualGameDate==='string'&&Number.isFinite(Date.parse(r.actualGameDate))&&
    Number.isFinite(Date.parse(r.savedAt))&&Date.parse(r.actualGameDate)>Date.parse(r.savedAt));
  if(!valid.length)return {count:0,days:0,v18Mae:null,v2Mae:null,deltaMae:null};
  const v18=valid.reduce((s,r)=>s+Math.abs(r.advancedPredicted!-r.actual!),0)/valid.length;
  const v2=valid.reduce((s,r)=>s+Math.abs(r.engineV2Predicted!-r.actual!),0)/valid.length;
  const round=(n:number)=>Math.round(n*10)/10;
  return {count:valid.length,days:new Set(valid.map(r=>r.actualGameDate!.slice(0,10))).size,
    v18Mae:round(v18),v2Mae:round(v2),deltaMae:round(v18-v2)};
}

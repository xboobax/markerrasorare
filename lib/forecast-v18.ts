import type {Forecast, Sport} from "./model";

/**
 * Model V1.8 is a deliberately conservative, auditable challenger model.
 * It needs NO new Sorare fields; it never requests data from the network.
 * Raw scores are most-recent-first as delivered by the existing adapter.
 * Performance improvement is not claimed until prospective backtesting proves it.
 */
export type ForecastV18 = {
  version: "1.8.0";
  applicable: boolean;
  baselineWeighted: number;
  advancedWeighted: number;
  baselineExpected: number;
  advancedExpected: number;
  conditionalLow: number;
  conditionalHigh: number;
  unconditionalP10: number;
  unconditionalP90: number;
  conditionalSd: number;
  changePercent: number;
  recentRobust: number | null;
  historyCount: number;
  quality: "gut" | "eingeschränkt" | "sehr gering";
  reasons: string[];
};

type WithScouting = Forecast & {matchupAdjustmentPct?: number;minutesAdjustmentPct?: number};
const cap = (n:number,low:number,high:number) => Math.max(low,Math.min(high,n));
const avg = (arr:number[]) => arr.reduce((a,b)=>a+b,0)/arr.length;
const median = (arr:number[]) => { const v=[...arr].sort((a,b)=>a-b);return (v[Math.floor((v.length-1)/2)]+v[Math.floor(v.length/2)])/2; };

/** Winsorize anomalous games only when the sample is large enough. */
export function robustRecentMean(raw: number[]): number | null {
  const scores=raw.filter(v=>typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=200).slice(0,15);
  if(!scores.length)return null;
  const center=median(scores);
  const mad=median(scores.map(s=>Math.abs(s-center)));
  const width=scores.length>=5?Math.max(10,2.75*1.4826*mad,center*.22):Infinity;
  const weighted=scores.map((score,i)=>({score:cap(score,Math.max(0,center-width),center+width),weight:Math.pow(.84,i)}));
  return weighted.reduce((s,r)=>s+r.score*r.weight,0)/weighted.reduce((s,r)=>s+r.weight,0);
}

function normalCdf(z:number):number {
  const t=1/(1+.2316419*Math.abs(z));
  const pdf=Math.exp(-.5*z*z)/Math.sqrt(2*Math.PI);
  const q=pdf*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
  return z>=0?1-q:q;
}

/** Distribution includes an explicit probability mass at zero for non-appearance. */
export function pointsAtLeast(expected:number,sd:number,playProb:number,threshold:number):number|null {
  if (![expected,sd,playProb,threshold].every(Number.isFinite)||threshold<=0)return null;
  const p=cap(playProb,0,1);
  if (sd<=0)return p*(expected>=threshold?1:0);
  return cap(p*(1-normalCdf((threshold-expected)/sd)),0,1);
}

/** 10th/90th percentile of a participation + normal conditional mixture. */
export function mixtureQuantile(expected:number,sd:number,playProb:number,q:number):number {
  const p=cap(playProb,0,1);
  if (!p||q<=1-p)return 0;
  if(sd<=0)return Math.max(0,expected);
  const conditional=cap((q-(1-p))/p,.000001,.999999);
  let low=Math.max(0,expected-9*sd),high=Math.max(expected+9*sd,1);
  for(let i=0;i<50;i++){
    const mid=(low+high)/2;
    if(normalCdf((mid-expected)/sd)<conditional)low=mid;else high=mid;
  }
  return (low+high)/2;
}

export function buildForecastV18(base:WithScouting,sport:Sport):ForecastV18 {
  const baselineExpected=Number.isFinite(base.expected)?Math.max(0,base.expected):0;
  const baselineWeighted=Number.isFinite(base.weighted)?Math.max(0,base.weighted):0;
  const scores=(base.recentScores??[]).filter(s=>Number.isFinite(s)&&s>=0&&s<=200).slice(0,15);
  const recentRobust=robustRecentMean(scores);
  const hasOtherData=[base.proj,base.avg,base.averageL5,base.averageL10].some(x=>x!==null&&typeof x==="number"&&Number.isFinite(x));
  const applicable=baselineExpected>0&&(hasOtherData||scores.length>0);
  const reasons:string[]=[];
  const factor=(1+cap(base.matchupAdjustmentPct??0,-20,20)/100)*(1+cap(base.minutesAdjustmentPct??0,-20,20)/100);
  let advancedExpected=baselineExpected;
  if(recentRobust!==null&&scores.length>=2&&applicable){
    const sportWeight=sport==="nba"?.43:.33;
    const observedFraction=cap(scores.length/8,0,1);
    const candidate=recentRobust*factor;
    // Shrink short samples towards the stable V1.7 baseline.
    const blended=baselineExpected*(1-sportWeight*observedFraction)+candidate*sportWeight*observedFraction;
    // Prevent accidental overreactions even after a small hot/cold streak.
    advancedExpected=cap(blended,baselineExpected*.85,baselineExpected*1.15);
    reasons.push(`${scores.length} reale Einzelscores · robust gewichteter Trend`);
  } else if (applicable&&base.averageL5!==null&&base.averageL10!==null&&
             Number.isFinite(base.averageL5)&&Number.isFinite(base.averageL10)){
    const difference=(base.averageL5??0)-(base.averageL10??0);
    const gentle=baselineExpected+cap(difference*factor*.12,-baselineExpected*.08,baselineExpected*.08);
    advancedExpected=cap(gentle,baselineExpected*.92,baselineExpected*1.08);
    reasons.push("L5/L10-Trend ohne einzelne Spielscores · vorsichtig gewichtet");
  } else if(applicable){
    reasons.push("Kaum historische Einzelscores · bisherige Schätzung bleibt maßgeblich");
  } else {
    reasons.push("Keine belastbare Scoregrundlage · keine V1.8-Vorhersage");
  }
  if(base.playProb<.55)reasons.push("Erhöhtes Nicht-Einsatz-Risiko ist berücksichtigt");
  if(scores.length<5)reasons.push("Kleine Stichprobe · keine behauptete Präzision");
  const variance=scores.length>=2?
    scores.reduce((sum,s)=>sum+Math.pow(s-avg(scores),2),0)/(scores.length-1):0;
  const observedSd=Math.sqrt(variance)*factor;
  // Avoid spuriously tight bands for small or uniform samples.
  const minSd=advancedExpected*(scores.length>=8?.18:.27);
  const conditionalSd=applicable?cap(Math.max(observedSd*.75,minSd,base.variability*.70,3),3,125):0;
  const playProb=cap(base.playProb,0,1);
  const advancedWeighted=applicable?advancedExpected*playProb:0;
  const conditionalLow=applicable?Math.max(0,advancedExpected-1.28*conditionalSd):0;
  const conditionalHigh=applicable?advancedExpected+1.28*conditionalSd:0;
  const quality=scores.length>=8&&hasOtherData?"gut":scores.length>=4||hasOtherData?"eingeschränkt":"sehr gering";
  return {version:"1.8.0",applicable,baselineWeighted,advancedWeighted,
    baselineExpected,advancedExpected,conditionalLow,conditionalHigh,conditionalSd,
    unconditionalP10:applicable?mixtureQuantile(advancedExpected,conditionalSd,playProb,.1):0,
    unconditionalP90:applicable?mixtureQuantile(advancedExpected,conditionalSd,playProb,.9):0,
    changePercent:baselineWeighted>0?(advancedWeighted/baselineWeighted-1)*100:0,
    recentRobust,historyCount:scores.length,quality,reasons};
}

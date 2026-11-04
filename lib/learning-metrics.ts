/** Official-only comparisons; all competing model predictions were frozen before play. */
import type {TrackedPrediction} from './tracking';
import type {Sport} from './model';
import {validProRow} from './prediction-lab-pro';
export type LearningScore={model:'V1.7'|'V1.8'|'V2.0';count:number;mae:number;rmse:number;bias:number};
export type LearningSummary={total:number;resolved:number;pending:number;eligible:number;days:number;
  models:LearningScore[];winner:string|null;trend:{day:string;count:number;v17:number;v18:number;v20:number}[];
  note:string;};
const round=(n:number)=>Math.round(n*100)/100;
export function learningSummary(rows:TrackedPrediction[],sport:Sport):LearningSummary {
  const filtered=rows.filter(r=>r.sport===sport);
  const resolved=filtered.filter(r=>r.actualSource==='sorare'&&r.actual!==null);
  const unique=new Map<string,TrackedPrediction>();
  for(const row of resolved){
    if(!validProRow(row,sport)||typeof row.engineV2Predicted!=='number'||!Number.isFinite(row.engineV2Predicted))continue;
    const k=`${row.playerId}|${row.actualGameDate}`;
    const prior=unique.get(k);
    if(!prior||row.savedAt<prior.savedAt)unique.set(k,row);
  }
  const valid=[...unique.values()] as (TrackedPrediction&{actual:number;baselinePredicted:number;advancedPredicted:number;engineV2Predicted:number;actualGameDate:string})[];
  const models=([['V1.7','baselinePredicted'],['V1.8','advancedPredicted'],['V2.0','engineV2Predicted']] as const).map(([model,key])=>{
    const e=valid.map(r=>r[key]-r.actual);
    return {model,count:e.length,mae:e.length?round(e.reduce((s,x)=>s+Math.abs(x),0)/e.length):0,
      rmse:e.length?round(Math.sqrt(e.reduce((s,x)=>s+x*x,0)/e.length)):0,
      bias:e.length?round(e.reduce((s,x)=>s+x,0)/e.length):0};
  });
  const days=new Map<string,typeof valid>();
  for(const row of valid){const day=row.actualGameDate.slice(0,10);days.set(day,[...(days.get(day)??[]),row]);}
  const trend=[...days.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-12).map(([day,list])=>({
    day,count:list.length,
    v17:round(list.reduce((s,r)=>s+Math.abs(r.baselinePredicted-r.actual),0)/list.length),
    v18:round(list.reduce((s,r)=>s+Math.abs(r.advancedPredicted-r.actual),0)/list.length),
    v20:round(list.reduce((s,r)=>s+Math.abs(r.engineV2Predicted-r.actual),0)/list.length),
  }));
  const enough=valid.length>=30&&days.size>=8;
  return {total:filtered.length,resolved:resolved.length,pending:filtered.filter(r=>r.actual===null).length,
    eligible:valid.length,days:days.size,models,
    winner:enough?[...models].sort((a,b)=>a.mae-b.mae)[0].model:null,
    trend,note:enough?'Vorläufiger retrospektiver Vergleich; Modellwechsel nur nach separatem Holdout-Test.':
      'Für einen ersten Modellvergleich: mindestens 30 bestätigte Spieler-Spiele an 8 unterschiedlichen Tagen. Keine automatische Modelländerung.',
  };
}

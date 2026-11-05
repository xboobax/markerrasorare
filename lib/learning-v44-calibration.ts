/** Sport-isolated, strictly out-of-sample calibration of conditional PP and Q80.
 * Only frozen PRE-GAME predictions with verifiable official Sorare FINAL outcomes.
 * Never mix NBA and football; never train on live ESPN estimates or DNP guesses.
 */
import type {Sport} from './model';
export type V44Row={sport:Sport;key:string;playerId:string;fixtureDay:string;capturedAt:string;fixtureStart:string|null;
  pp:number;q80:number;actual:number|null;actualSource:'sorare'|null;appeared:boolean|null;
  nba3pm:number|null;nba3pa:number|null;pregame3pm:number|null;pregame3pa:number|null};
export type V44Calibration={sport:Sport;version:number;ppOffset:number;q80Offset:number;sampleCount:number;
  holdoutMae:number;holdoutQ80Loss:number;holdoutCoverage:number;updatedAt:string};
export type V44Evaluation={sport:Sport;total:number;eligible:number;pending:number;days:number;ppMae:number|null;
  ppBias:number|null;q80Coverage:number|null;q80Pinball:number|null;threeSamples:number;threeMadeMean:number|null;
  threeAttemptMean:number|null;threePct:number|null;pregameThreeSamples:number};
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const round=(n:number)=>Math.round(n*1000)/1000;
const cap=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
export function validV44TrainingRow(r:V44Row,sport:Sport):boolean{
  if(r.sport!==sport||r.actualSource!=='sorare'||r.appeared!==true||!finite(r.actual)||r.actual<0||r.actual>500||
    !finite(r.pp)||!finite(r.q80)||r.pp<0||r.q80<r.pp||r.q80>500)return false;
  const saved=Date.parse(r.capturedAt),day=Date.parse(`${r.fixtureDay}T00:00:00Z`);
  if(!Number.isFinite(saved)||!Number.isFinite(day))return false;
  // A same-day snapshot requires a verified tipoff/kickoff (independent schedule).
  const start=r.fixtureStart===null?day:Date.parse(r.fixtureStart);
  if(!Number.isFinite(start))return false;
  return saved<start-30*60000;
}
export function dedupeV44(rows:readonly V44Row[],sport:Sport):V44Row[]{
  const unique=new Map<string,V44Row>();
  for(const r of rows){if(!validV44TrainingRow(r,sport))continue;
    const key=`${r.playerId}|${r.fixtureDay}`;const old=unique.get(key);
    if(!old||r.capturedAt<old.capturedAt)unique.set(key,r);
  }
  return [...unique.values()].sort((a,b)=>a.fixtureDay.localeCompare(b.fixtureDay)||a.key.localeCompare(b.key));
}
export function v44Evaluate(rows:readonly V44Row[],sport:Sport):V44Evaluation{
  const same=rows.filter(r=>r.sport===sport);const valid=dedupeV44(same,sport);
  const errors=valid.map(r=>r.pp-r.actual!);const diff=valid.map(r=>r.actual!-r.q80);
  const hits=diff.filter(e=>e<=0).length;
  const nba3=sport==='nba'?same.filter(r=>r.actualSource==='sorare'&&r.appeared===true&&finite(r.nba3pm)&&finite(r.nba3pa)&&r.nba3pa>=r.nba3pm):[];
  const attempts=nba3.reduce((v,r)=>v+r.nba3pa!,0);
  return {sport,total:same.length,eligible:valid.length,pending:same.filter(r=>r.actual===null).length,
    days:new Set(valid.map(r=>r.fixtureDay)).size,
    ppMae:valid.length?round(errors.reduce((s,e)=>s+Math.abs(e),0)/valid.length):null,
    ppBias:valid.length?round(errors.reduce((s,e)=>s+e,0)/valid.length):null,
    q80Coverage:valid.length?round(hits/valid.length):null,
    q80Pinball:valid.length?round(diff.reduce((s,e)=>s+(e>=0?.8*e:.2*-e),0)/valid.length):null,
    threeSamples:nba3.length,threeMadeMean:nba3.length?round(nba3.reduce((s,r)=>s+r.nba3pm!,0)/nba3.length):null,
    threeAttemptMean:nba3.length?round(attempts/nba3.length):null,
    threePct:attempts?round(nba3.reduce((s,r)=>s+r.nba3pm!,0)/attempts):null,
    pregameThreeSamples:valid.filter(r=>finite(r.pregame3pm)&&finite(r.pregame3pa)).length,
  };
}
const mae=(rows:readonly V44Row[],offset:number)=>rows.reduce((s,r)=>s+Math.abs(cap(r.pp+offset,0,500)-r.actual!),0)/rows.length;
const qloss=(rows:readonly V44Row[],offset:number)=>rows.reduce((s,r)=>{const d=r.actual!-cap(Math.max(r.pp,r.q80+offset),0,500);return s+(d>=0?.8*d:-.2*d);},0)/rows.length;
const cover=(rows:readonly V44Row[],offset:number)=>rows.filter(r=>r.actual!<=cap(Math.max(r.pp,r.q80+offset),0,500)).length/rows.length;
export type V44Candidate={sport:Sport;ppOffset:number;q80Offset:number;train:number;holdout:number;days:number;
  previousMae:number;candidateMae:number;previousQloss:number;candidateQloss:number;
  previousCoverage:number;candidateCoverage:number;promotable:boolean;reason:string};
/** Chronological train/validation split on DISTINCT MATCH DAYS prevents future data leakage. */
export function v44Candidate(rows:readonly V44Row[],sport:Sport,active:Pick<V44Calibration,'ppOffset'|'q80Offset'>={ppOffset:0,q80Offset:0}):V44Candidate|null{
  const valid=dedupeV44(rows,sport);const days=[...new Set(valid.map(r=>r.fixtureDay))];
  if(valid.length<140||days.length<18)return null;
  const border=days[Math.floor(days.length*.72)];const training=valid.filter(r=>r.fixtureDay<border),holdout=valid.filter(r=>r.fixtureDay>=border);
  if(training.length<95||holdout.length<35)return null;
  const meanShift=training.reduce((s,r)=>s+r.actual!-r.pp,0)/training.length;
  // Strong shrinkage avoids chasing a small cohort of abnormal games.
  const ppOffset=round(cap(meanShift*training.length/(training.length+80),-9,9));
  // Pinball optimum for p80 is the 80th percentile of actual - raw q80 residuals.
  const residuals=training.map(r=>r.actual!-r.q80).sort((a,b)=>a-b);
  const quantile=residuals[Math.min(residuals.length-1,Math.ceil(.8*residuals.length)-1)];
  const q80Offset=round(cap(quantile*training.length/(training.length+80),-14,14));
  const previousMae=mae(holdout,active.ppOffset),candidateMae=mae(holdout,ppOffset),
    previousQloss=qloss(holdout,active.q80Offset),candidateQloss=qloss(holdout,q80Offset),
    previousCoverage=cover(holdout,active.q80Offset),candidateCoverage=cover(holdout,q80Offset);
  const noRegression=candidateMae<=previousMae+.02 && candidateQloss<=previousQloss+.02;
  const improved=(candidateMae<previousMae-.12||candidateQloss<previousQloss-.12);
  const calibrated=Math.abs(candidateCoverage-.8)<=Math.max(.06,Math.abs(previousCoverage-.8)+.025);
  const promotable=noRegression&&improved&&calibrated;
  return {sport,ppOffset,q80Offset,train:training.length,holdout:holdout.length,days:days.length,
    previousMae:round(previousMae),candidateMae:round(candidateMae),previousQloss:round(previousQloss),candidateQloss:round(candidateQloss),
    previousCoverage:round(previousCoverage),candidateCoverage:round(candidateCoverage),promotable,
    reason:promotable?'Zeitlich getrennte Validierung bestanden.':'Nicht freigegeben: zu geringe Verbesserung, schlechtere Holdout-Werte oder Q80-Abdeckung.'};
}
/** Called for one SPORT, never normalizes or borrows the other sport's offsets. */
export function applyV44Offsets(pp:number|null,q80:number|null,sport:Sport,model:Pick<V44Calibration,'sport'|'ppOffset'|'q80Offset'>|null){
  if(!model||model.sport!==sport||pp===null||q80===null||!finite(pp)||!finite(q80))return {pp,q80};
  const correctedPP=round(cap(pp+model.ppOffset,0,500));
  return {pp:correctedPP,q80:round(cap(Math.max(correctedPP,q80+model.q80Offset),0,500))};
}

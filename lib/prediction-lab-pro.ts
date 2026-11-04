/**
 * Prediction Lab Pro: strictly retrospective analytics of PROSPECTIVELY FROZEN
 * forecasts. No network calls, no retroactive challenger reconstruction,
 * no model mutation. Fit a proposed blend on earlier dates ONLY and evaluate
 * it on later dates (chronological holdout).
 */
import type {Sport} from "./model";
import type {TrackedPrediction} from "./tracking";
import {matchingGameDay} from "./tracking-auto";

export type LabRange="all"|"30"|"90";
export type LabGroup="score"|"position"|"team";
export type LabMetric={count:number;mae:number;rmse:number;bias:number};
export type LabSegment={name:string;count:number;baseline:LabMetric;challenger:LabMetric;delta:number};
export type LabDay={date:string;count:number;baselineMae:number;challengerMae:number};
export type LabMiss={key:string;name:string;team:string;date:string;actual:number;baseline:number;challenger:number;absError:number;position:string|null};
export type LabCandidate={
  readiness:"collecting"|"insufficient"|"not-better"|"promising";
  weight:number|null;
  baselineTrainMae:number|null;
  blendedTrainMae:number|null;
  baselineHoldoutMae:number|null;
  blendedHoldoutMae:number|null;
  challengerHoldoutMae:number|null;
  trainingCount:number;
  trainingDays:number;
  holdoutCount:number;
  holdoutDays:number;
  improvementPercent:number|null;
  lastTrainDate:string|null;
  firstHoldoutDate:string|null;
};
export type LabReport={
  saved:number;unresolved:number;manualExcluded:number;noFrozenComparison:number;invalidOfficial:number;duplicateExcluded:number;
  included:number;days:number;baseline:LabMetric|null;challenger:LabMetric|null;
  winRate:number|null;intervalCoverage80:number|null;intervalCount:number;
  trends:LabDay[];scoreSegments:LabSegment[];positionSegments:LabSegment[];teamSegments:LabSegment[];
  misses:LabMiss[];candidate:LabCandidate;
};

type Row=TrackedPrediction & {actual:number;baselinePredicted:number;advancedPredicted:number;actualGameDate:string};
const round=(n:number)=>Math.round(n*10)/10;
const day=(r:Row)=>r.actualGameDate.slice(0,10);
const average=(list:number[])=>list.reduce((sum,x)=>sum+x,0)/list.length;
const metric=(rows:Row[],read:(row:Row)=>number):LabMetric|null=>{
  if(!rows.length)return null;
  const errors=rows.map(r=>read(r)-r.actual);
  return {count:rows.length,mae:round(average(errors.map(Math.abs))),rmse:round(Math.sqrt(average(errors.map(e=>e*e)))),bias:round(average(errors))};
};
const rawMae=(rows:Row[],read:(row:Row)=>number)=>average(rows.map(r=>Math.abs(read(r)-r.actual)));
const baseline=(r:Row)=>r.baselinePredicted;
const challenger=(r:Row)=>r.advancedPredicted;
const blend=(weight:number)=>(r:Row)=>r.baselinePredicted*(1-weight)+r.advancedPredicted*weight;
const emptyCandidate=():LabCandidate=>({readiness:"collecting",weight:null,baselineTrainMae:null,blendedTrainMae:null,baselineHoldoutMae:null,blendedHoldoutMae:null,challengerHoldoutMae:null,trainingCount:0,trainingDays:0,holdoutCount:0,holdoutDays:0,improvementPercent:null,lastTrainDate:null,firstHoldoutDate:null});

/** The official result must postdate the frozen prediction, with a plausible
 * numeric payload and the comparison recorded at snapshot time. */
export function validProRow(r:TrackedPrediction,sport:Sport):r is Row{
  return r.sport===sport && r.actualSource==="sorare" &&
    r.modelVersion==="1.8.0" && typeof r.actual==="number" && Number.isFinite(r.actual) && r.actual>=0 && r.actual<=500 &&
    typeof r.baselinePredicted==="number" && Number.isFinite(r.baselinePredicted) && r.baselinePredicted>=0 && r.baselinePredicted<=500 &&
    typeof r.advancedPredicted==="number" && Number.isFinite(r.advancedPredicted) && r.advancedPredicted>=0 && r.advancedPredicted<=500 &&
    typeof r.actualGameDate==="string" && Number.isFinite(Date.parse(r.actualGameDate)) &&
    Number.isFinite(Date.parse(r.savedAt)) &&
    (r.sport==='nba' && r.fixtureTipoff && Number.isFinite(Date.parse(r.fixtureTipoff))
      ? Date.parse(r.fixtureTipoff)>Date.parse(r.savedAt)
      : Date.parse(r.savedAt)<Date.parse(r.actualGameDate)) &&
    matchingGameDay(r,r.actualGameDate);
}

/** The candidate and its blend weight are trained ONLY on earlier games.
 * The later dates are untouched until one final out-of-sample evaluation.
 * This is a research suggestion, never automatic promotion.
 */
export function evaluateTemporalBlend(rows:Row[]):LabCandidate{
  const result=emptyCandidate();
  const days=[...new Set(rows.map(day))].sort();
  if(!rows.length)return result;
  if(rows.length<30 || days.length<8)return {...result,readiness:"insufficient"};
  // At least two full held-out fixture days, all players on a date stay together.
  const trainingDays=Math.floor(days.length*.70);
  const splitDay=days[trainingDays];
  const train=rows.filter(r=>day(r)<splitDay),test=rows.filter(r=>day(r)>=splitDay);
  if(train.length<20||test.length<8||trainingDays<5||days.length-trainingDays<2)return {...result,readiness:"insufficient",trainingCount:train.length,trainingDays,holdoutCount:test.length,holdoutDays:days.length-trainingDays};
  const weights=[0,.25,.5,.75,1];
  // Tie goes to the more conservative baseline weight.
  const weight=weights.reduce((best,next)=>rawMae(train,blend(next))<rawMae(train,blend(best))-1e-8?next:best,0);
  const baseTrain=rawMae(train,baseline),trained=rawMae(train,blend(weight));
  const baseTest=rawMae(test,baseline),newTest=rawMae(test,blend(weight)),challengerTest=rawMae(test,challenger);
  const improvement=baseTest>0?(baseTest-newTest)/baseTest*100:null;
  const positive=weight>0 && improvement!==null && improvement>=3 && baseTest-newTest>=.5;
  return {readiness:positive?"promising":"not-better",weight,
    baselineTrainMae:round(baseTrain),blendedTrainMae:round(trained),baselineHoldoutMae:round(baseTest),
    blendedHoldoutMae:round(newTest),challengerHoldoutMae:round(challengerTest),
    trainingCount:train.length,trainingDays,holdoutCount:test.length,holdoutDays:days.length-trainingDays,
    improvementPercent:improvement===null?null:round(improvement),lastTrainDate:days[trainingDays-1],firstHoldoutDate:splitDay};
}

export function analyzePredictionLab(rows:TrackedPrediction[],sport:Sport,range:LabRange="all",now=new Date()):LabReport{
  const selected=rows.filter(row=>row.sport===sport);
  const valid=selected.filter(row=>validProRow(row,sport)) as Row[];
  // Preserve at most one frozen observation per real player/game.
  // If multiple snapshots exist, use the EARLIEST saved before kickoff.
  const unique=new Map<string,Row>();
  for(const r of valid){
    const key=`${r.playerId}|${r.actualGameDate}`;
    const old=unique.get(key);
    if(!old||r.savedAt<old.savedAt)unique.set(key,r);
  }
  const distinct=[...unique.values()];
  const daysToLookBack=range==="all"?null:Number(range);
  const start=daysToLookBack===null?null:now.getTime()-daysToLookBack*86400000;
  const end=now.getTime();
  const filtered=distinct.filter(r=>{
    const ts=Date.parse(r.actualGameDate);
    return ts<=end&&(start===null||ts>=start);
  }).sort((a,b)=>a.actualGameDate.localeCompare(b.actualGameDate)||a.key.localeCompare(b.key));
  const old=metric(filtered,baseline),next=metric(filtered,challenger);
  const wins=filtered.filter(r=>Math.abs(challenger(r)-r.actual)<Math.abs(baseline(r)-r.actual)).length;
  const nonTied=filtered.filter(r=>Math.abs(challenger(r)-r.actual)!==Math.abs(baseline(r)-r.actual)).length;
  const withBands=filtered.filter(r=>typeof r.intervalP10==="number"&&typeof r.intervalP90==="number"&&Number.isFinite(r.intervalP10)&&Number.isFinite(r.intervalP90)&&r.intervalP10>=0&&r.intervalP90>=r.intervalP10);
  const groups=(key:(r:Row)=>string,limit=20):LabSegment[]=>{
    const map=new Map<string,Row[]>();
    for(const r of filtered){const name=key(r);map.set(name,[...(map.get(name)??[]),r]);}
    return [...map].map(([name,group])=>({name,count:group.length,baseline:metric(group,baseline)!,challenger:metric(group,challenger)!,delta:round(rawMae(group,baseline)-rawMae(group,challenger))}))
      .sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,"de")).slice(0,limit);
  };
  const scoreLabel=(r:Row)=>{
    const n=r.baselinePredicted;
    if(sport==="nba")return n<25?"Unter 25 Punkte":n<45?"25–44 Punkte":"45+ Punkte";
    return n<35?"Unter 35 Punkte":n<55?"35–54 Punkte":"55+ Punkte";
  };
  const perDay=new Map<string,Row[]>();
  for(const r of filtered)perDay.set(day(r),[...(perDay.get(day(r))??[]),r]);
  const trends=[...perDay].sort((a,b)=>a[0].localeCompare(b[0])).slice(-12).map(([date,group])=>({date,count:group.length,baselineMae:round(rawMae(group,baseline)),challengerMae:round(rawMae(group,challenger))}));
  const misses=[...filtered].sort((a,b)=>Math.abs(baseline(b)-b.actual)-Math.abs(baseline(a)-a.actual)).slice(0,10)
    .map(r=>({key:r.key,name:r.playerName,team:r.team,date:day(r),actual:r.actual,baseline:r.baselinePredicted,
      challenger:r.advancedPredicted,absError:round(Math.abs(r.baselinePredicted-r.actual)),position:r.position??null}));
  return {
    saved:selected.length,unresolved:selected.filter(r=>r.actual===null).length,
    manualExcluded:selected.filter(r=>r.actual!==null&&r.actualSource!=="sorare").length,
    noFrozenComparison:selected.filter(r=>r.actualSource==="sorare"&&r.actual!==null&&r.modelVersion!=="1.8.0").length,
    invalidOfficial:Math.max(0,selected.filter(r=>r.actualSource==="sorare"&&r.actual!==null&&r.modelVersion==="1.8.0").length-valid.length),duplicateExcluded:valid.length-distinct.length,
    included:filtered.length,days:perDay.size,baseline:old,challenger:next,
    winRate:nonTied>=5?round(100*wins/nonTied):null,
    intervalCoverage80:withBands.length>=10?round(100*withBands.filter(r=>r.actual>=r.intervalP10!&&r.actual<=r.intervalP90!).length/withBands.length):null,
    intervalCount:withBands.length,
    trends,scoreSegments:groups(scoreLabel),positionSegments:groups(r=>r.position??"Position nicht gespeichert"),
    teamSegments:groups(r=>r.team||"Team unbekannt",10),misses,candidate:evaluateTemporalBlend(filtered),
  };
}

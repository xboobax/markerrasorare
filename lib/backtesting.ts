import type {TrackedPrediction} from "./tracking";

export type ErrorStats={count:number;mae:number;rmse:number;bias:number};
export type BacktestResult={
  paired:number;
  official:number;
  baseline:ErrorStats|null;
  challenger:ErrorStats|null;
  differenceMae:number|null; // positive: V1.8 made a smaller error
  improvementPercent:number|null;
  coverage80:number|null; // prospective 10%-90% mixture interval check, official only
  distinctDays:number;
  holdout:null|{count:number;baselineMae:number;challengerMae:number;differentDays:number};
  verdict:"noch-keine-daten"|"vorläufig"|"verbessert"|"verschlechtert"|"unentschieden";
};
const rounded=(n:number)=>Math.round(n*10)/10;
function metric(rows:TrackedPrediction[],key:"baselinePredicted"|"advancedPredicted"):ErrorStats|null{
  const errors=rows.map(r=>(r[key] as number)-(r.actual as number));
  if(!errors.length)return null;
  return {count:errors.length,mae:rounded(errors.reduce((s,e)=>s+Math.abs(e),0)/errors.length),
    rmse:rounded(Math.sqrt(errors.reduce((s,e)=>s+e*e,0)/errors.length)),
    bias:rounded(errors.reduce((s,e)=>s+e,0)/errors.length)};
}
function validEntry(row:TrackedPrediction, officialOnly:boolean):boolean{
  if(officialOnly&&row.actualSource!=="sorare")return false;
  if(row.actual===null||!Number.isFinite(row.actual)||row.actual<0)return false;
  if(row.modelVersion!=="1.8.0" || ![row.baselinePredicted,row.advancedPredicted].every(x=>typeof x==="number"&&Number.isFinite(x)&&x>=0))return false;
  // Official result must have been final after the prediction was saved.
  if(row.actualSource==="sorare"&&(!row.actualGameDate||Date.parse(row.actualGameDate)<=Date.parse(row.savedAt)))return false;
  return true;
}
const fixtureDay=(row:TrackedPrediction)=>row.actualGameDate?.slice(0,10)??row.fixture?.slice(0,10)??row.savedAt.slice(0,10);

/** Prospective paired evaluation: older snapshots have NO challenger value and are excluded.
 * No retroactive predictions, no random train/test leakage across the same fixture day.
 */
export function backtestForecasts(rows:TrackedPrediction[]):BacktestResult {
  const paired=rows.filter(row=>validEntry(row,false));
  const officialRows=paired.filter(row=>validEntry(row,true));
  const baseline=metric(officialRows,"baselinePredicted");
  const challenger=metric(officialRows,"advancedPredicted");
  const days=[...new Set(officialRows.map(fixtureDay))].sort();
  let holdout:BacktestResult["holdout"]=null;
  if(days.length>=6&&officialRows.length>=20){
    const threshold=days[Math.floor(days.length*.7)];
    const holdoutRows=officialRows.filter(row=>fixtureDay(row)>=threshold);
    const old=metric(holdoutRows,"baselinePredicted");
    const newer=metric(holdoutRows,"advancedPredicted");
    if(old&&newer)holdout={count:holdoutRows.length,baselineMae:old.mae,challengerMae:newer.mae,
      differentDays:new Set(holdoutRows.map(fixtureDay)).size};
  }
  const withBands=officialRows.filter(x=>typeof x.intervalP10==="number"&&typeof x.intervalP90==="number"&&x.intervalP10<=x.intervalP90);
  const coverage80=withBands.length>=10?rounded(100*withBands.filter(x=>(x.actual as number)>=x.intervalP10!&&(x.actual as number)<=x.intervalP90!).length/withBands.length):null;
  const differenceMae=baseline&&challenger?rounded(baseline.mae-challenger.mae):null;
  const improvementPercent=baseline&&challenger&&baseline.mae>0?rounded((baseline.mae-challenger.mae)/baseline.mae*100):null;
  const verdict=holdout&&holdout.count>=8&&holdout.differentDays>=2?
    holdout.challengerMae<=holdout.baselineMae*.97?"verbessert":
    holdout.challengerMae>=holdout.baselineMae*1.03?"verschlechtert":"unentschieden":
    officialRows.length>0?"vorläufig":"noch-keine-daten";
  return {paired:paired.length,official:officialRows.length,baseline,challenger,differenceMae,
    improvementPercent,coverage80,distinctDays:days.length,holdout,verdict};
}

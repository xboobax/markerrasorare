const assert=require('node:assert/strict');
const {createTrackedPrediction,parseTrackingBackup,upsertTracked}=require('../.test-build/lib/tracking.js');
const {backtestForecasts}=require('../.test-build/lib/backtesting.js');
const {automaticSnapshotCandidates}=require('../.test-build/lib/snapshot-policy.js');
const source={id:'nba-player',name:'Tester',team:'NBA',position:'G',avg:47,averageL5:46,averageL10:47,proj:47,
  recentScores:[40,43,45,42,41],last5Apps:5,status:'STARTER',playOdds:.95,injuries:0,hasGame:true,
  nextGame:'2026-11-08 Team A - Team B'};
const {forecast}=require('../.test-build/lib/model.js');
const f=forecast(source);
const snapshot={baselinePredicted:45,advancedPredicted:43,intervalP10:0,intervalP90:80,modelVersion:'1.8.0',selectedMode:'v18'};
const entry=createTrackedPrediction(f,'nba',new Date('2026-11-03T12:00:00Z'),snapshot);
assert.equal(entry.modelVersion,'1.8.0');
assert.equal(entry.advancedPredicted,43);
assert.equal(upsertTracked([entry],entry).length,1,'do not overwrite existing frozen snapshot');
const parsed=parseTrackingBackup([entry],'nba');
assert.equal(parsed[0].intervalP90,80);
const invalid=parseTrackingBackup([{...entry,intervalP90:-1}],'nba');
assert.equal(invalid[0].modelVersion,undefined,'invalid model metadata is dropped, not executed');
const list=[];
for(let day=1;day<=10;day++)for(let j=0;j<4;j++){
  const actual=42+j;
  list.push({...entry,key:`nba:p-${day}-${j}:2026-11-${String(day).padStart(2,'0')} Club`,
    fixture:`2026-11-${String(day).padStart(2,'0')} Club`,
    savedAt:`2026-10-31T00:00:00Z`,
    actualGameDate:`2026-11-${String(day).padStart(2,'0')}T18:00:00Z`,
    actual, actualSource:'sorare', baselinePredicted:actual+8, advancedPredicted:actual+2});
}
const report=backtestForecasts(list);
assert.equal(report.official,40);
assert.equal(report.distinctDays,10);
assert.equal(report.verdict,'verbessert');
assert.ok(report.baseline.mae>report.challenger.mae);
assert.ok(report.holdout.count>=8);
assert.equal(backtestForecasts(list.map(x=>({...x,modelVersion:undefined}))).official,0);
assert.equal(backtestForecasts(list.map(x=>({...x,actualSource:'manual'}))).official,0);
assert.equal(backtestForecasts(list.map(x=>({...x,savedAt:'2026-11-11T00:00:00Z'}))).official,0);
assert.equal(automaticSnapshotCandidates([f],'nba',new Date('2026-11-07T13:00:00Z')).length,1);
assert.equal(automaticSnapshotCandidates([f],'nba',new Date('2026-11-08T01:00:00Z')).length,0);
assert.equal(automaticSnapshotCandidates([{...f,nextGame:undefined}],'nba',new Date('2026-11-03T01:00:00Z')).length,0);
console.log('V1.8 prospective backtesting, migration metadata and safe snapshot policy passed.');

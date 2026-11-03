const assert=require('node:assert/strict');
const {
 createTrackedPrediction, upsertTracked, setActual, applyOfficialResults,
 parseTrackingBackup, trackingMetrics, calibrationSuggestion,
}=require('../.test-build/lib/tracking.js');
const {fixtureDay,pendingForAutoCheck,findFinalForSnapshot,parseOfficialResults}=require('../.test-build/lib/tracking-auto.js');

const item={key:'nba:player-1:2026-11-05 A - B',sport:'nba',playerId:'player-1',playerName:'Player 1',team:'Team A',fixture:'2026-11-05 A - B',savedAt:'2026-11-04T12:00:00.000Z',predicted:45,playProbability:.75,actual:null};
assert.equal(fixtureDay(item.fixture),'2026-11-05');
assert.equal(fixtureDay('2026-02-30 Match'),null);
assert.equal(fixtureDay(null),null);
assert.equal(pendingForAutoCheck([item],new Date('2026-11-06T14:00:00Z')).length,1);
assert.equal(pendingForAutoCheck([item],new Date('2026-11-05T14:00:00Z')).length,0);
assert.equal(pendingForAutoCheck([{...item,actual:40}],new Date('2026-11-06T14:00:00Z')).length,0);
assert.equal(pendingForAutoCheck([{...item,fixture:null}],new Date('2026-11-06T14:00:00Z')).length,0);
const score={date:'2026-11-05T19:00:00Z',score:48.5,status:'FINAL'};
assert.deepEqual(findFinalForSnapshot(item,[score]),{key:item.key,score:48.5,gameDate:score.date});
assert.equal(findFinalForSnapshot(item,[{...score,status:'LIVE'}]),null);
assert.equal(findFinalForSnapshot({...item,savedAt:'2026-11-05T20:00:00Z'},[score]),null);
assert.equal(findFinalForSnapshot(item,[{...score,date:'2026-11-10T19:00:00Z'}]),null);
assert.equal(findFinalForSnapshot(item,[score,{...score,date:'2026-11-05T20:00:00Z'}]),null);
assert.equal(findFinalForSnapshot(item,[{...score,date:'2026-11-06T01:00:00Z'}]),null);
assert.equal(findFinalForSnapshot(item,[{...score,date:'2026-11-06T01:00:00Z'},{...score,date:'2026-11-04T21:00:00Z'}]),null);
assert.equal(findFinalForSnapshot(item,[{...score,score:0}]).score,0);
assert.deepEqual(parseOfficialResults([{score:48.5,scoreStatus:'FINAL',anyGame:{date:score.date}},{score:null,scoreStatus:'DID_NOT_PLAY',anyGame:{date:score.date}},{score:40}]),[score]);
const merged=applyOfficialResults([item],[{key:item.key,score:48.5,gameDate:score.date}]);
assert.equal(merged[0].actual,48.5);
assert.equal(merged[0].actualSource,'sorare');
assert.equal(merged[0].predicted,45);
assert.equal(applyOfficialResults(merged,[{key:item.key,score:19,gameDate:score.date}])[0].actual,48.5);
const manually=setActual([item],item.key,49);
assert.equal(manually[0].actualSource,'manual');
assert.equal(applyOfficialResults(manually,[{key:item.key,score:30,gameDate:score.date}])[0].actual,49);
assert.equal(setActual(merged,item.key,null)[0].actual,null);
assert.equal(trackingMetrics(merged).officialCount,1);
assert.equal(trackingMetrics(manually).manualCount,1);
assert.equal(trackingMetrics([item]).count,0);
const old={...item,actual:10};
assert.equal(parseTrackingBackup([old], 'nba')[0].actual,10);
assert.equal(parseTrackingBackup([old],'football').length,0);
assert.equal(parseTrackingBackup({items:[old]},'nba').length,1);
assert.equal(parseTrackingBackup({items:[{...old,playerId:'<script>javascript</script>'}]},'nba').length,0);
assert.equal(parseTrackingBackup({items:Array.from({length:1501},()=>old)},'nba').length,0);
const sample=Array.from({length:20},(_,i)=>({...item,key:'nba:player-1:'+i,fixture:`2026-11-${String(1+Math.floor(i/4)).padStart(2,'0')} Game`,actual:40}));
assert.equal(calibrationSuggestion(sample).count,20);
assert.equal(calibrationSuggestion(sample.slice(0,19)),null);
assert.equal(calibrationSuggestion(sample.map(x=>({...x,fixture:'2026-11-05 Game'}))),null);
console.log('V1.7 safe result reconciliation, local backup and calibration tests passed.');

const assert=require('node:assert/strict');
const fs=require('node:fs');
const {forecast}=require('../.test-build/lib/model.js');
const {enrichForecast}=require('../.test-build/lib/matchups.js');
const {buildPredictionV2,robustScoreSpread,backtestPredictionV2}=require('../.test-build/lib/prediction-engine-v2.js');
const {createTrackedPrediction,parseTrackingBackup}=require('../.test-build/lib/tracking.js');

const player={id:'test-202',name:'NBA Test',team:'Example',position:'G',avg:44,averageL5:48,averageL10:43,proj:46,
  recentScores:[49,51,43,45,48,41,44,39,45,43],last5Apps:5,status:'STARTER',playOdds:.92,injuries:0,
  hasGame:true,nextGame:'2026-12-04 ABC - XYZ',opponent:'XYZ'};
const pure=forecast(player),before=JSON.stringify(pure);
const neutral=enrichForecast(pure,'nba',{});
const raw=buildPredictionV2(neutral,'nba');
assert.equal(raw.version,'2.0.0');
assert.equal(raw.applicable,true);
assert.equal(JSON.stringify(pure),before,'must not change the baseline');
assert.ok(raw.expected>0 && raw.weighted<=raw.expected && raw.floor<raw.expected && raw.ceiling>raw.expected);
assert.ok(raw.unconditionalP10<=raw.unconditionalP90);
assert.ok(raw.riskIndex>=0 && raw.riskIndex<=100);
assert.equal(raw.matchupPct,0);assert.equal(raw.minutesPct,0);
assert.equal(raw.quality,'hoch');
const football=buildPredictionV2(enrichForecast(forecast({...player,position:'MID',team:'FC Test'}),'football',{}),'football');
assert.equal(football.version,'2.0.0');
assert.ok(football.applicable&&football.recentWeight<raw.recentWeight,'football receives conservative recency weighting');
assert.ok(football.weighted>0);

const boosted=buildPredictionV2(enrichForecast(pure,'nba',{XYZ:1},{typicalMinutes:30,expectedMinutes:36}),'nba');
assert.ok(Math.abs(boosted.matchupPct-10)<1e-9);
assert.ok(Math.abs(boosted.minutesPct-20)<1e-9);
// Combined factors are 1.10 * 1.20; enriched baseline is 1.32 times neutral.
assert.ok(Math.abs(boosted.expected/raw.expected-1.32)<0.0001);

const notPlaying=buildPredictionV2(enrichForecast(forecast({...player,playOdds:0,hasGame:false}),'nba',{}),'nba');
assert.equal(notPlaying.weighted,0);
assert.ok(notPlaying.riskIndex>=70);
const sparse=buildPredictionV2(enrichForecast(forecast({...player,recentScores:[],proj:null,avg:null,averageL5:null,averageL10:null}),'nba',{}),'nba');
assert.equal(sparse.applicable,false);assert.equal(sparse.weighted,0);
const onlyProjection=buildPredictionV2(enrichForecast(forecast({...player,recentScores:[],proj:46,avg:null,averageL5:null,averageL10:null}),'nba',{}),'nba');
assert.equal(onlyProjection.recentWeight,0);assert.ok(onlyProjection.conditionalSd>0);
assert.equal(onlyProjection.expected,46);

const baseSpread=robustScoreSpread(player.recentScores);
const outlier=robustScoreSpread([195,...player.recentScores.slice(1)]);
assert.ok(outlier-baseSpread<15,'one extreme score must not massively widen uncertainty');
const futureRow={actual:52,actualSource:'sorare',actualGameDate:'2026-12-04T23:00:00Z',savedAt:'2026-12-04T12:00:00Z',advancedPredicted:45,engineV2Predicted:49};
const review=backtestPredictionV2([futureRow,{...futureRow,actualSource:'manual'},{...futureRow,savedAt:'2026-12-05T01:00:00Z'},
  {...futureRow,engineV2Predicted:NaN}]);
assert.deepEqual(review,{count:1,days:1,v18Mae:7,v2Mae:3,deltaMae:4});
assert.equal(backtestPredictionV2([]).count,0);
const snap=createTrackedPrediction({...pure,weighted:raw.weighted},'nba',new Date('2026-12-01'),{
  baselinePredicted:neutral.weighted,advancedPredicted:raw.weighted+1,intervalP10:5,intervalP90:100,
  engineV2Predicted:raw.weighted,engineV2P10:raw.unconditionalP10,engineV2P90:raw.unconditionalP90,
  modelVersion:'1.8.0',selectedMode:'v2'});
const restored=parseTrackingBackup([snap],'nba');
assert.equal(restored.length,1);
assert.equal(restored[0].selectedMode,'v2');
assert.equal(restored[0].engineV2Predicted,snap.engineV2Predicted);
assert.equal(parseTrackingBackup([{...snap,engineV2P10:-5}],'nba')[0].engineV2Predicted,undefined);
const ui=fs.readFileSync(require('node:path').join(__dirname,'../app/components/arcade-dashboard.tsx'),'utf8');
assert.match(ui,/buildPredictionV2\(scouted,sport\)/);
assert.match(ui,/Prediction Engine 2\.0/);
assert.match(ui,/v33-profile-card/);
assert.match(ui,/engineV2Predicted:p\.modelV2\.weighted/);
console.log('V3.3 Prediction Engine 2.0: sources, matchup/minutes once, sparse data, risk, snapshots and official backtest passed');

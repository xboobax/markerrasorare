const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {forecast}=require('../.test-build/lib/model.js');
const {enrichForecast}=require('../.test-build/lib/matchups.js');
const {buildPredictionV3,withPredictionV3Bonus,evaluatePredictionV3}=require('../.test-build/lib/prediction-engine-v3.js');
const {estimatedQ80,projectionValue}=require('../.test-build/lib/builder-v30.js');
const {createTrackedPrediction,parseTrackingBackup}=require('../.test-build/lib/tracking.js');

const starter={id:'test-404',name:'NBA Test',team:'Boston Celtics',position:'G',avg:44,averageL5:48,averageL10:43,proj:46,
  recentScores:[49,51,43,45,48,41,44,39,45,43],last5Apps:5,status:'STARTER',playOdds:.9,
  injuries:0,hasGame:true,nextGame:'2026-12-04 ABC - XYZ',nextGameTipoff:'2026-12-04T23:00:00Z',opponent:'XYZ'};
const v3=(player=starter,sport='nba')=>buildPredictionV3(enrichForecast(forecast(player),sport,{}),sport);
const first=v3();
assert.equal(first.version,'3.0.0');
assert.equal(first.applicable,true);
assert.ok(first.q20Raw<first.ppRaw&&first.ppRaw<first.q80Raw);
assert.ok(first.conditionalSd>0&&first.quality==='hoch');
assert.equal(first.riskAdjustedPP,first.ppRaw*.9);
assert.ok(Math.abs((first.q80Raw-first.ppRaw)/first.conditionalSd-.84162)<.002,
  'q80 must be the 80th percentile of ONE conditional distribution, not PP+1.28*sd');
assert.ok(first.p70Conditional>=first.p70IncludingDnp&&first.p80Conditional>=first.p80IncludingDnp);
const noPlay=v3({...starter,playOdds:0,hasGame:false});
assert.ok(noPlay.ppRaw>0&&noPlay.q80Raw>0,'conditional PP/Q80 do not collapse to zero on DNP');
assert.equal(noPlay.riskAdjustedPP,0,'risk-adjusted PP reflects DNP');
assert.equal(noPlay.p70IncludingDnp,0);
const maxBonus=withPredictionV3Bonus(first,5);
assert.equal(maxBonus.bonusPercent,5);
assert.ok(Math.abs(maxBonus.pp-first.ppRaw*1.05)<1e-8);
assert.ok(Math.abs(maxBonus.q80-first.q80Raw*1.05)<1e-8);
assert.equal(withPredictionV3Bonus(first,999).bonusPercent,50,'must cap corrupt bonuses');
assert.equal(withPredictionV3Bonus(first,NaN).bonusPercent,0);
assert.equal(withPredictionV3Bonus(first,-10).bonusPercent,0);
const sparse=v3({...starter,proj:null,avg:null,averageL5:null,averageL10:null,recentScores:[]});
assert.equal(sparse.applicable,false);assert.equal(sparse.ppRaw,null);assert.equal(sparse.q80Raw,null);
const thin=v3({...starter,recentScores:[]});
assert.ok(thin.applicable && thin.q80Raw>thin.ppRaw,'does not hide projection just because <8 scores');
assert.equal(thin.quality,'mittel');
assert.ok(thin.reasons.some(x=>x.includes('Wenig Einzelscores')));
const lowSpread=v3({...starter,recentScores:Array(10).fill(44)});
const highSpread=v3({...starter,recentScores:[2,85,4,82,11,77,30,76,15,89]});
assert.ok(highSpread.q80Raw-highSpread.ppRaw>lowSpread.q80Raw-lowSpread.ppRaw,
  'player-specific volatility should change ceiling width');
const foot=v3({...starter,position:'MID',team:'Real Club',playOdds:.1},'football');
assert.ok(foot.applicable&&foot.ppRaw>foot.riskAdjustedPP);
assert.ok(foot.reasons.some(x=>x.includes('Tor-/Assist-/AA')));
const scouted=enrichForecast(forecast(starter),'nba',{});
const v3Forecast={...scouted,modelV3Active:true,modelV3:first,expected:first.ppRaw,weighted:first.riskAdjustedPP,ceiling:first.q80Raw,floor:first.q20Raw};
assert.equal(estimatedQ80(v3Forecast),first.q80Raw,'builder sees exactly the same Q80');
assert.notEqual(estimatedQ80({...v3Forecast,modelV3Active:false}),first.q80Raw,'legacy mode does not leak V3 Q80');
assert.ok(Math.abs(projectionValue({player:v3Forecast,bonusPercent:5,owned:true,stars:2},'q80')-first.q80Raw*.9*1.05)<1e-8,
  'builder risk-adjusts conditional Q80 for selection and applies bonus once');
const saved=createTrackedPrediction(v3Forecast,'nba',new Date('2026-12-01T10:00:00Z'),{
  baselinePredicted:42,advancedPredicted:43,intervalP10:1,intervalP90:80,modelVersion:'1.8.0',selectedMode:'v3',
  engineV3PP:first.ppRaw,engineV3Q80:first.q80Raw});
const restored=parseTrackingBackup([saved],'nba');
assert.equal(restored.length,1);
assert.equal(restored[0].selectedMode,'v3');
assert.ok(restored[0].engineV3PP>0&&restored[0].engineV3Q80>0);
assert.equal(parseTrackingBackup([{...saved,engineV3Q80:-5}],'nba')[0].engineV3Q80,undefined);
const official={actual:47,appeared:true,actualSource:'sorare',fixtureTipoff:'2026-12-04T23:00:00Z',savedAt:'2026-12-04T12:00:00Z',engineV3PP:45,engineV3Q80:60};
const evaluation=evaluatePredictionV3([official,{...official,actualSource:'manual'},
  {...official,savedAt:'2026-12-05T00:00:00Z'},{...official,engineV3PP:NaN},{...official,appeared:undefined},{...official,appeared:false}]);
assert.deepEqual(evaluation,{count:1,ppMae:2,q80Coverage:1});
assert.equal(evaluatePredictionV3([]).q80Coverage,null);
const dashboard=fs.readFileSync(path.join(__dirname,'../app/components/arcade-dashboard.tsx'),'utf8');
const explorer=fs.readFileSync(path.join(__dirname,'../features/players/player-explorer.tsx'),'utf8');
assert.match(dashboard,/buildPredictionV3\(scouted,sport,modelV2\)/);
assert.match(dashboard,/Q80 Raw/);
assert.match(dashboard,/withPredictionV3Bonus\(/);
assert.match(explorer,/buildPredictionV3\(scouted,sport\)/);
assert.match(explorer,/Q80 Raw/);
console.log('V4.0.3 Prediction Engine 3.0: conditional PP/Q80, DNP separation, bonus, individualized spread, sparse data, tracking and UI passed');

const assert=require('node:assert/strict');
const {forecast}=require('../.test-build/lib/model.js');
const {buildForecastV18,robustRecentMean,pointsAtLeast,mixtureQuantile}=require('../.test-build/lib/forecast-v18.js');
const player={id:'nba-player',name:'Tester',team:'NBA',position:'G',imageUrl:'https://example.org/1.jpg',avg:47,
  averageL5:47,averageL10:46,proj:48,recentScores:[48,45,50,47,50,44,46,43,48,44],
  last5Apps:5,status:'STARTER',playOdds:.91,injuries:0,hasGame:true,nextGame:'2026-11-08 A - B'};
const before=forecast(player);
const original=JSON.stringify(before);
const enhanced=buildForecastV18(before,'nba');
assert.equal(enhanced.applicable,true);
assert.equal(JSON.stringify(before),original,'must not mutate the original prediction');
assert.ok(enhanced.advancedWeighted>0&&enhanced.conditionalHigh>enhanced.conditionalLow);
assert.ok(enhanced.advancedWeighted>=enhanced.baselineWeighted*.85-1e-6);
assert.ok(enhanced.advancedWeighted<=enhanced.baselineWeighted*1.15+1e-6);
assert.equal(enhanced.version,'1.8.0');
const baselineOutlier=robustRecentMean([48,45,50,47,50,44,46,43,48,44]);
const withOutlier=robustRecentMean([190,45,50,47,50,44,46,43,48,44]);
assert.ok(withOutlier-baselineOutlier<15,'outlier must be capped robustly');
const sparse=buildForecastV18(forecast({...player,recentScores:[],averageL5:null,averageL10:null,avg:null,proj:null}),'nba');
assert.equal(sparse.applicable,false);
assert.equal(sparse.advancedWeighted,0);
assert.equal(buildForecastV18(forecast({...player,recentScores:[150]}),'nba').quality,'eingeschränkt');
assert.ok((pointsAtLeast(50,10,.9,60)??0)<(pointsAtLeast(50,10,.9,40)??0));
assert.equal(pointsAtLeast(50,10,0,40),0);
assert.equal(mixtureQuantile(50,10,.75,.1),0,'no-show probability creates zero mass');
assert.ok(mixtureQuantile(50,10,.75,.9)>mixtureQuantile(50,10,.75,.5));
console.log('V1.8 robust forecasts, sparse-data guards and probability approximation passed.');

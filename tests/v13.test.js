const assert = require('node:assert/strict');
const {forecast} = require('../.test-build/lib/model.js');
const {enrichForecast, matchupLabel, validDefenseRating} = require('../.test-build/lib/matchups.js');
const {optimizeArcadeLineups} = require('../.test-build/lib/arcade.js');
const {estimateTargetChance} = require('../.test-build/lib/target-probability.js');

function make(id, position, score, team='Test Club', opponent='Bad Defense') {
  return forecast({
    id, name:id, team, position, opponent, avg:score, proj:score,
    recentScores: [score-5,score+5,score-5,score+5,score-5,score+5],
    last5Apps:5, status:'STARTER', playOdds:0.9, injuries:0, hasGame:true,
  });
}
const base=make('a','G',60);
const unknown=enrichForecast(base,'nba',{});
assert.equal(unknown.weighted,base.weighted);
assert.equal(unknown.opponentRating,null);
assert.equal(matchupLabel(unknown.opponentRating),'Unbewertet');
assert.equal(validDefenseRating(0),false);
assert.equal(validDefenseRating(5),true);
const favorable=enrichForecast(base,'nba',{'Bad Defense':1});
assert.ok(favorable.weighted > base.weighted);
assert.ok(Math.abs(favorable.matchupAdjustmentPct - 10) < 1e-10);
const hard=enrichForecast(base,'nba',{'Bad Defense':5});
assert.ok(hard.weighted < base.weighted);
const minutes=enrichForecast(base,'nba',{}, {typicalMinutes:30,expectedMinutes:36});
assert.ok(minutes.weighted > base.weighted);
assert.ok(minutes.minutesAdjustmentPct > 0);
const incompleteMinutes=enrichForecast(base,'nba',{}, {expectedMinutes:36});
assert.equal(incompleteMinutes.weighted,base.weighted);
const invalid=enrichForecast(base,'nba',{'Bad Defense':99},{typicalMinutes:0, expectedMinutes:200, xg:200});
assert.equal(invalid.weighted,base.weighted);
assert.equal(invalid.xg,null);
const attacker=enrichForecast(make('fw','FWD',45),'football',{}, {xg:.6,xa:.3});
assert.equal(attacker.xg,.6);
assert.equal(attacker.xa,.3);
assert.equal(attacker.weighted,make('fw','FWD',45).weighted); // xG/xA informational until validated

const pool=[
  ['a',60,4],['b',58,3],['c',57,3],['d',56,3],['e',55,3],['f',52,2],['g',48,2],['h',44,2],['i',39,1]
].map(([id,score,stars])=>({player:enrichForecast(make(id,'G',score),'nba',{}),stars,owned:true}));
for(const strategy of ['balanced','safe','upside','target']) {
  const out=optimizeArcadeLineups(pool,{sport:'nba',strategy,targetScore:275,limit:3});
  assert.ok(out.length >= 1,`No ${strategy} result`);
  for(const l of out) {
    assert.equal(l.picks.length,5);
    assert.ok(l.starsUsed <= 16);
    assert.equal(new Set(l.picks.map(p=>p.player.id)).size,5);
    assert.ok(l.targetProbability >= 0 && l.targetProbability <=1);
  }
  if(strategy==='target') assert.ok(out[0].targetProbability >= out[out.length-1].targetProbability);
}
const targetless=optimizeArcadeLineups(pool,{sport:'nba',strategy:'target'});
assert.deepEqual(targetless,[]);
const result=optimizeArcadeLineups(pool,{sport:'nba',strategy:'balanced',targetScore:275})[0];
assert.ok(result.targetProbability !== null);
assert.equal(estimateTargetChance(result.picks,0),null);
assert.ok(estimateTargetChance(result.picks,100) > estimateTargetChance(result.picks,500));
assert.deepEqual(optimizeArcadeLineups(pool,{sport:'nba',strategy:'target',targetScore:275,lockedPlayerIds:['a'],excludedPlayerIds:['a']}),[]);

const football=[
  ['gk','GK'],['def','DEF'],['mid','MID'],['fw','FWD'],['ex','MID'],['another','FWD']
].map(([id,pos])=>({player:enrichForecast(make(id,pos,50),'football',{}),owned:true}));
const f=optimizeArcadeLineups(football,{sport:'football',strategy:'target',targetScore:210});
assert.ok(f.length);
assert.deepEqual(f[0].picks.map(p=>p.slot), ['GK','DEF','MID','FWD','FLEX']);
assert.ok(f[0].targetProbability!==null);
console.log('V1.3 matchup inputs, minutes, goal-probability and lineup tests passed.');

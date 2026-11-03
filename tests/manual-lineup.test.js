const assert=require('node:assert/strict');
const {evaluateManualLineup,normalizeManualSelection}=require('../.test-build/lib/manual-lineup');
const make=(id,position,stars=2.5,opts={})=>({player:{
  id,name:id,position,team:'T',avg:30,proj:30,expected:30,weighted:24,playProb:.8,
  floor:20,ceiling:42,variability:10,sampleSize:5,last5Avg:30,last10Avg:30,hasGame:true,
  ...opts
},owned:true,stars,bonusPercent:0});
const football=[make('gk','GK'),make('def','DEF'),make('mid','MID'),make('fwd','FWD'),make('flex','MID')];
let s=evaluateManualLineup(['gk','def','mid','fwd','flex'],football,'football',110);
assert.equal(s.valid,true);assert.equal(s.picks.length,5);assert.equal(s.projectedScore,120);
assert.ok(s.targetProbability>=0 && s.targetProbability<=1);
s=evaluateManualLineup(['gk','def','mid','fwd','gk'],football,'football');
assert.equal(s.valid,false);assert.match(s.errors.join(' '),/mehrfach/);
s=evaluateManualLineup(['mid','def','gk','fwd','flex'],football,'football');
assert.equal(s.valid,false);assert.match(s.errors.join(' '),/Slot/);
s=evaluateManualLineup(['gk','def',null,'fwd','flex'],football,'football');
assert.equal(s.complete,false);assert.equal(s.targetProbability,null);
const nba=[make('n1','G',4),make('n2','C',4),make('n3','F',4),make('n4','G',2),make('n5','C',2)];
s=evaluateManualLineup(['n1','n2','n3','n4','n5'],nba,'nba',110);
assert.equal(s.starsUsed,16);assert.equal(s.valid,true);
s=evaluateManualLineup(['n1','n2','n3','n4','n5'],nba.map(c=>({...c,stars:c.player.id==='n5'?3:c.stars})),'nba');
assert.equal(s.valid,false);assert.match(s.errors.join(' '),/Sternelimit/);
s=evaluateManualLineup(['n1','n2','n3','n4','n5'],nba.map(c=>({...c,stars:c.player.id==='n2'?null:c.stars})),'nba');
assert.equal(s.valid,false);assert.match(s.errors.join(' '),/Sterne/);
s=evaluateManualLineup(['n1','n2','n3','n4','missing'],nba,'nba');
assert.equal(s.valid,false);assert.match(s.errors.join(' '),/nicht geladen/);
s=evaluateManualLineup(['n1','n2','n3','n4','n5'],nba.map(c=>({...c,owned:false})),'nba');
assert.equal(s.valid,true);assert.ok(s.warnings.length===5);
assert.deepEqual(normalizeManualSelection(['a',5,'c']),['a',null,'c',null,null]);
assert.deepEqual(normalizeManualSelection('oops'),[null,null,null,null,null]);
console.log('Manual lineup selection, validation, scoring and star-budget tests passed.');

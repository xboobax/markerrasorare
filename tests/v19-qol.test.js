const assert=require('node:assert/strict');
const {forecast}=require('../.test-build/lib/model');
const {evaluateManualLineup}=require('../.test-build/lib/manual-lineup');
const {firstEligibleEmptySlot,duplicateToFreePreset,assessLineup}=require('../.test-build/lib/lineup-intelligence');
const {parseWatchlist,toggleWatchlist,watchlistKey}=require('../.test-build/lib/watchlist');
const make=(id,position,stars=2.5,opts={})=>({player:forecast({id,name:id,team:'Team',position,
 avg:45,averageL5:46,averageL10:45,proj:45,recentScores:[46,44,45,48,42],last5Apps:5,
 status:'STARTER',playOdds:.88,injuries:0,hasGame:true,...opts}),stars,bonusPercent:0,owned:true});
const soccer=[make('gk','GK'),make('def','DEF'),make('mid','MID'),make('fwd','FWD'),make('flex','MID'),make('alt','FWD')];
assert.equal(firstEligibleEmptySlot([null,null,null,null,null],soccer,'football','gk'),0);
assert.equal(firstEligibleEmptySlot(['gk',null,null,null,null],soccer,'football','flex'),2);
assert.equal(firstEligibleEmptySlot(['gk','def','mid','fwd',null],soccer,'football','flex'),4);
assert.equal(firstEligibleEmptySlot(['gk','def','mid','fwd',null],soccer,'football','gk'),null);
assert.equal(firstEligibleEmptySlot(['gk','def','mid','fwd','flex'],soccer,'football','alt'),null);
assert.equal(firstEligibleEmptySlot([null,null,null,null,null],soccer,'football','unknown'),null);
assert.equal(firstEligibleEmptySlot([null,null,null,null,null],soccer,'football','alt'),3);
const nba=[make('n1','G',4),make('n2','F',4),make('n3','C',3),make('n4','G',3),make('n5','F',2)];
assert.equal(firstEligibleEmptySlot(['n1',null,null,null,null],nba,'nba','n2'),1);
assert.equal(firstEligibleEmptySlot(['n1','n2','n3','n4','n5'],nba,'nba','n2'),null);
assert.equal(evaluateManualLineup(['n1','n2','n3','n4','n5'],nba,'nba').valid,true);
let line=evaluateManualLineup(['n1','n2','n3','n4','n5'],nba,'nba',220);
let findings=assessLineup(line,'nba',220);
assert.ok(findings.some(f=>f.id==='budget'&&f.tone==='success'));
assert.ok(findings.some(f=>f.id==='goal'));
const risky=nba.map(c=>c.player.id==='n1'?{...c,player:{...c.player,hasGame:false,playProb:0}}:c);
findings=assessLineup(evaluateManualLineup(['n1','n2','n3','n4','n5'],risky,'nba'),'nba',null);
assert.ok(findings.some(f=>f.id==='fixtures'&&f.tone==='warning'));
line=evaluateManualLineup(['gk','def',null,'fwd',null],soccer,'football');
assert.ok(assessLineup(line,'football',180).some(f=>f.id==='slots'));
const original=['gk','def','mid','fwd','flex'];
const old={'1':['a','b','c','d','e']};
const copy=duplicateToFreePreset(old,original);
assert.equal(copy.key,'2');
assert.deepEqual(copy.presets['2'],original);
copy.presets['2'][0]='changed';assert.equal(original[0],'gk','duplicate must not share an array');
assert.equal(duplicateToFreePreset({'1':[],'2':[],'3':[]},original).key,null,'no implicit overwrite');
assert.deepEqual(parseWatchlist(['a','a','b',10,undefined,'', 'z'.repeat(257)]),['a','b']);
assert.deepEqual(toggleWatchlist(['a'],'b'),['a','b']);
assert.deepEqual(toggleWatchlist(['a','b'],'a'),['b']);
assert.equal(watchlistKey('nba'),'markerras.sorare.watchlist.v19.nba');
const fs=require('node:fs');
const ui=fs.readFileSync(require('node:path').join(__dirname,'../app/components/arcade-dashboard.tsx'),'utf8');
const manual=fs.readFileSync(require('node:path').join(__dirname,'../app/components/manual-lineup.tsx'),'utf8');
for(const feature of ['queueManualPlayer','search-suggestions','watchlist-panel','favorite-toggle','+ Direkt in mein Lineup']) {
  assert.ok(ui.includes(feature),`missing UI integration: ${feature}`);
}
for(const feature of ['requestedPlayer','lineup-assistant','duplicateToFreePreset','copyLineup']) {
  assert.ok(manual.includes(feature),`missing manual builder integration: ${feature}`);
}
console.log('V1.9 direct-add, smart hints, NBA/football slots, non-destructive variants and watchlists passed.');

const assert=require('node:assert/strict');
const {forecast}=require('../.test-build/lib/model.js');
const {suggestManualSwaps}=require('../.test-build/lib/manual-lineup.js');

const player=(id,pos,score,extra={})=>forecast({
  id,name:id,team:'T',position:pos,avg:score,proj:score,recentScores:[score,score,score,score,score],
  last5Apps:5,status:'STARTER',playOdds:0.9,injuries:0,hasGame:true,...extra,
});

// No fake score and no fake form trend when score information is missing.
const empty=forecast({id:'x',name:'x',team:'T',position:'G',avg:null,proj:null,
  averageL5:null,averageL10:null,recentScores:[],last5Apps:null,status:'SUBSTITUTE',playOdds:null,
  injuries:0,hasGame:null});
assert.equal(empty.forecastSources.length,0);
assert.equal(empty.formDirection,'unbekannt');
assert.equal(empty.confidence,'gering');

// One exceptionally good game has a modest rather than dominating effect.
const sparse=player('sparse','G',50,{recentScores:[150]});
assert.ok(sparse.expected>50 && sparse.expected<80,`Expected 50..80, got ${sparse.expected}`);
assert.equal(sparse.formDirection,'unbekannt');
assert.ok(sparse.variability>=sparse.expected*.30);
const full=player('full','G',50,{recentScores:[80,80,80,80,80,20,20,20,20,20]});
assert.equal(full.formDirection,'steigend');
assert.ok(full.formChangePct>8);
assert.ok(Math.abs(full.forecastSources.reduce((n,s)=>n+s.share,0)-1)<1e-9);
assert.ok(full.forecastSources.some(s=>s.label==='Sorare-Projektion'));

const nba=[
  {player:player('a','G',50),stars:3,owned:true},
  {player:player('b','G',50),stars:3,owned:true},
  {player:player('c','F',50),stars:3,owned:true},
  {player:player('d','C',50),stars:3,owned:true},
  {player:player('e','F',50),stars:3,owned:true},
  {player:player('too-expensive','G',100),stars:5,owned:true}, // 17 stars -> reject
  {player:player('upgrade','G',70),stars:4,owned:true}, // 16 stars -> allow
  {player:player('no-stars','G',90),stars:null,owned:true},
  {player:player('unowned','G',88),stars:2,owned:false},
];
const ids=['a','b','c','d','e'];
const swaps=suggestManualSwaps(ids,nba,'nba');
assert.ok(swaps.length>0);
assert.ok(swaps.every(s=>s.newStarsUsed<=16));
assert.ok(swaps.every(s=>s.toId!=='too-expensive' && s.toId!=='no-stars'));
assert.ok(swaps.every(s=>!ids.includes(s.toId)));
assert.ok(swaps.some(s=>s.toId==='unowned')); 
const ownedSwaps=suggestManualSwaps(ids,nba,'nba',{ownedOnly:true});
assert.ok(ownedSwaps.every(s=>s.owned));
assert.ok(ownedSwaps.some(s=>s.toId==='upgrade')); 
assert.ok(ownedSwaps.every(s=>s.toId!=='unowned'));
assert.deepEqual(suggestManualSwaps(['a',null,'c','d','e'],nba,'nba'),[]);

const football=[
  {player:player('gk','GK',50)},
  {player:player('def','DEF',50)},
  {player:player('mid','MID',50)},
  {player:player('fw','FWD',50)},
  {player:player('ex','FWD',50)},
  {player:player('gk2','GK',200)}, // second GK must not fit FLEX
  {player:player('mid2','MID',70)},
];
const fs=suggestManualSwaps(['gk','def','mid','fw','ex'],football,'football');
assert.ok(fs.some(s=>s.toId==='mid2'));
assert.ok(fs.every(s=>!(s.slotIndex===4&&s.toId==='gk2')));
console.log('V1.6 forecast trace, sparse-data weighting and manual swap tests passed.');

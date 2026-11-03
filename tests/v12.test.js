const assert = require('node:assert/strict');
const {forecast} = require('../.test-build/lib/model.js');
const {optimizeArcadeLineups} = require('../.test-build/lib/arcade.js');
const {safeImageUrl} = require('../.test-build/lib/sorare.js');

const player = (id, position, score, spread=0) => ({
  id, name:id, position, team:'Club', avg:score, proj:score,
  recentScores: Array.from({length:10}, (_,i)=> score + (i%2 ? spread : -spread)),
  last5Apps:5, status:'STARTER', playOdds:1, hasGame:true, injuries:0,
});
const f=forecast(player('F','FWD',60,25));
assert.equal(f.sampleSize,10);
assert.ok(f.floor < f.expected && f.ceiling > f.expected);
assert.equal(f.last5Avg,55);
assert.equal(f.confidence,'hoch');
assert.equal(f.playProb,1);
assert.equal(f.weighted,f.expected);
assert.equal(forecast({...player('G','GK',60), injuries:1}).playProb,0.15);
assert.equal(safeImageUrl('https://example.org/p.jpg'),'https://example.org/p.jpg');
assert.equal(safeImageUrl('//example.org/p.jpg'),'https://example.org/p.jpg');
assert.equal(safeImageUrl('javascript:alert(1)'),null);
assert.equal(safeImageUrl('http://example.org/p.jpg'),null);

const nba = [
  {player:forecast(player('A','G',80,4)),stars:5,owned:true},
  {player:forecast(player('B','G',75,4)),stars:4,owned:true},
  {player:forecast(player('C','F',70,4)),stars:3,owned:true},
  {player:forecast(player('D','C',65,4)),stars:2,owned:true},
  {player:forecast(player('E','F',60,4)),stars:3,owned:true},
  {player:forecast(player('F','G',55,30)),stars:2,owned:true},
];
const base=optimizeArcadeLineups(nba,{sport:'nba',strategy:'balanced'})[0];
assert.ok(base);
assert.ok(base.starsUsed<=16);
const locked=optimizeArcadeLineups(nba,{sport:'nba',lockedPlayerIds:['F']})[0];
assert.ok(locked.picks.some(p=>p.player.id==='F'));
assert.ok(locked.starsUsed<=16);
assert.deepEqual(optimizeArcadeLineups(nba,{sport:'nba',lockedPlayerIds:['A','B','C','D','E']}),[]);
const excluded=optimizeArcadeLineups(nba,{sport:'nba',excludedPlayerIds:['A']})[0];
assert.ok(excluded && excluded.picks.every(p=>p.player.id!=='A'));
const upside=optimizeArcadeLineups(nba,{sport:'nba',strategy:'upside'})[0];
assert.ok(upside);
assert.ok(upside.picks.some(p=>p.player.id==='F'));
const football=[
  {player:forecast(player('gk','GK',50))},
  {player:forecast(player('def','DEF',50))},
  {player:forecast(player('mid','MID',50))},
  {player:forecast(player('mid2','MID',40))},
  {player:forecast(player('fwd','FWD',50))},
  {player:forecast(player('fwd2','FWD',40))},
];
const fLocked=optimizeArcadeLineups(football,{sport:'football',lockedPlayerIds:['mid','mid2']})[0];
assert.ok(fLocked);
assert.ok(fLocked.picks.some(p=>p.slot==='FLEX' && p.player.id==='mid2') || fLocked.picks.some(p=>p.slot==='FLEX' && p.player.id==='mid'));
assert.equal(new Set(fLocked.picks.map(p=>p.player.id)).size,5);
assert.deepEqual(optimizeArcadeLineups(football,{sport:'football',lockedPlayerIds:['gk','mid','mid2','fwd','fwd2']}),[]);
console.log('V1.2 forecast, image and lineup strategy tests passed.');

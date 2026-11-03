// Run after compiling lib/{model,arcade}.ts to CommonJS with tsc (see README).
const assert = require("node:assert/strict");
const { optimizeArcadeLineups, isValidNbaStars } = require("../.test-build/lib/arcade.js");
function make(id, position, score, stars, owned = true) {
  return {
    player: {id, name:id, team:"T", position, avg:score, proj:score,
      weighted:score, expected:score, playProb:1, last5Apps:5,
      status:"", playOdds:null, injuries:0, hasGame:true },
    stars, owned,
  };
}
const nba = [
  make("A", "G", 100, 5), make("B", "G", 95, 5),
  make("C", "F", 90, 4), make("D", "C", 80, 3),
  make("E", "F", 70, 2), make("F", "G", 65, 2),
  make("G", "G", 40, null), make("H", "G", 50, 0.8),
];
assert.equal(isValidNbaStars(2.5), true);
assert.equal(isValidNbaStars(2.25), false);
assert.equal(isValidNbaStars(null), false);
const results = optimizeArcadeLineups(nba, {sport:"nba", beamWidth:300});
assert.ok(results.length > 0);
for(const result of results) {
  assert.equal(result.picks.length, 5);
  assert.ok(result.starsUsed <= 16);
  assert.equal(new Set(result.picks.map(p => p.player.id)).size, 5);
  assert.ok(result.picks.every(p => isValidNbaStars(p.stars)));
}
const football = [
  make("gk", "GK", 75, null), make("def", "DEF", 70, null),
  make("mid", "MID", 65, null), make("fwd", "FWD", 60, null),
  make("extra", "FWD", 55, null), make("othergk", "GK", 100, null),
];
const f = optimizeArcadeLineups(football, {sport:"football"})[0];
assert.ok(f);
assert.deepEqual(f.picks.map(p => p.slot), ["GK", "DEF", "MID", "FWD", "FLEX"]);
assert.notEqual(f.picks[4].player.position, "GK");
assert.equal(new Set(f.picks.map(p => p.player.id)).size, 5);
// Compare NBA result with brute force to catch invalid greedy star selections.
const brute = [];
for(let a=0;a<nba.length;a++) for(let b=a+1;b<nba.length;b++) for(let c=b+1;c<nba.length;c++)
  for(let d=c+1;d<nba.length;d++) for(let e=d+1;e<nba.length;e++) {
    const cards = [nba[a],nba[b],nba[c],nba[d],nba[e]];
    if(cards.every(x=>isValidNbaStars(x.stars)) && cards.reduce((t,x)=>t+x.stars,0) <= 16)
      brute.push(cards.reduce((t,x)=>t+x.player.weighted,0));
  }
assert.equal(results[0].projectedScore, Math.max(...brute));
const unowned = optimizeArcadeLineups(football.map(c => ({...c, owned:false})), {sport:"football", ownedOnly:true});
assert.equal(unowned.length, 0);
console.log("Arcade tests passed.");

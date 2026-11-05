const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {
  parseSorareFootballPhotos,parseSorareFootballScores,matchSorareGame,matchSorarePlayer
}=require('../.test-build/lib/football-live-sorare');
const clubs=[{id:'s1',date:'2026-11-05T18:00:00Z',homeTeam:{name:'TSG 1899 Hoffenheim'},awayTeam:{name:'Crystal Palace FC'}}];
assert.equal(matchSorareGame(clubs,{date:'2026-11-05T18:00:00Z',home:'Hoffenheim',away:'Crystal Palace'})?.id,'s1');
const photo='https://assets.sorare.com/something/avatar.png';
const photos=parseSorareFootballPhotos([{slug:'alexander-prass',displayName:'Alexander Prass',pictureUrl:photo},
  {slug:'oliver',displayName:'Oliver Baumann',pictureUrl:photo}], []);
assert.equal(photos.length,2);
assert.equal(photos[0].url,photo);
assert.equal(parseSorareFootballPhotos([{slug:'a',displayName:'John Smith',pictureUrl:photo},{slug:'b',displayName:'John Smith',pictureUrl:photo}],[]).length,0);
const roster=['A. Prass','Oliver Baumann','D. Henderson'];
assert.equal(matchSorarePlayer('A. Prass',photos,roster)?.name,'Alexander Prass');
assert.equal(matchSorarePlayer('Oliver Baumann',photos,roster)?.name,'Oliver Baumann');
assert.equal(matchSorarePlayer('A. Prass',photos,['A. Prass','Anthony Prass']),null);
assert.equal(matchSorarePlayer('A. Prass',photos,[...roster,'Andreas Prass']),null);
const scores=parseSorareFootballScores([{score:75.5,scoreStatus:'PENDING',footballPlayer:{slug:'alexander-prass',displayName:'Alexander Prass'}},
  {score:0,scoreStatus:'DID_NOT_PLAY',footballPlayer:{slug:'test',displayName:'Test Player'}}]);
assert.equal(matchSorarePlayer('A. Prass',scores,roster)?.score,75.5);
assert.equal(scores.length,1);
const route=fs.readFileSync(path.join(__dirname,'../app/api/football-live/sorare-scores/route.ts'),'utf8');
assert.ok(route.includes('competitionGames(fromDate: $from, toDate: $to, sport: FOOTBALL)'));
assert.ok(!/\bso5Fixture\s*\(/.test(route),'do not resurrect removed Query.so5Fixture');
assert.ok(route.includes('playerGameScores'));
assert.ok(route.includes('pictureUrl(derivative: "avatar")'));
const ui=fs.readFileSync(path.join(__dirname,'../features/matches/football-live-center.tsx'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../app/dream.css'),'utf8');
assert.ok(ui.includes('photoFor(p)??p.headshot'));
assert.ok(css.includes('.live-wrap .live-avatar img{position:absolute'));
console.log('V4.5.7: current Sorare schema fields, single-game matching, portraits, score and fallback tests passed');

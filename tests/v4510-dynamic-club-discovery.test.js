const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {
  resolveSorareClubSlug,matchSorareGame,sorareNameKey,
  parseSorareFootballPhotos,parseSorareFootballScores,matchSorarePlayer
}=require('../.test-build/lib/football-live-sorare');
const route=fs.readFileSync(path.join(__dirname,'../app/api/football-live/sorare-scores/route.ts'),'utf8');
assert.match(route,/clubsReady \{ name slug \}/,'Sorare public club catalog covers teams across leagues');
assert.match(route,/club\(slug: \$slug\)/,'high-cardinality club queries are individual');
assert.ok(!route.includes('verifiedClubSlugs'),'hardcoded team exceptions have been removed');
assert.match(route,/Promise\.allSettled\(resolvedSlugs\.slice\(0,2\)/,'club roster failures should not block other clubs');
assert.match(route,/photos:photosFromClubs/,'portraits available on unmatched fixtures');
assert.match(route,/competitionGames\(fromDate: \$from, toDate: \$to, sport: FOOTBALL\)/,'global Sorare match discovery remains');
assert.match(route,/node\(id: \$id\)/,'global Game node ID resolver remains');
assert.match(route,/status:'matched'/);
assert.ok(!route.includes('export const sorareLiveQueries'),'Next.js forbids extra route exports');
const catalog=[
  {name:'TSG 1899 Hoffenheim',slug:'hoffenheim-sinsheim'},
  {name:'Crystal Palace FC',slug:'crystal-palace-london'},
  {name:'Bayern München',slug:'bayern-muenchen'},
  {name:'Manchester City',slug:'manchester-city'},
  {name:'Paris Saint-Germain FC',slug:'paris-saint-germain'},
  {name:'Real Betis Balompié',slug:'real-betis'},
  {name:'Athletic Club Bilbao',slug:'athletic-club'},
  {name:'Olympique Marseille',slug:'olympique-marseille'}
];
for(const [source,slug] of [
  ['Hoffenheim','hoffenheim-sinsheim'],
  ['Crystal Palace','crystal-palace-london'],
  ['FC Bayern München','bayern-muenchen'],
  ['Man City','manchester-city'],
  ['PSG','paris-saint-germain'],
  ['Real Betis','real-betis'],
  ['Athletic Bilbao','athletic-club'],
  ['Marseille','olympique-marseille']
]){
  assert.equal(resolveSorareClubSlug(source,catalog),slug,`catalog must resolve ${source}`);
}
assert.equal(resolveSorareClubSlug('Unbekannter Verein',catalog),null);
assert.equal(resolveSorareClubSlug('United',catalog),null);
const duplicate=[...catalog,{name:'Manchester City',slug:'manchester-city-women'}];
assert.equal(resolveSorareClubSlug('Manchester City',duplicate),null,'duplicate names must not select women/youth clubs');
const game={id:'Game:nonhardcoded',date:'2026-11-06T20:00:00Z',homeTeam:{name:'Paris Saint-Germain',slug:'paris-saint-germain'},awayTeam:{name:'Manchester City',slug:'manchester-city'}};
const target={date:'2026-11-06T20:00:00Z',home:'PSG',away:'Man City'};
assert.equal(matchSorareGame([game],target,{home:'paris-saint-germain',away:'manchester-city'})?.id,game.id);
assert.equal(matchSorareGame([game],target,{home:'other-team',away:'manchester-city'}),null,'never match wrong verified Sorare club');
assert.equal(matchSorareGame([game,{...game,id:'Game:duplicate'}],target,{home:'paris-saint-germain',away:'manchester-city'}),null,'ambiguous games fail closed');
assert.equal(matchSorareGame([{...game,date:'2026-11-07T20:00:00Z'}],target),null,'kickoff window mandatory');
const portraits=parseSorareFootballPhotos([{slug:'john-smith',displayName:'John Smith',avatarPictureUrl:'https://sorare.test/smith.png'}],[]);
assert.equal(matchSorarePlayer('J. Smith',portraits,['J. Smith','D. Jones'])?.url,'https://sorare.test/smith.png');
const scores=parseSorareFootballScores([{score:53.6,scoreStatus:'PENDING',footballPlayer:{slug:'john-smith',displayName:'John Smith'}}]);
assert.equal(matchSorarePlayer('J. Smith',scores,['J. Smith'])?.score,53.6);
console.log('V4.5.10 dynamic Sorare club discovery and safe score/photo matching tests passed');

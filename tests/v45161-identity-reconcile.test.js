const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {clubIdentityKey,clubsIdentical,verifiedIdentityProposals}=require('../.test-build/lib/football-identity-reconcile-v45161');
const {linkStatsToOfficialMatches}=require('../.test-build/lib/football-stats-v4515');
const root=path.join(__dirname,'..');
const examples=[
 ['Liverpool FC','Liverpool'],['Stade Rennais F.C.','Stade Rennais'],
 ['FC Lorient','Lorient'],['Atlético de Madrid','Atlético Madrid'],
 ['Brighton & Hove Albion FC','Brighton & Hove Albion'],
 ['RC Strasbourg Alsace','Strasbourg'],['Olympique de Marseille','Marseille'],
 ['RC Lens','Lens'],['ESTAC Troyes','Troyes'],['Stade Brestois 29','Brest'],
 ['SK Puntigamer Sturm Graz','SK Sturm Graz'],
 ['SK Sturm Graz','SK Sturm Graz'],['Paris Saint-Germain','Paris Saint-Germain']
];
for(const [a,b] of examples)assert(clubsIdentical(a,b),`Expected club identity: ${a} / ${b}`);
for(const [a,b] of [['Liverpool','Everton'],['Manchester United','Manchester City'],['Real Madrid','Atlético Madrid'],['Stade Rennais','Lorient'],['Newcastle United','West Ham United']])
 assert(!clubsIdentical(a,b),`Must reject different clubs: ${a} / ${b}`);
assert.equal(clubIdentityKey(''), '');
const s={scoreId:'score-1',slug:'alexander-isak',playerName:'Alexander Isak',gameId:'g-1',
 date:'2026-10-22T19:00:00.000Z',home:'Liverpool FC',away:'Atlético de Madrid',team:'Liverpool FC'};
const e={scoreId:'score-1',source:'espn',sourceGameId:'espn-g-1',sourcePlayerId:'espn-p-1',
 playerName:'Alexander Isak',team:'Liverpool',opponent:'Atlético Madrid',date:'2026-10-22T19:00:00.000Z'};
const good=verifiedIdentityProposals([s],[e]);
assert.equal(good.length,1);assert.equal(good[0].providerPlayerId,'espn-p-1');
assert.equal(good[0].sorareSlug,'alexander-isak');
const combined=linkStatsToOfficialMatches([{source:'espn',sourceGameId:e.sourceGameId,sourcePlayerId:e.sourcePlayerId,
  date:e.date,competition:'UCL',team:e.team,opponent:e.opponent,season:null,minutes:90,
  started:true,stats:{shots:3},reportedFields:['shots']}],[{scoreId:s.scoreId,slug:s.slug,playerName:s.playerName,
  gameId:s.gameId,date:s.date,competition:'UCL',home:s.home,away:s.away,team:s.team,
  score:66,decisive:50,allAround:16,scoringVersion:1,stats:{},breakdown:[]}]);
assert.equal(combined[s.scoreId]?.length,1,'profile must join archived ESPN game to Sorare FINAL');
assert.equal(verifiedIdentityProposals([s],[{...e,opponent:'Real Madrid'}]).length,0,'wrong opponent');
assert.equal(verifiedIdentityProposals([s],[{...e,team:'Everton'}]).length,0,'wrong team');
assert.equal(verifiedIdentityProposals([s],[{...e,playerName:'Someone Else'}]).length,0,'wrong player');
assert.equal(verifiedIdentityProposals([s],[{...e,date:'2026-10-23T19:00:00.000Z'}]).length,0,'wrong kickoff');
assert.equal(verifiedIdentityProposals([s],[{...e,scoreId:'unknown'}]).length,0,'wrong score ID');
assert.equal(verifiedIdentityProposals([s],[{...e,sourcePlayerId:'espn-p-2'},e]).length,0,'ambiguous source player');
assert.equal(verifiedIdentityProposals([s],[e,e]).length,1,'duplicate identical observation is safe');
// One provider player identifier cannot be assigned to different Sorare identities.
const s2={...s,scoreId:'score-2',slug:'different-player',gameId:'g-2',date:'2026-11-01T19:00:00.000Z'};
const e2={...e,scoreId:'score-2',sourceGameId:'espn-g-2',date:s2.date};
assert.equal(verifiedIdentityProposals([s,s2],[e,e2]).length,0,'provider ID conflicts across Sorare slugs');
// One Sorare slug cannot accumulate different IDs from the same provider.
assert.equal(verifiedIdentityProposals([s,{...s2,slug:s.slug}],[e,{...e2,sourcePlayerId:'other-id'}]).length,0,'provider IDs conflicting for one slug');
// If Sorare itself exposes two player slugs for same name/game, fail closed.
assert.equal(verifiedIdentityProposals([s,{...s,slug:'other-isak',scoreId:'score-other'}],[e,{...e,scoreId:'score-other'}]).length,0);
const route=fs.readFileSync(path.join(root,'app/api/cron/v4515/route.ts'),'utf8');
const db=fs.readFileSync(path.join(root,'lib/football-stats-db-v4515.ts'),'utf8');
const pipeline=fs.readFileSync(path.join(root,'lib/football-stats-pipeline-v4515.ts'),'utf8');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/football-stats-import.yml'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'vercel.json')));
assert(route.includes("job==='reconcile'"));
assert(db.includes('reconcileArchivedFootballScores'));
assert(db.includes('AND (e.sorare_slug IS NULL OR e.sorare_slug=p.sorare_slug)'));
assert(pipeline.includes('v45161ReconcileArchivedScores'));
assert(workflow.includes('reconcile_import')&&workflow.includes('scripts/reconcile_football_stats.py --send'));
assert.equal(manifest.crons.filter(c=>c.path==='/api/cron/v4515?job=reconcile').length,1);
assert(!pipeline.includes('trainModel'));
console.log('V4.5.16.1 identity matching: clubs, full fixture, ambiguity rejection, cron and Github workflow passed');

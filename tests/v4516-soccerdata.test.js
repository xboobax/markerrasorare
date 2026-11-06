const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {SOCCERDATA_SOURCES,SOCCERDATA_KINDS,normalizeSoccerdataRecord,normalizeSoccerdataRecords,
  soccerdataMatchRows}=require('../.test-build/lib/football-soccerdata-v4516');
const P=path.join(__dirname,'..');
assert(SOCCERDATA_SOURCES.includes('understat')&&SOCCERDATA_SOURCES.includes('fbref')&&SOCCERDATA_SOURCES.includes('whoscored'));
assert(SOCCERDATA_KINDS.includes('player_season')&&SOCCERDATA_KINDS.includes('shot_event'));
const base={source:'understat',kind:'player_match',externalId:'urn:900:77',playerId:'77',
  playerName:'Harry Kane',team:'Bayern Munich',opponent:'Dortmund',competition:'GER-Bundesliga',
  season:'2026/2027',matchId:'900',fixtureStart:'2026-10-06T19:00:00Z',
  stats:{goals:1,xg:0.6,xa:0.1,shots:5,xgChain:0.8},meta:{isFinal:true,minutes:89,started:true}};
assert.equal(normalizeSoccerdataRecords([base]).length,1);
assert.equal(soccerdataMatchRows(normalizeSoccerdataRecords([base])).length,1);
assert.equal(soccerdataMatchRows(normalizeSoccerdataRecords([{...base,meta:{...base.meta,isFinal:false}}])).length,0);
assert.equal(soccerdataMatchRows(normalizeSoccerdataRecords([{...base,playerId:null}])).length,0);
assert.equal(soccerdataMatchRows(normalizeSoccerdataRecords([{...base,fixtureStart:null}])).length,0);
assert.equal(soccerdataMatchRows(normalizeSoccerdataRecords([{...base,opponent:null}])).length,0);
assert.equal(normalizeSoccerdataRecords([base,{...base,externalId:'o',stats:{xg:Infinity}}]).length,0);
assert.equal(normalizeSoccerdataRecords([base,{...base,source:'evil'}]).length,0);
assert.equal(normalizeSoccerdataRecords([base,{...base,kind:'prognosis'}]).length,0);
assert.equal(normalizeSoccerdataRecords([base,{...base,externalId:'other',meta:{evil:'x'.repeat(40000)}}]).length,2,'metadata bounded by truncation');
assert.equal(normalizeSoccerdataRecord({...base,stats:{xg:-2}}).stats.xg,-2,'metadata/ratings are not silently fabricated; match gate will reject negative');
assert.equal(soccerdataMatchRows(normalizeSoccerdataRecords([{...base,stats:{xg:-2}}])).length,0);
const raw={source:'fbref',kind:'player_season',externalId:'player:season:5',playerId:null,
  playerName:'Harry Kane',team:'Bayern Munich',opponent:null,competition:'GER-Bundesliga',
  season:'2026/2027',matchId:null,fixtureStart:null,stats:{goals:17,shots:65},meta:{minutes:1320}};
assert.equal(normalizeSoccerdataRecord(raw).stats.goals,17);
assert.equal(soccerdataMatchRows(normalizeSoccerdataRecords([raw])).length,0,'season totals must never impersonate matches');
const schema=fs.readFileSync(path.join(P,'schema/football-soccerdata-v4516.sql'),'utf8');
assert(schema.includes('football_stats_v4516_source_records'));
assert(schema.includes('football_stats_v4515_player_matches_source_check'));
assert(!schema.includes('DROP TABLE'));
for(const key of ['shot_event','player_season','lineup','match_event','team_rating','player_rating'])assert(schema.includes(key));
const route=fs.readFileSync(path.join(P,'app/api/cron/v4516/soccerdata/route.ts'),'utf8');
assert(route.includes('cronAuthorized')&&route.includes('normalizeSoccerdataRecords'));
const page=fs.readFileSync(path.join(P,'app/components/football-stats-panel.tsx'),'utf8');
assert(page.includes('soccerdataExtras')&&page.includes('SoccerData · weitere Saisonwerte'));
const pipe=fs.readFileSync(path.join(P,'lib/football-stats-pipeline-v4515.ts'),'utf8');
assert(pipe.includes('nextOffset')&&pipe.includes('offset+maxGames'));
assert(!pipe.includes('trainModel'));
console.log('V4.5.16 SoccerData: source-separated import, strict FINAL, no fabricated IDs, additive SQL, profile and backfill tests passed');

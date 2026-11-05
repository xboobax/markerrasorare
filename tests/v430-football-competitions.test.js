const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {FOOTBALL_COMPETITIONS,footballCompetitionsFor,footballCompetitionGroup,isNationalFootballLeague,isFootballLeagueKey,isFootballCompetitionFilter}=require('../.test-build/lib/football-competitions');
const {footballScoreboardPath,footballLiveScoreboard}=require('../.test-build/lib/football-live-server');
const {parseEspnFootballScoreboard,parseEspnFootballSummary}=require('../.test-build/lib/football-live-core');
const keys=FOOTBALL_COMPETITIONS.map(c=>c.key);
assert.equal(keys.length,new Set(keys).size,'competition keys must be unique');
for(const key of ['eng.1','esp.1','ger.1','fra.1','uefa.champions','uefa.europa','uefa.europa.conf','fifa.friendly','uefa.nations','fifa.world','fifa.worldq.uefa','fifa.worldq.caf','fifa.worldq.conmebol','fifa.worldq.afc','fifa.worldq.concacaf','conmebol.america','concacaf.gold','concacaf.nations.league','caf.nations','caf.nations_qual','afc.asian.cup'])assert.ok(isFootballLeagueKey(key),`${key} missing`);
assert.equal(isFootballLeagueKey('javascript:foo'),false,'never accept arbitrary paths');
assert.equal(isFootballCompetitionFilter('all'),false,'unbounded old `all` must not create fan-out');
assert.deepEqual(footballCompetitionsFor('europe'),['uefa.champions','uefa.europa','uefa.europa.conf']);
assert.equal(footballCompetitionsFor('leagues').length,4);
assert.equal(footballCompetitionsFor('clubs').length,7);
assert.equal(footballCompetitionsFor('international').length,17);
assert.deepEqual(footballCompetitionsFor('uefa.europa'),['uefa.europa']);
assert.equal(footballCompetitionGroup('uefa.champions'),'europe');
assert.equal(footballCompetitionGroup('fifa.friendly'),'international');
assert.equal(isNationalFootballLeague('uefa.nations'),true);
assert.equal(isNationalFootballLeague('uefa.champions'),false);
assert.ok(footballScoreboardPath('2026-11-05','fifa.friendly').includes('20261104-20261105'),'international games across Europe/Berlin midnight');
assert.ok(footballScoreboardPath('2026-11-05','uefa.champions').includes('20261105'));
const event=(id,date,home='Team A',away='Team B')=>({id,date,competitions:[{date,status:{type:{state:'pre',name:'STATUS_SCHEDULED',shortDetail:'Scheduled'}},competitors:[
  {homeAway:'home',team:{id:'1',displayName:home,abbreviation:'HOM'},score:null},
  {homeAway:'away',team:{id:'2',displayName:away,abbreviation:'AWY'},score:null}]}]});
const international=parseEspnFootballScoreboard({events:[event('401222222','2026-11-04T23:30:00Z','Germany','France')]},'2026-11-05T00:00:00Z','fifa.friendly');
assert.equal(international[0].leagueName,'Freundschaftsländerspiele');
const champions=parseEspnFootballScoreboard({events:[event('401222223','2026-11-05T20:00:00Z','Bayern München','Arsenal')]},'2026-11-05T20:00:00Z','uefa.champions');
assert.equal(champions[0].leagueName,'Champions League');
const summary={header:{id:'401222222',date:'2026-11-04T23:30:00Z',competitions:[event('401222222','2026-11-04T23:30:00Z','Germany','France').competitions[0]]},
  rosters:[{team:{id:'1'},roster:[{athlete:{id:'99',displayName:'Example Player',position:{abbreviation:'MID'}},starter:true}]}]};
const detail=parseEspnFootballSummary(summary,'401222222','2026-11-05T00:00:10Z','fifa.friendly');
assert.equal(detail.players.length,1,'confirmed national team roster available even before boxscore');
assert.equal(detail.players[0].starter,true);
assert.equal(detail.players[0].stats,null,'no fabricated stats from international lineup');
assert.equal(detail.players[0].score,null,'no fabricated Sorare score from international lineup');
assert.ok(detail.warning.includes('Kaderdaten'));
const oldFetch=global.fetch;
global.fetch=async url=>{
  const u=String(url);
  if(u.includes('/uefa.europa.conf/'))throw Error('test upstream failure');
  const d=u.includes('/uefa.europa/')?event('401222224','2026-11-05T18:00:00Z','Porto','Napoli'):
    u.includes('/uefa.champions/')?event('401222223','2026-11-05T20:00:00Z','Bayern','Arsenal'):
    event('401222222','2026-11-04T23:30:00Z','Germany','France');
  return {ok:true,json:async()=>({events:[d]})};
};
(async()=>{
  try{
    const europa=await footballLiveScoreboard('2026-11-05','europe');
    assert.equal(europa.games.length,2,'only available EU competition pages shown');
    assert.equal(europa.failedCompetitions[0],'Conference League');
    const nation=await footballLiveScoreboard('2026-11-05','fifa.friendly');
    assert.equal(nation.games.length,1,'late UTC kickoff must appear on correct Berlin day');
    const clubs=await footballLiveScoreboard('2026-11-05','clubs');
    assert.equal(clubs.games.length,3,'deduplicate cross-competition event IDs and restrict Berlin date');
    const here=path.join(__dirname,'..');
    const ui=fs.readFileSync(path.join(here,'features/matches/football-live-center.tsx'),'utf8');
    const api=fs.readFileSync(path.join(here,'app/api/football-live/scoreboard/route.ts'),'utf8');
    const apiGame=fs.readFileSync(path.join(here,'app/api/football-live/game/route.ts'),'utf8');
    assert.match(ui,/Europapokal/);assert.match(ui,/Länderspiele/);
    assert.match(ui,/isNationalFootballLeague\(selectedGame.leagueKey\)/,'no national team misidentified as club forecast');
    assert.match(ui,/activeCollectionCards\(cache,'football'\)/,'set ownership remains verified');
    assert.match(ui,/document\.hidden/);
    assert.match(api,/isFootballCompetitionFilter/);assert.match(apiGame,/isFootballLeagueKey/);
    console.log('V4.3: UEFA Europa and international competition groups, safe IDs, Berlin midnight, fallback, national roster and owned Set coverage passed');
  }finally{global.fetch=oldFetch;}
})().catch(error=>{console.error(error);process.exitCode=1});

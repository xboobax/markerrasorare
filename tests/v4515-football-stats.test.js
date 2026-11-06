const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {validStatsRow,fromUnderstatPayload,verifiedProfileMatches,normalizedName,sumStat,validatedEspnFinal,linkStatsToOfficialMatches}=require('../.test-build/lib/football-stats-v4515');
const {parseOfficialSorareHistory,OFFICIAL_SCORE_STAT_FIELDS}=require('../.test-build/lib/football-stats-sorare-v4515');
const P=path.join(__dirname,'..');
const row={sourceGameId:'900',sourcePlayerId:'77',playerName:'Harry Kane',team:'Bayern Munich',opponent:'Dortmund',competition:'GER-Bundesliga',fixtureStart:'2026-11-06T19:00:00Z',position:'FW',minutes:90,started:true,completed:true,stats:{xg:0.62,xa:0.12,goals:1,shots:4}};
const rows=fromUnderstatPayload([row,{...row,sourcePlayerId:'88',playerName:'Other',completed:false}, {...row,sourcePlayerId:'99',stats:{xg:-1}}]);
assert.equal(rows.length,1,'only valid explicitly FINAL stats');
assert.equal(rows[0].stats.xg,.62);assert.equal(rows[0].stats.xa,.12);
assert.equal(validStatsRow(rows[0]),true);
assert.equal(sumStat(rows,'xg'),.62);assert.equal(sumStat(rows,'notObserved'),null);
assert.deepEqual(fromUnderstatPayload([{...row,completed:false}]),[]);
assert.deepEqual(fromUnderstatPayload([{...row,stats:{xg:0/0}}]),[]);
// Linked IDs MUST carry provider prefix. Same numeric player-id elsewhere cannot match.
const people=[{source:'espn',sourcePlayerId:'77',playerName:'Someone Else',team:'Other'},
 {source:'understat',sourcePlayerId:'77',playerName:'Harry Kane',team:'Bayern Munich'}];
assert.deepEqual(verifiedProfileMatches(people,'Harry Kane','Bayern Munich',new Set(['understat:77'])),[people[1]]);
assert.deepEqual(verifiedProfileMatches(people,'Harry Kane','Bayern Munich',new Set(['espn:77'])),[people[0],people[1]]);
assert.equal(verifiedProfileMatches([{source:'espn',sourcePlayerId:'12',playerName:'Son',team:'Tottenham'}],'Son','Tottenham').length,1);
assert.equal(verifiedProfileMatches([{source:'espn',sourcePlayerId:'99',playerName:'Harry Kane',team:'Bayern München'}],'Harry Kane','Bayern Munich').length,1);
assert.equal(verifiedProfileMatches([{source:'espn',sourcePlayerId:'22',playerName:'Harry Kane',team:'Other'}],'Harry Kane','Bayern Munich').length,0);
// FINAL status must not be forged for an unrelated game, club, league or tipoff.
const game={id:'55',leagueKey:'Bundesliga',date:'2026-11-06T19:00:00Z',home:{id:'a'},away:{id:'b'},status:'final',statusText:'FT'};
const detail={game:{...game,status:'scheduled'},players:[]};
assert.equal(validatedEspnFinal(detail,game).game.status,'final');
assert.equal(validatedEspnFinal({...detail,game:{...detail.game,id:'66'}},game),null);
assert.equal(validatedEspnFinal({...detail,game:{...detail.game,date:'2026-11-07T19:00:00Z'}},game),null);
assert.equal(validatedEspnFinal(detail,{...game,status:'live'}),null);
// The Sorare official FINAL score (0..100) is preserved, NOT synthesized from xG or ESPN.
const sorare={anyPlayer:{displayName:'Harry Kane',allPlayerGameScores:{nodes:[
 {id:'score-1',score:77.5,scoreStatus:'FINAL',scoringVersion:6,
  footballGame:{id:'sogame1',date:'2026-11-06T19:00:00Z',competition:{name:'Bundesliga'},homeTeam:{name:'Bayern Munich'},awayTeam:{name:'Dortmund'}},
  footballPlayerGameStats:{anyTeam:{name:'Bayern Munich'},minsPlayed:90,goals:1,totalPass:33,duelWon:6},
  decisiveScore:{stat:'goal',totalScore:60,points:30},allAroundScore:17.5,
  detailedScore:[{stat:'totalPass',statValue:33,points:.2,totalScore:6.6,category:'PASSING'}]},
 {id:'score-2',score:99,scoreStatus:'PENDING',footballGame:{id:'sogame2',date:'2026-11-08T19:00:00Z'}},
 {id:'score-1',score:77.5,scoreStatus:'FINAL',footballGame:{id:'sogame1',date:'2026-11-06T19:00:00Z'}}]}}};
const parsed=parseOfficialSorareHistory(sorare,'harry-kane');
assert.equal(parsed.length,1);assert.equal(parsed[0].score,77.5);assert.equal(parsed[0].decisive,60);
assert.equal(parsed[0].allAround,17.5);assert.equal(parsed[0].breakdown[0].points,6.6);
assert.equal(parsed[0].stats.duelWon,6);
assert(OFFICIAL_SCORE_STAT_FIELDS.includes('totalPass'));
assert.deepEqual(parseOfficialSorareHistory(sorare,'invalid slug!'),[]);
const sampleMatch={source:'understat',sourceGameId:'900',sourcePlayerId:'77',date:'2026-11-06T19:00:00Z',competition:'Bundesliga',team:'Bayern München',opponent:'Dortmund',season:'2026',minutes:90,started:true,stats:{xg:.62},reportedFields:['xg']};
const linked=linkStatsToOfficialMatches([sampleMatch],parsed);assert.equal(linked['score-1'].length,1);
assert.deepEqual(linkStatsToOfficialMatches([{...sampleMatch,opponent:'Stuttgart'}],parsed),{});
assert.deepEqual(linkStatsToOfficialMatches([{...sampleMatch,date:'2026-11-07T20:00:00Z'}],parsed),{});

// Guardrail regression checks: cron auth and additive migration only, no forecast import path.
const dashboard=fs.readFileSync(path.join(P,'app/components/arcade-dashboard.tsx'),'utf8');
assert.match(dashboard,/^"use client";/,'Dashboard must keep client directive before imports');
assert(dashboard.includes('<FootballStatsPanel')&&dashboard.includes('<FootballStatsDiagnostics'));
const manifest=JSON.parse(fs.readFileSync(path.join(P,'vercel.json')));
const crons=manifest.crons.filter(c=>c.path.startsWith('/api/cron/v4515'));
assert.equal(crons.length,5);assert(new Set(crons.map(c=>c.path)).size===5);
const migration=fs.readFileSync(path.join(P,'schema/football-stats-v4515.sql'),'utf8');
for(const name of ['football_stats_v4515_player_matches','football_stats_v4515_sorare_scores','football_stats_v4515_identity_links','football_stats_v4515_import_cursor'])assert(migration.includes(`CREATE TABLE IF NOT EXISTS ${name}`));
const sql=fs.readFileSync(path.join(P,'lib/football-stats-db-v4515.ts'),'utf8');
assert(sql.includes('FROM incoming WHERE TRUE'), 'PostgreSQL INSERT ... SELECT ... ON CONFLICT needs a WHERE to disambiguate');
assert(!sql.includes('UPDATE learning_v44_snapshots'));
assert(sql.includes("CURRENT_DATE+INTERVAL '45 days'"),'Future-fixture snapshots seed the historic Sorare FINAL fetch');
assert(!fs.readFileSync(path.join(P,'lib/football-stats-pipeline-v4515.ts'),'utf8').includes('trainModel'));
console.log('V4.5.15 Football Stats Center: import validation, provider isolation, official scoring, FINAL matching, SQL + cron tests passed');

const assert=require('node:assert/strict');
const fs=require('node:fs');
const {eligibleFootballOptimizerIds,confirmedFootballKickoff,footballKickoffsFromScoreboards,verifyFootballOptimizerTransfer}=require('../.test-build/lib/football-smart-matchday');
const {buildFootballOptimizer}=require('../.test-build/lib/football-smart-optimizer');
const {forecast}=require('../.test-build/lib/model');
const {initialV30Settings}=require('../.test-build/lib/builder-v30');
const now=new Date('2026-11-06T12:00:00Z');
const players=[
 {id:'a',nextGame:'2026-11-06 FC Bayern München - Paris Saint-Germain',hasGame:true},
 {id:'b',nextGame:'2026-11-06 FC Bayern München - Paris Saint-Germain',hasGame:true},
 {id:'c',nextGame:'2026-11-06 FC Bayern München - Paris Saint-Germain',hasGame:true},
 {id:'d',nextGame:'2026-11-06 FC Bayern München - Paris Saint-Germain',hasGame:true},
 {id:'e',nextGame:'2026-11-06 FC Bayern München - Paris Saint-Germain',hasGame:true},
 {id:'x',nextGame:'2026-11-07 Borussia Dortmund - Manchester City',hasGame:true},
 {id:'unknown',nextGame:undefined,hasGame:null},
 {id:'nogame',nextGame:'2026-11-06 FC Bayern München - Paris Saint-Germain',hasGame:false},
];
const boards=[{games:[{id:'one',date:'2026-11-06T20:00:00Z',home:{name:'Bayern Munich'},away:{name:'PSG'},leagueKey:'uefa.champions',leagueName:'Champions League',status:'scheduled'},
  {id:'other',date:'2026-11-07T23:00:00Z',home:{name:'Borussia Dortmund'},away:{name:'Manchester City'},leagueKey:'uefa.champions',leagueName:'Champions League',status:'scheduled'}]}];
const fixturePlayers=players.map(p=>({...p,nextGameTipoff:undefined}));
assert.deepEqual([...eligibleFootballOptimizerIds(fixturePlayers,'today',now)].sort(),['a','b','c','d','e'].sort());
assert.deepEqual([...eligibleFootballOptimizerIds(fixturePlayers,'tomorrow',now)],['x']);
assert.deepEqual([...eligibleFootballOptimizerIds(fixturePlayers,'24h',now)],[],'no guessed 24h kickoffs');
const kickoffs=footballKickoffsFromScoreboards(boards);
// Verified aliases permit Munich/München and PSG; unrelated clubs still fail closed.
assert.equal(confirmedFootballKickoff(players[0],kickoffs),'2026-11-06T20:00:00Z');
assert.equal(confirmedFootballKickoff(players[5],kickoffs),null,'outside-day kickoff cannot be incorrectly matched');
const matched=[{home:'FC Bayern München',away:'Paris Saint-Germain',tipoff:'2026-11-06T20:00:00Z',status:'scheduled',league:'UCL'}];
assert.deepEqual([...eligibleFootballOptimizerIds(fixturePlayers,'24h',now,matched)].sort(),['a','b','c','d','e'].sort());
assert.equal(eligibleFootballOptimizerIds(fixturePlayers,'24h',new Date('2026-11-06T21:00:00Z'),matched).size,0,'started game must not enter 24h selection');
const duplicate=[...matched,...matched];
assert.equal(eligibleFootballOptimizerIds(fixturePlayers,'24h',now,duplicate).size,0,'ambiguous game pair fails closed');
const ids=['a','b','c','d','e'];
const positions=new Map([['a','GK'],['b','DEF'],['c','MID'],['d','FWD'],['e','MID']]);
assert.equal(verifyFootballOptimizerTransfer(ids,positions,new Set(ids),'c'),null);
assert.match(verifyFootballOptimizerTransfer(ids,positions,new Set(ids),'x'),/Captain/);
assert.match(verifyFootballOptimizerTransfer(ids,positions,new Set(ids.slice(1)),'c'),/bestätigt|ausgeschlossen/);
assert.match(verifyFootballOptimizerTransfer(['a','c','b','d','e'],positions,new Set(ids),'c'),/Torwart/);
assert.match(verifyFootballOptimizerTransfer(['a','b','c','d','d'],positions,new Set(ids),'c'),/verschiedene/);
const pos=['GK','DEF','MID','FWD','MID','DEF','FWD','MID','DEF','FWD','GK','MID','DEF'];
const cards=pos.map((position,i)=>({player:forecast({id:'f'+i,name:'Football '+i,team:'Club'+i,position,avg:75-i,proj:75-i,averageL5:75-i,averageL10:75-i,recentScores:[70,70,70,70,70],last5Apps:5,status:'STARTER',playOdds:.9,injuries:0,hasGame:true}),owned:true,bonusPercent:0}));
const board=buildFootballOptimizer(cards,{sport:'football',limit:10,advancedSettings:initialV30Settings()},2);
assert.ok(board.variants.length>0,'valid football variant exists');
assert.equal(board.variants[0].lineup.picks.length,5);
assert.deepEqual(board.variants[0].lineup.picks.map(p=>p.slot),['GK','DEF','MID','FWD','FLEX']);
assert.ok(board.variants.every(v=>v.lineup.projectedScore>=.9*board.referenceScore),'quality floor of alternatives');
const ui=fs.readFileSync('app/components/arcade-dashboard.tsx','utf8');
const manual=fs.readFileSync('app/components/builder-workspace.tsx','utf8');
for(const t of ['FOOTBALL OPTIMIZER 3.0','footballWindow','footballMatchdayCards','footballDiversity','transferFootballLineup','requestedFootballLineup'])assert.ok(ui.includes(t),t);
for(const t of ['verifyFootballOptimizerTransfer','onFootballLineupHandled','window.confirm','captainId:requestedFootballLineup.captainId'])assert.ok(manual.includes(t),t);
console.log('V4.5.14: verified football dates / 24h fail-closed, 4 profiles, captain & positions, safe auto-transfer OK');

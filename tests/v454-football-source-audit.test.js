const assert=require('node:assert/strict');
const {footballStatLine,footballNamedStatLine,parseEspnFootballSummary}=require('../.test-build/lib/football-live-core');
const {v454AuditFootballSummary}=require('../.test-build/lib/learning-v454-football-audit');
const {v45FootballObservations}=require('../.test-build/lib/learning-v45-performance');
const {FOOTBALL_COMPETITIONS}=require('../.test-build/lib/football-competitions');
const fixture={id:'401987654',date:'2026-11-05T18:45:00Z',status:{type:{state:'post',completed:true,name:'STATUS_FINAL'}},competitors:[
  {homeAway:'home',team:{id:'21',displayName:'France'}},
  {homeAway:'away',team:{id:'22',displayName:'Germany'}}]};
const header={id:'401987654',date:'2026-11-05T18:45:00Z',competitions:[fixture]};
const athlete=(id,name)=>({id,displayName:name,position:{abbreviation:'MID'}});
const source={header,rosters:[{team:{id:'21'},roster:[
  {athlete:athlete('10201','Example Star'),starter:true,statistics:[{name:'minutes',value:'88'},{name:'goals',value:'1'},{name:'assists',value:'--'}]},
  {athlete:athlete('10202','Bench Unused'),starter:false},
  {athlete:athlete('10203','Out'),starter:false,didNotPlay:true,statistics:{goals:5,minutes:90}}]},
  {team:{id:'22'},roster:[{athlete:athlete('10204','Example German'),stats:{minutes:'74',assists:'1',goals:'--'}}]}]};
const detail=parseEspnFootballSummary(source,header.id,'2026-11-05T23:00:00Z','uefa.nations');
assert.equal(detail.game.status,'final');
assert.equal(detail.players.length,4);
assert.equal(v45FootballObservations(detail).length,2,'only verifiable athletes are archived');
const rows=v45FootballObservations(detail);
assert.deepEqual(rows.map(r=>r.playerId).sort(),['10201','10204']);
assert.equal(rows.find(r=>r.playerId==='10201').stats.goals,1);
assert.equal(rows.find(r=>r.playerId==='10201').stats.assists,undefined,'dash must not be zero');
assert.equal(rows.find(r=>r.playerId==='10204').stats.assists,1);
assert.equal(rows.find(r=>r.playerId==='10204').stats.goals,undefined);
const audit=v454AuditFootballSummary(source,detail);
assert.equal(audit.archiveReady,2);assert.equal(audit.reason,'ready');
assert.equal(audit.rosterEntries,4);
const blank=footballStatLine(['MIN','G','A'],['--','--','--']);
assert.equal(blank,null,'blank match stats are missing, not zero');
assert.equal(footballNamedStatLine({goals:'--',minutes:'--'}),null);
assert.equal(footballNamedStatLine([{name:'minutes',value:78},{name:'assists',value:0}]).observedFields.includes('assists'),true,'reported zero allowed');
const rosterOnly={header,rosters:[{team:{id:'21'},roster:[{athlete:athlete('10201','Example Star'),starter:true}]}]};
const blankDetail=parseEspnFootballSummary(rosterOnly,header.id,'2026-11-05T23:00:00Z','uefa.nations');
assert.equal(v45FootballObservations(blankDetail).length,0);
assert.equal(v454AuditFootballSummary(rosterOnly,blankDetail).reason,'source_has_no_parseable_individual_stats');
const keys=FOOTBALL_COMPETITIONS.map(c=>c.key);
for(const league of ['eng.1','esp.1','ger.1','fra.1','uefa.champions','uefa.europa','uefa.europa.conf','uefa.nations','fifa.friendly','fifa.worldq.uefa','fifa.world'])assert.ok(keys.includes(league));
console.log('V4.5.4: alternate named roster stats, missing cell preservation, no DNP/lineup fabrication, anonymous audit, competitions passed');

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {getNbaGameweekSchedule}=require('../.test-build/lib/nba-gameweek-feed');
const {canonicalNbaTeam,attachNbaFixtures}=require('../.test-build/lib/nba-fixture-mapping');
const {gameDate,withinHorizon}=require('../.test-build/lib/builder-workspace');
const {forecast}=require('../.test-build/lib/model');

for(const [input,expected] of [
  ['Los Angeles Clippers','LA Clippers'],['LA Clippers','LA Clippers'],['Clippers','LA Clippers'],
  ['LA Lakers','Los Angeles Lakers'],['Los Angeles Lakers','Los Angeles Lakers'],
  ['Philadelphia 76ers','Philadelphia 76ers'],['Sixers','Philadelphia 76ers'],
  ['Portland Trail Blazers','Portland Trail Blazers'],['Wizards','Washington Wizards'],
]) assert.equal(canonicalNbaTeam(input),expected);
assert.equal(canonicalNbaTeam('Los Angeles Team X'),null,'unknown teams must not be matched by a partial city name');
const player=(id,team)=>forecast({id,name:id,team,position:'G',avg:38,averageL5:40,averageL10:38,
  proj:43,recentScores:[30,42,41,36,50],last5Apps:5,status:'',playOdds:null,injuries:0,hasGame:null});
const original=[player('one','Los Angeles Clippers'),player('two','Philadelphia 76ers'),player('three','Bogus Franchise')];
const fixture={id:'nba:espn:100',date:'2026-11-05',home:'LA Clippers',away:'Philadelphia 76ers',
  tipoff:'2026-11-05T01:30:00.000Z',source:'ESPN',playerIds:[]};
const schedule={status:'available',source:'ESPN',fixtures:[fixture]};
const enriched=attachNbaFixtures(original,schedule);
assert.equal(enriched[0].opponent,'Philadelphia 76ers');assert.equal(enriched[1].opponent,'LA Clippers');
assert.equal(enriched[0].nextGame,'2026-11-05 LA Clippers - Philadelphia 76ers');
assert.equal(enriched[0].nextGameTipoff,fixture.tipoff);
assert.equal(enriched[0].hasGame,true);
assert.equal(enriched[0].weighted,original[0].weighted,'forecast scores must never be recalculated by fixture mapping');
assert.equal(enriched[0].playProb,original[0].playProb);
assert.strictEqual(enriched[2],original[2],'unknown franchises are never guessed');
assert.deepEqual(attachNbaFixtures(original,{status:'unavailable',source:null,fixtures:[]}),original);
const kickoff=gameDate(enriched[0]);
assert.equal(kickoff.toISOString(),fixture.tipoff);
assert.equal(withinHorizon(kickoff,24,new Date('2026-11-04T12:00:00Z'),true),true);
assert.equal(withinHorizon(kickoff,12,new Date('2026-11-04T12:00:00Z'),true),false);
assert.equal(withinHorizon(kickoff,24,new Date('2026-11-06T12:00:00Z'),true),false);
assert.equal(gameDate({nextGame:'2026-11-06 A - B'}).toISOString().slice(0,10),'2026-11-06');

function event(id,date,home,away,completed=false){return {id,date,status:{type:{completed,state:completed?'post':'pre',name:completed?'STATUS_FINAL':'STATUS_SCHEDULED'}},
  competitions:[{competitors:[{homeAway:'away',team:{displayName:away}},{homeAway:'home',team:{displayName:home}}]}]};}
(async ()=>{
 const previous=process.env.BALLDONTLIE_API_KEY,fetchBefore=global.fetch;
 try{
  delete process.env.BALLDONTLIE_API_KEY;
  const calls=[];
  global.fetch=async url=>{calls.push(String(url));assert(String(url).includes('site.api.espn.com'));
    return {ok:true,json:async()=>({events:[
      event('a','2026-11-05T01:30:00Z','LA Clippers','Philadelphia 76ers'),
      event('a','2026-11-05T01:30:00Z','LA Clippers','Philadelphia 76ers'),
      event('b','2026-11-06T01:30:00Z','Miami Heat','Boston Celtics',true),
      event('c','2026-11-16T01:30:00Z','Chicago Bulls','Detroit Pistons'),
      event('d','2026-10-27T01:30:00Z','Chicago Bulls','Detroit Pistons'),
    ]})};};
  const fallback=await getNbaGameweekSchedule(new Date('2026-11-03T12:00:00Z'));
  assert.equal(fallback.status,'available');assert.equal(fallback.source,'ESPN');
  assert.equal(fallback.fixtures.length,2,'exclude duplicates, finals, out-of-window games');
  assert.equal(fallback.fixtures[0].tipoff,'2026-11-05T01:30:00.000Z');
  assert(calls.some(x=>x.includes('dates=202611')),'monthly fetch should cover the 14 day horizon');
  process.env.BALLDONTLIE_API_KEY='key';
  let providers=[];
  global.fetch=async url=>{providers.push(String(url));
    if(String(url).includes('api.balldontlie.io'))return {ok:false,status:403};
    return {ok:true,json:async()=>({events:[event('1','2026-11-05T01:30:00Z','LA Clippers','Philadelphia 76ers')]})};
  };
  const failover=await getNbaGameweekSchedule(new Date('2026-11-03T12:00:00Z'));
  assert.equal(failover.source,'ESPN');assert(providers.some(x=>x.includes('api.balldontlie.io')));
  global.fetch=async url=>{
    if(!String(url).includes('api.balldontlie.io'))throw Error('should use primary provider');
    return {ok:true,json:async()=>({data:[{id:12,date:'2026-11-04',datetime:'2026-11-05T01:30:00Z',
      home_team:{full_name:'LA Clippers'},visitor_team:{full_name:'Philadelphia 76ers'},status:'7:30 pm ET'}],meta:{next_cursor:null}})};
  };
  const primary=await getNbaGameweekSchedule(new Date('2026-11-03T12:00:00Z'));
  assert.equal(primary.source,'BALLDONTLIE');assert.equal(primary.fixtures[0].date,'2026-11-05','Berlin calendar day matters, not US game date');
  assert.equal(primary.fixtures[0].tipoff,'2026-11-05T01:30:00.000Z');
  global.fetch=async()=>({ok:false,status:403});
  const none=await getNbaGameweekSchedule(new Date('2026-11-03T12:00:00Z'));
  assert.equal(none.status,'unavailable');assert.equal(none.fixtures.length,0);
  assert(none.note.includes('HTTP 403'),'display honest provider failure');
  const page=fs.readFileSync(path.join(__dirname,'../features/core/workspace-server.ts'),'utf8');
  const builder=fs.readFileSync(path.join(__dirname,'../app/components/builder-workspace.tsx'),'utf8');
  assert(page.includes('attachNbaFixtures(players,nbaSchedule)'));
  assert(builder.includes('fixtureTime(p)'));
  console.log('V2.4.1 NBA fixtures: independent ESPN fallback, franchise mapping, verified tipoffs, German dates, 24h filters, score isolation passed.');
 }finally{global.fetch=fetchBefore;if(previous===undefined)delete process.env.BALLDONTLIE_API_KEY;else process.env.BALLDONTLIE_API_KEY=previous;}
})().catch(e=>{console.error(e);process.exitCode=1;});

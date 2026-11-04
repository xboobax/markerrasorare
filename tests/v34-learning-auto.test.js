const assert=require('node:assert/strict');
const {forecast}=require('../.test-build/lib/model.js');
const {safeBeforeFixture,freezeCloudPredictions}=require('../.test-build/lib/learning-snapshot.js');
const {learningSummary}=require('../.test-build/lib/learning-metrics.js');
const {cronAuthorized}=require('../.test-build/lib/learning-cron-auth.js');
const {matchingGameDay,findFinalForSnapshot,pendingForAutoCheck}=require('../.test-build/lib/tracking-auto.js');
const {parseTrackingBackup}=require('../.test-build/lib/tracking.js');
const {validProRow}=require('../.test-build/lib/prediction-lab-pro.js');
const {freezeSnapshots,freezeOfficialResults,readCloudArchive,writeJobStatus,readJobStatus}=require('../.test-build/lib/learning-cloud.js');
const {CAPTURE_SCOPES,validCaptureScope,resultShard}=require('../.test-build/lib/learning-pipeline.js');
const now=new Date('2026-12-04T14:00:00.000Z');
const raw={id:'nba-testing-1',name:'Example NBA',team:'Denver Nuggets',position:'G',avg:42,averageL5:45,averageL10:42,proj:44,
  recentScores:[49,44,48,38,39,50,41,37,44,45],last5Apps:5,status:'STARTER',playOdds:.9,injuries:0,
  nextGame:'2026-12-04 Denver Nuggets - Boston Celtics',nextGameTipoff:'2026-12-05T00:30:00Z',hasGame:true,opponent:'Boston Celtics'};
const player=forecast(raw);
assert.equal(safeBeforeFixture(player,'nba',now),true,'NBA same-day pre-tipoff accepted');
assert.equal(safeBeforeFixture({...player,nextGameTipoff:undefined},'nba',now),false,'no same-day snapshot without trusted tipoff');
assert.equal(safeBeforeFixture({...player,nextGameTipoff:'2026-12-04T12:00:00Z'},'nba',now),false,'no snapshot after tipoff');
assert.equal(safeBeforeFixture({...player,nextGame:'2026-12-03 ABC - XYZ'},'nba',now),false,'no retroactive snapshots');
assert.equal(safeBeforeFixture({...player,nextGame:'2026-12-05 ABC - XYZ',nextGameTipoff:undefined},'nba',now),true);
assert.equal(safeBeforeFixture({...player,nextGame:'2026-12-04 ABC - XYZ'},'football',now),false,'date-only football fixtures need the next calendar day');
assert.equal(safeBeforeFixture({...player,forecastSources:[]},'nba',now),false,'no invented projections for empty sources');
const [snap]=freezeCloudPredictions([player,player], 'nba',{},now);
assert.ok(snap);assert.equal(snap.modelVersion,'1.8.0');assert.equal(snap.selectedMode,'v2');
assert.equal(snap.fixtureTipoff,'2026-12-05T00:30:00Z');
assert.equal(typeof snap.engineV2Predicted,'number');
assert.equal(freezeCloudPredictions([player,player],'nba',{},now).length,1,'dedup players');
assert.equal(matchingGameDay(snap,'2026-12-05'),true,'verified UTC rollover');
assert.equal(matchingGameDay({...snap,fixtureTipoff:undefined},'2026-12-05'),false,'unverified adjacent date forbidden');
assert.equal(findFinalForSnapshot(snap,[{date:'2026-12-05',score:56,status:'FINAL'}]).score,56);
assert.equal(findFinalForSnapshot(snap,[{date:'2026-12-05',score:56,status:'LIVE'}]),null);
assert.equal(findFinalForSnapshot(snap,[{date:'2026-12-05',score:56,status:'FINAL'},{date:'2026-12-04',score:44,status:'FINAL'}]),null,'ambiguous scores remain unresolved');
const checked=pendingForAutoCheck([snap],new Date('2026-12-06T14:00:00Z'));
assert.equal(checked.length,1);assert.equal(checked[0].fixtureTipoff,snap.fixtureTipoff);
const official={...snap,actual:56,actualSource:'sorare',actualGameDate:'2026-12-05'};
assert.equal(validProRow(official,'nba'),true,'trusted tipoff validates same-day pregame capture');
assert.equal(parseTrackingBackup([official],'nba')[0].fixtureTipoff,snap.fixtureTipoff);
assert.equal(learningSummary([official],'nba').eligible,1);
assert.equal(learningSummary([snap],'nba').winner,null,'no invented winner');
assert.equal(learningSummary([{...official,savedAt:'2026-12-05T02:00:00Z'}],'nba').eligible,0,'after-tipoff data excluded');
assert.equal(cronAuthorized('Bearer some-very-long-random-secret','some-very-long-random-secret'),true);
assert.equal(cronAuthorized('Bearer invalid','some-very-long-random-secret'),false);
assert.equal(cronAuthorized('Bearer something','short'),false);
assert.ok(CAPTURE_SCOPES.includes('nba-2')&&CAPTURE_SCOPES.includes('football-Ligue 1-1'));
assert.equal(validCaptureScope('nba-4'),false);
assert.equal(resultShard('nba-testing-1'),resultShard('nba-testing-1'));

// Mock the official Upstash REST contract: SET NX, ZADD NX, ZREVRANGE, MGET.
const memory=new Map(),indexes=new Map();
const oldFetch=global.fetch;
process.env.UPSTASH_REDIS_REST_URL='https://unit-test.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN='test-only';
const apply=([name,...args])=>{
  if(name==='SET'){
    const [key,value,mode]=args;if(mode==='NX'&&memory.has(key))return null;
    memory.set(key,value);return 'OK';
  }
  if(name==='ZADD'){
    const [key,mode,score,member]=args;const z=indexes.get(key)??new Map();
    if(mode==='NX'&&z.has(member))return 0;
    z.set(member,score);indexes.set(key,z);return 1;
  }
  if(name==='ZREVRANGE'){
    const [key,start,end]=args;return [...(indexes.get(key)??new Map()).entries()].sort((a,b)=>b[1]-a[1]).slice(start,end+1).map(([k])=>k);
  }
  if(name==='MGET')return args.map(k=>memory.get(k)??null);
  throw Error('Unexpected test command '+name);
};
global.fetch=async (url,init)=>{
  const commands=JSON.parse(init.body),pipeline=url.endsWith('/pipeline');
  const result=pipeline?commands.map(c=>({result:apply(c)})):{result:apply(commands)};
  return {ok:true,json:async()=>result};
};
(async()=>{
  assert.equal(await freezeSnapshots('nba',[snap,snap]),1,'NX freezes duplicate snapshot');
  assert.equal(await freezeSnapshots('nba',[{...snap,predicted:999}]),0,'cannot revise frozen forecast');
  let data=await readCloudArchive('nba');assert.equal(data.length,1);assert.equal(data[0].predicted,snap.predicted);assert.equal(data[0].actual,null);
  assert.equal(await freezeOfficialResults([{key:snap.key,score:56,gameDate:'2026-12-05'}]),1);
  assert.equal(await freezeOfficialResults([{key:snap.key,score:99,gameDate:'2026-12-05'}]),0,'official scores are write-once');
  data=await readCloudArchive('nba');assert.equal(data[0].actual,56);assert.equal(data[0].actualSource,'sorare');
  await writeJobStatus({scope:'capture:nba-0',at:now.toISOString(),ok:true,saved:1});
  assert.equal((await readJobStatus(['capture:nba-0']))[0].saved,1);
  console.log('V3.4: safe immutable snapshots, cloud persistence, official matching, three-model metrics and cron auth OK');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{global.fetch=oldFetch;});

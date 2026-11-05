const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {v45NbaObservations,v45FootballObservations,v45Validated}=require('../.test-build/lib/learning-v45-performance');
const nba={source:'ESPN Gamecast',updatedAt:'2026-11-05T10:00:00Z',warning:null,
  game:{id:'401789999',date:'2026-11-05T01:00:00Z',status:'final',home:{id:'11',name:'Dallas Mavericks'},away:{id:'22',name:'Boston Celtics'}},
  players:[{id:'4567',teamId:'11',name:'Luka Doncic',starter:true,played:true,
    stats:{minutes:38,points:33,rebounds:9,assists:10,threes:5,threeAttempts:11,steals:2,blocks:1,turnovers:3}},
    {id:'4568',teamId:'11',name:'Bench DNP',starter:false,played:false,stats:null}],plays:[]};
const rows=v45NbaObservations(nba);
assert.equal(rows.length,1);assert.deepEqual(rows[0].reportedFields,['points','rebounds','assists','threes','threeAttempts','steals','blocks','turnovers']);
assert.equal(rows[0].stats.threeAttempts,11);assert.equal(rows[0].minutes,38);assert.equal(rows[0].started,true);
assert.equal(v45NbaObservations({...nba,game:{...nba.game,status:'live'}}).length,0,'live data must not be archived');
assert.equal(v45NbaObservations({...nba,players:[{...nba.players[0],stats:{...nba.players[0].stats,threeAttempts:null}}]})[0].stats.threeAttempts,undefined,'missing 3PA is NOT zero');
assert.equal(v45Validated([...rows,...rows],'nba').length,1,'idempotent within batch');
assert.equal(v45Validated(rows,'football').length,0,'never cross sports');
const foot={source:'ESPN Gamecast',updatedAt:'2026-11-05T21:00:00Z',warning:null,
  game:{id:'401778888',date:'2026-11-05T19:00:00Z',status:'final',leagueKey:'uefa.champions',home:{id:'55',name:'Arsenal'},away:{id:'66',name:'Barcelona'}},
  players:[{id:'9876',teamId:'55',name:'Football Player',starter:true,played:true,position:'MID',stats:{minutes:89,goals:0,assists:1,
    tacklesWon:2,interceptions:1,duelsWon:0,observedFields:['minutes','assists','tacklesWon','interceptions'],reportedFields:['assists','accuratePasses'],
    sorareEvents:{accuratePasses:45,duelsWon:7,missedPasses:4,netDuels:-2}}},
    {id:'9877',teamId:'55',name:'No Stats',starter:true,played:false,position:'MID',stats:null}],plays:[]};
const f=v45FootballObservations(foot);
assert.equal(f.length,1);assert.equal(f[0].competition,'uefa.champions');assert.equal(f[0].stats.accuratePasses,45);
assert.equal(f[0].stats.duelsWon,7);assert.equal(f[0].stats.missedPasses,4);assert.equal(f[0].stats.netDuels,-2);assert.equal(f[0].stats.assists,1);assert.equal(f[0].stats.goals,undefined,'unreported goals must NOT be fake zero');
assert.equal(f[0].stats.tacklesWon,2);assert.equal(f[0].stats.chancesCreated,undefined);
assert.equal(v45FootballObservations({...foot,game:{...foot.game,status:'scheduled'}}).length,0);
const root=path.join(__dirname,'..');
for(const f of ['schema/learning-v45-performance.sql','lib/learning-v45-db.ts','lib/learning-v45-pipeline.ts',
  'features/matches/football-live-center.tsx','app/api/learning-v45/route.ts','app/components/prediction-performance-v45.tsx'])assert.ok(fs.existsSync(path.join(root,f)),f);
const config=require('../vercel.json');const jobs=config.crons.filter(j=>j.path.includes('job=playerstats'));
assert.equal(jobs.length,12);assert.equal(config.crons.length,32);
for(const job of jobs)assert.match(job.schedule,/^\d{1,2} \d{1,2} \* \* \*$/);
const cron=fs.readFileSync(path.join(root,'app/api/cron/v44/route.ts'),'utf8');assert.match(cron,/cronAuthorized/);assert.match(cron,/job==='playerstats'/);
const schema=fs.readFileSync(path.join(root,'schema/learning-v45-performance.sql'),'utf8');assert.match(schema,/PRIMARY KEY \(sport, competition, game_id, player_id\)/);
const query=fs.readFileSync(path.join(root,'lib/learning-v45-db.ts'),'utf8');assert.match(query,/jsonb_to_recordset/);assert.match(query,/WHERE sport=\$\{v452SportSql\(sport\)\}/);
assert.match(fs.readFileSync(path.join(root,'lib/learning-v45-performance.ts'),'utf8'),/game.status!=='final'/);
assert.match(fs.readFileSync(path.join(root,'app/components/prediction-learning-v44.tsx'),'utf8'),/PredictionPerformanceV45/);
console.log('V4.5: strict final observations, missing-stat preservation, per-sport isolation, dedupe, migration, dashboard and 12 daily cron jobs passed');

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {v455FootballStatsDays,v455SelectPendingGames}=require('../.test-build/lib/learning-v455-backfill');
const date=new Date('2026-11-06T15:00:00Z');
assert.deepEqual(v455FootballStatsDays('europe',date),['2026-11-06','2026-11-05','2026-11-04','2026-11-03','2026-11-02']);
assert.deepEqual(v455FootballStatsDays('league-a',date),['2026-11-06','2026-11-05']);
assert.deepEqual(v455FootballStatsDays('national-0',date),['2026-11-06','2026-11-05']);
const raw=[{id:'401',leagueKey:'uefa.champions',date:'2026-11-04T20:00:00Z'},
  {id:'402',leagueKey:'uefa.champions',date:'2026-11-03T20:00:00Z'},
  {id:'403',leagueKey:'uefa.europa',date:'2026-11-03T20:00:00Z'}];
assert.deepEqual(v455SelectPendingGames(raw,new Set(['uefa.champions:402'])).map(g=>g.id),['403','401']);
assert.deepEqual(v455SelectPendingGames(raw,new Set(),1).map(g=>g.id),['402']);
assert.deepEqual(v455SelectPendingGames(raw,new Set(raw.map(g=>g.leagueKey+':'+g.id))),[]);
const root=path.join(__dirname,'..');
const crons=require('../vercel.json').crons;
assert.equal(crons.filter(c=>c.path.startsWith('/api/cron/v44')).length,32,'original V4.4 jobs preserved');
const route=fs.readFileSync(path.join(root,'app/api/cron/v44/route.ts'),'utf8');
assert.match(route,/cronAuthorized/,'backfill remains behind existing cron authentication');
const code=fs.readFileSync(path.join(root,'lib/learning-v45-pipeline.ts'),'utf8');
assert.match(code,/v455ArchivedFootballGames/);
assert.match(code,/v45SavePerformances\('football',all\)/);
console.log('V4.5.5: 5-day Europe catch-up, bounded batches, archived-game dedupe, unchanged protected crons passed');

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {v453ChoosePage}=require('../.test-build/lib/learning-v453-reconcile');
const source=path.join(__dirname,'..');
const entries=Array.from({length:73},(_,i)=>i);
const seen=new Set();
for(let d=0;d<4;d++){
  const result=v453ChoosePage(entries,new Date(d*86400000),24);
  assert.equal(result.pages,4);assert.ok(result.selected.length<=24);
  for(const i of result.selected)seen.add(i);
}
assert.equal(seen.size,73,'every pending player must be reached across rotations');
assert.deepEqual(v453ChoosePage([],new Date(0)),{selected:[],page:0,pages:1,total:0});
const pipeline=fs.readFileSync(path.join(source,'lib/learning-v44-pipeline.ts'),'utf8');
assert.match(pipeline,/v44Pending\(sport,1000\)/);
assert.match(pipeline,/v453ChoosePage/);
const db=fs.readFileSync(path.join(source,'lib/learning-v44-db.ts'),'utf8');
assert.match(db,/fixture_day<CURRENT_DATE/,'no same-day score checks are implied');
const route=fs.readFileSync(path.join(source,'app/api/learning-diagnostics/route.ts'),'utf8');
assert.match(route,/readyForReconciliation/);
console.log('V4.5.3: pending-page fairness and read-only fixture readiness checks passed');

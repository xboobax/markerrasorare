const assert=require('node:assert/strict');
const {persistArchive,loadArchive}=require('../.test-build/lib/prediction-db.js');
const key='markerras.sorare.tracking.v1.nba';
let storage=new Map();
global.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const original={key:'nba:player-a:2026-11-09 Match',sport:'nba',playerId:'player-a',playerName:'A Player',team:'A',
  fixture:'2026-11-09 Match',savedAt:'2026-11-03T12:00:00Z',predicted:42,playProbability:.94,actual:null,
  baselinePredicted:41,advancedPredicted:42,intervalP10:15,intervalP90:69,modelVersion:'1.8.0',selectedMode:'classic'};
(async()=>{
  const backend=await persistArchive('nba',[original]);
  assert.equal(backend,'localStorage');
  assert.equal(JSON.parse(storage.get(key))[0].advancedPredicted,42);
  const read=await loadArchive('nba');
  assert.equal(read.rows.length,1);
  assert.equal(read.rows[0].modelVersion,'1.8.0');
  assert.equal((await loadArchive('football')).rows.length,0);
  console.log('V1.8 browser DB fallback and v1.7 backward-compatibility passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});

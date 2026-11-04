const assert=require('node:assert/strict');
const fs=require('node:fs');
const {indexCurrentCardAssets,sortPlayersWithCachedValues}=require('../.test-build/lib/performance');
const original=[{assetId:'1',sport:'FOOTBALL',playerSlug:'player',rarity:'limited',seasonYear:2026,bonusPercent:5},
  {assetId:'2',sport:'FOOTBALL',playerSlug:'player',rarity:'limited',seasonYear:2026,bonusPercent:20},
  {assetId:'3',sport:'NBA',playerSlug:'nba',rarity:'rare',seasonYear:2026,bonusPercent:10}];
const group=indexCurrentCardAssets(original);
assert.deepEqual(group.get('player').map(c=>c.assetId),['2','1']);
assert.equal(group.get('nba').length,1);
assert.equal(group.has('old'),false);
assert.deepEqual(original.map(c=>c.assetId),['1','2','3']); // no mutation
let scored=0;
const players=[{id:'c',name:'Charlie',points:32},{id:'a',name:'Anton',points:51},{id:'b',name:'Berta',points:null}];
const sorted=sortPlayersWithCachedValues(players,p=>{scored++;return p.points;},(a,b)=>a===null?b===null?0:1:b===null?-1:b-a);
assert.equal(scored,3,'one expensive rank calculation per player');
assert.deepEqual(sorted.map(p=>p.id),['a','c','b']);
assert.deepEqual(players.map(p=>p.id),['c','a','b'],'input should not be mutated');
const dashboard=fs.readFileSync('app/components/arcade-dashboard.tsx','utf8');
const builder=fs.readFileSync('app/components/builder-workspace.tsx','utf8');
assert.match(dashboard,/activeTab!=="builder"\|\|builderMode!=="automatic"/,'auto optimizer must not run in manual/hidden tabs');
assert.match(dashboard,/activeTab==="missions"&&<DailyMissionPicker/,'daily ranking should mount on demand');
assert.match(dashboard,/activeTab==="players"&&<HiddenGems/,'hidden gems should mount on demand');
assert.match(dashboard,/gameweekOpen&&<GameweekCenter/,'gameweek should not compute when collapsed');
assert.match(builder,/sortPlayersWithCachedValues/);
assert.match(builder,/indexCurrentCardAssets/);
assert.match(builder,/useDeferredValue\(query\)/);
assert.match(builder,/export default memo\(BuilderWorkspace\)/,'builder state remains mounted but skips unrelated rerenders');
assert.match(dashboard,/predictionCache.current=next/,'prediction engine reuses unchanged player calculations');
assert.match(dashboard,/activeTab==="analytics"&&\(<section/,'hidden analytics workspaces are not rendered');
assert.match(dashboard,/activeTab==="players"&&\(<section/,'hidden player workspaces are not rendered');
console.log('V3.9.1: deferred tab work, cached player ranking, pre-indexed cards and original order protected OK');

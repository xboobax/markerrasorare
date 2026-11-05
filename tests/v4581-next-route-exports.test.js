const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const route=fs.readFileSync(path.resolve(__dirname,'../app/api/football-live/sorare-scores/route.ts'),'utf8');
assert.doesNotMatch(route,/export\s+(?:const|let|var|function|class)\s+sorareLiveQueries\b/,
  'Next.js route modules must not export sorareLiveQueries');
const namedExports=Array.from(route.matchAll(/export\s+(?:const|let|var|function|class|async function)\s+(\w+)/g),m=>m[1]);
const allowed=new Set(['GET','HEAD','POST','PUT','DELETE','PATCH','OPTIONS','runtime','dynamic','revalidate','fetchCache','preferredRegion','maxDuration','dynamicParams','generateStaticParams']);
assert.ok(namedExports.every(name=>allowed.has(name)),`Unexpected route export(s): ${namedExports.filter(n=>!allowed.has(n)).join(', ')}`);
assert.match(route,/export async function GET\(/,'GET handler exists');
assert.match(route,/node\(id: \$id\)/,'global-node game lookup intact');
console.log('V4.5.8.1 Next.js 14 route export regression test passed');

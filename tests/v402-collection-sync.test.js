const assert=require('node:assert/strict');
const fs=require('node:fs');
const {
  VERIFIED_COLLECTION_TTL_MS,rememberVerifiedCollection,recentVerifiedCollection,forgetVerifiedCollection,
  shouldRetryCollectionResponse,collectionRetryDelayMs,shareCollectionSync,cancelSharedCollectionSync,
}=require('../.test-build/lib/collection-sync-session.js');
const collection={slug:'user-a',cards:[{assetId:'c1',sport:'NBA',playerSlug:'jordan'}],complete:true,syncedAt:'2026-11-04',activeFootballSet:{slug:'divination',name:'Divination'}};
rememberVerifiedCollection(collection,1000);
assert.equal(recentVerifiedCollection('user-a',1001),collection,'Verified collection survives a client-route remount');
assert.equal(recentVerifiedCollection('user-b',1001),null,'Never share a collection with a different login');
assert.equal(recentVerifiedCollection('user-a',1000+VERIFIED_COLLECTION_TTL_MS),null,'Expired verification fails closed');
rememberVerifiedCollection({...collection,complete:false},2000);
assert.equal(recentVerifiedCollection('user-a',2001),null,'Incomplete collection is not verified');
rememberVerifiedCollection(collection,3000);forgetVerifiedCollection('user-a');
assert.equal(recentVerifiedCollection('user-a',3001),null,'Disconnect revokes in-memory proof');
assert.equal(shouldRetryCollectionResponse(429,'Too Many Requests'),true);
assert.equal(shouldRetryCollectionResponse(503,'temporary unavailable'),true);
assert.equal(shouldRetryCollectionResponse(502,"Cannot query field 'cardsWhere'"),false,'Invalid schema must be diagnosed, not endlessly retried');
assert.equal(shouldRetryCollectionResponse(401,'Unauthorized'),false);
assert.equal(collectionRetryDelayMs(0,3),3000);
const widget=fs.readFileSync('app/components/my-sorare-collection.tsx','utf8');
const dashboard=fs.readFileSync('app/components/arcade-dashboard.tsx','utf8');
const endpoint=fs.readFileSync('app/api/collection/route.ts','utf8');
assert.match(widget,/recentVerifiedCollection\(data\.slug\)/,'Reuse within-session proof after URL navigation');
assert.match(widget,/complete:false/,'On-disk stale data cannot prove ownership');
assert.match(widget,/shareCollectionSync\(userSlug/,'A multi-page collection sync must survive navigation');
assert.match(widget,/onSyncStatus/,'Surfaced sync errors and progress');
assert.match(dashboard,/\/collection\?sport=\$\{sport\}#meine-karten/,'Builder warning links to visible Collection route');
assert.doesNotMatch(dashboard,/href="#meine-karten">Jetzt synchronisieren/,'Hidden tab anchor may not be the only sync entry point');
assert.match(endpoint,/typeof data\.pageInfo\.hasNextPage!=="boolean"/,'Missing pagination must not make partial sync appear complete');
assert.match(endpoint,/status:rateLimited\?429:502/,'Preserve 429 for a rate-aware browser retry');
async function checkConcurrent(){
  let calls=0;
  let onFinish;
  const a=shareCollectionSync('same-user',()=>{calls++;return new Promise(resolve=>{onFinish=resolve;});});
  const b=shareCollectionSync('same-user',()=>{calls++;return Promise.resolve(collection);});
  assert.strictEqual(a,b,'Route transitions must reuse one in-flight sync');
  assert.equal(calls,0,'Start deferred to microtask for consistent sharing');
  await Promise.resolve();
  assert.equal(calls,1,'Only one remote pagination worker');
  onFinish(collection);assert.equal(await b,collection);
  let signal;
  const canceled=shareCollectionSync('another-user',(s)=>{signal=s;return new Promise((resolve,reject)=>s.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));});
  await Promise.resolve();cancelSharedCollectionSync('another-user');
  assert.equal(signal.aborted,true,'Disconnect must abort outstanding API requests');
  await assert.rejects(canceled,/aborted/);
  console.log('V4.0.2: session ownership reuse, in-flight route sharing, account isolation, rate limits, visible sync troubleshooting: OK');
}
checkConcurrent().catch(e=>{console.error(e);process.exitCode=1;});

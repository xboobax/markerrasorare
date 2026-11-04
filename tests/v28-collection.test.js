const assert=require('node:assert/strict');
const {collectionKey,safeCollection,ownedSlugs,mergeVerifiedOwned}=require('../.test-build/lib/my-collection.js');
const owned={slug:'sorare-user',syncedAt:'2026-11-04T12:00:00Z',complete:true,cards:[
 {assetId:'1',slug:'nba-1',sport:'NBA',rarity:'LIMITED',seasonYear:2026,serialNumber:12,playerSlug:'luka-doncic',playerName:'Luka Doncic'},
 {assetId:'2',slug:'nba-2',sport:'NBA',rarity:'RARE',seasonYear:2025,serialNumber:9,playerSlug:'luka-doncic',playerName:'Luka Doncic'},
 {assetId:'3',slug:'football-1',sport:'FOOTBALL',rarity:'LIMITED',seasonYear:2026,serialNumber:4,playerSlug:'manuel-neuer',playerName:'Manuel Neuer'}
]};
assert.equal(collectionKey('sorare-user'),'markerras.sorare.verified-collection.v1.sorare-user');
assert.equal(safeCollection(owned,'other-user'),null,'A cached collection must belong to the authenticated user');
assert.equal(safeCollection({...owned,cards:[{assetId:'1',playerSlug:'x',sport:'NOT_REAL'}]},'sorare-user'),null);
assert.equal(safeCollection(owned,'sorare-user').cards.length,3);
const nba=ownedSlugs(owned,'nba');assert.deepEqual([...nba],['luka-doncic']);
assert.deepEqual([...ownedSlugs(owned,'football')],['manuel-neuer']);
const manual={'manuel-neuer':{owned:true,stars:null},'jude-bellingham':{owned:true,stars:2},'luka-doncic':{owned:false,stars:4}};
assert.equal(mergeVerifiedOwned(manual,nba,false),manual,'Incomplete sync must not change manual ownership');
const merged=mergeVerifiedOwned(manual,nba,true);
assert.equal(merged['luka-doncic'].owned,true);
assert.equal(merged['luka-doncic'].stars,4,'existing star values must be preserved');
assert.equal(merged['jude-bellingham'].owned,false,'a complete sync is authoritative');
assert.equal(manual['jude-bellingham'].owned,true,'manual backup must remain untouched');
console.log('V2.8 collection tests passed.');

const assert=require('node:assert/strict');
const {ownedViewKey,isInSelectedCollection,ownedSlugs,mergeVerifiedOwned}=require('../.test-build/lib/my-collection.js');
assert.equal(ownedViewKey('nba'),'markerras.sorare.only-my-cards.v1.nba');
assert.equal(ownedViewKey('football'),'markerras.sorare.only-my-cards.v1.football');
assert.notEqual(ownedViewKey('nba'),ownedViewKey('football'),'Each sport has its own filter preference');
const collection={slug:'demo',syncedAt:'2026-11-04T00:00:00Z',complete:true,cards:[
  {assetId:'1',sport:'NBA',playerSlug:'nba-one'},
  {assetId:'2',sport:'FOOTBALL',playerSlug:'f-one'},
]};
const store=mergeVerifiedOwned({'nba-one':{owned:false,stars:3},'manual-only':{owned:true}},ownedSlugs(collection,'nba'),true);
assert.equal(isInSelectedCollection('nba-one',store,true,true),true);
assert.equal(isInSelectedCollection('manual-only',store,true,true),false);
assert.equal(isInSelectedCollection('nba-one',store,true,false),false,'Do not use unverified card data when sync is unavailable');
assert.equal(isInSelectedCollection('nba-one',store,false,false),true,'All-player mode must not restrict');
assert.equal(store['nba-one'].stars,3,'The filter does not touch Sorare stars');
assert.equal(isInSelectedCollection('f-one',store,true,true),false,'NBA list does not imply football ownership');
console.log('V2.8.3 owned view filters tests passed.');

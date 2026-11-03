const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {officialStarValue,nbaStarValue,validatedRatings}=require('../.test-build/lib/nba-stars');
const {starQuery,normalizeStarSlugs,getNbaStarRatings}=require('../.test-build/lib/nba-stars-feed');
const {forecast}=require('../.test-build/lib/model');
const {optimizeArcadeLineups}=require('../.test-build/lib/arcade');
const {findHiddenGems}=require('../.test-build/lib/hidden-gems');
const root=path.resolve(__dirname,'..');

for(const star of [1,1.5,2,2.5,3,3.5,4,4.5,5])assert.equal(officialStarValue(star),star);
for(const invalid of [null,undefined,'3',-1,0,.5,5.5,3.1,NaN,Infinity,{}])assert.equal(officialStarValue(invalid),null);
assert.deepEqual(nbaStarValue(4.5,2),{stars:4.5,source:'sorare'},'official overrides saved manual');
assert.deepEqual(nbaStarValue(undefined,2),{stars:2,source:'manual'},'fallback never erased');
assert.deepEqual(nbaStarValue('bad',undefined),{stars:null,source:'missing'},'no guessed stars');
assert.equal(validatedRatings({'a':4.5,'b':2,'z':5,'bad':19},new Set(['a','b'])).a,4.5);
assert.deepEqual(Object.keys(validatedRatings({'a':4.5,'b':2,'z':5,'bad':19},new Set(['a','b']))).sort(),['a','b']);
assert.deepEqual(normalizeStarSlugs(['a','b','a']),['a','b']);
assert.throws(()=>normalizeStarSlugs(['nba-player','invalid_slug']));
assert.throws(()=>normalizeStarSlugs(new Array(1501).fill('a')));
assert.ok(starQuery(['lebron-james']).includes('players(slugs: ["lebron-james"])'));
assert.ok(starQuery(['lebron-james']).includes('gameplayTierStars'));
assert.ok(!starQuery(['lebron-james']).includes('rawPlayerGameScores'));

(async()=>{
 const ids=Array.from({length:89},(_,i)=>`nba-${i}`);
 const chunks=[];
 const snapshot=await getNbaStarRatings(ids,false,async(slugs)=>{
   chunks.push(slugs);
   if(slugs.includes('nba-40'))throw Error('temporary Sorare rate limit');
   return Object.fromEntries(slugs.map(id=>[id,2.5]));
 });
 assert.equal(chunks.length,3,'40/40/9 chunking');
 assert.ok(chunks.every(chunk=>chunk.length<=40));
 assert.equal(snapshot.failedChunks,1,'failed query is isolated');
 assert.equal(snapshot.partial,true);
 assert.equal(snapshot.requested,89);
 assert.equal(snapshot.received,49);
 assert.equal(Object.keys(snapshot.ratings).length,49);
 const all=await getNbaStarRatings(['x','y'],true,async(_,force)=>{assert.equal(force,true);return {x:5,y:1}});
 assert.equal(all.received,2);assert.equal(all.partial,false);

 const make=(id,stars)=>({player:forecast({id,name:id,team:'Example Team',position:'G',avg:40,averageL5:40,averageL10:40,proj:40,recentScores:[40,40,40,40,40,40,40,40,40,40],last5Apps:5,status:'',playOdds:1,injuries:0,hasGame:null}),stars,owned:true});
 const manual=[make('one',5),make('two',5),make('three',5),make('four',5),make('five',5)];
 assert.equal(optimizeArcadeLineups(manual,{sport:'nba'}).length,0,'manual budget violation');
 const official={one:3,two:3,three:3,four:3,five:3};
 const effective=manual.map(c=>({...c,stars:nbaStarValue(official[c.player.id],c.stars).stars}));
 const lineups=optimizeArcadeLineups(effective,{sport:'nba',limit:1});
 assert.equal(lineups.length,1,'automatic Sorare values drive the optimizer');
 assert.equal(lineups[0].starsUsed,15);
 const gems=findHiddenGems(effective.map(c=>c.player),'nba',Object.fromEntries(effective.map(c=>[c.player.id,{stars:c.stars}])));
 assert.ok(gems.gems.length>0,'hidden gems receives effective official values');

 const source=fs.readFileSync(path.join(root,'lib/sorare.ts'));
 const officialSha='32d3189f8de56bd2d358e179803ed297589244d0d4132b4349b7a0575d3fa8db';
 assert.equal(crypto.createHash('sha256').update(source).digest('hex'),officialSha,'Sorare base scores byte-identical to stable V2.1');
 const ui=fs.readFileSync(path.join(root,'app/components/arcade-dashboard.tsx'),'utf8');
 assert.ok(ui.includes('effectiveCardStore')&&ui.includes('fetchOfficialStars'));
 assert.ok(ui.includes('cardStore={effectiveCardStore}'));
 assert.ok(ui.includes('gameplayTierStars'));
 console.log('V2.1.1: official NBA Stars, fallback, API isolation, 16-star optimizer integration OK');
})().catch(e=>{console.error(e);process.exitCode=1});

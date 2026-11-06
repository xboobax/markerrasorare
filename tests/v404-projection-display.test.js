const assert=require('node:assert/strict');
const fs=require('node:fs');
const {forecast}=require('../.test-build/lib/model');
const {buildPredictionV3}=require('../.test-build/lib/prediction-engine-v3');
const {enrichForecast}=require('../.test-build/lib/matchups');
const {conditionalCardScore,sumConditionalScores}=require('../.test-build/lib/prediction-presentation');
const {indexCurrentCardAssets}=require('../.test-build/lib/performance');
const {chooseCardAsset}=require('../.test-build/lib/lineup-v29');
function predict(id,playOdds,bonusPercent){
  const base=forecast({id,name:id,team:'Known NBA Club',position:'G',avg:47,proj:50,
    recentScores:[42,55,61,37,48,59,44,65,39,51],averageL5:49,averageL10:50,
    last5Apps:5,status:'STARTER',playOdds,injuries:0,hasGame:true});
  const scouted=enrichForecast(base,'nba',{});
  const v3=buildPredictionV3(scouted,'nba');
  return {player:{...scouted,modelV3:v3,modelV3Active:true,expected:v3.ppRaw,
    weighted:v3.riskAdjustedPP,ceiling:v3.q80Raw,floor:v3.q20Raw},bonusPercent};
}
const one=predict('player-one',.25,5);
const two=predict('player-two',1,10);
const conditional=conditionalCardScore(one.player,one.bonusPercent);
assert.ok(conditional.pp>one.player.weighted,'conditional PP must not be multiplied by play probability twice');
assert.ok(conditional.q80>one.player.ceiling*one.player.playProb,'shown Q80 must NOT be risk-adjusted ceiling');
assert.ok(Math.abs(conditional.q80-one.player.modelV3.q80Raw*1.05)<1e-9);
const combined=sumConditionalScores([one,two]);
assert.equal(combined.known,2);
assert.ok(Math.abs(combined.q80-(conditional.q80+conditionalCardScore(two.player,10).q80))<1e-9);
assert.equal(sumConditionalScores([]),null);
assert.equal(conditionalCardScore({...one.player,modelV3Active:false},5),null);
assert.equal(conditionalCardScore({...one.player,modelV3:{...one.player.modelV3,applicable:false}},5),null);
assert.ok(conditionalCardScore(one.player,60).q80>conditional.q80,'captain-style 50% bonus is permitted in a selected lineup');
const owned=[
  {assetId:'old',playerSlug:'player-one',sport:'NBA',rarity:'common',cardSetSlug:'classic-set',bonusPercent:12},
  {assetId:'current',playerSlug:'player-one',sport:'NBA',rarity:'common',cardSetSlug:'2026-divination',pictureUrl:'https://assets.sorare.com/card.png',bonusPercent:5},
];
const sorted=indexCurrentCardAssets(owned).get('player-one');
assert.equal(chooseCardAsset(sorted,undefined).assetId,'current','Divination image preferred over an older bonus card');
assert.equal(chooseCardAsset(sorted,'old').assetId,'old','user-selected exact card is preserved');
const builder=fs.readFileSync('app/components/builder-workspace.tsx','utf8');
assert.match(builder,/sumConditionalScores\(result\.picks\)/);
assert.match(builder,/PP bei Einsatz/);
assert.match(builder,/Σ Q80/);
assert.match(builder,/Risiko-PP/);
assert.match(builder,/OfficialCardArt/);
assert.match(builder,/OpponentLogo/);
const api=fs.readFileSync('app/api/collection/route.ts','utf8');
assert.match(api,/pictureUrl\(derivative:/);
assert.match(api,/pictureCapability=false/);
assert.match(api,/return graphQl\(token,QUERY,vars\)/,'unsupported picture fields must not break syncing');
const logo=fs.readFileSync('app/api/team-logos/route.ts','utf8');
assert.match(logo,/pictureUrl/);
assert.match(logo,/catch/);
console.log('V4.0.4: conditional PP/Q80 visible, risk separated, art fallback, Divination preference, opponent logo graceful fallback OK');

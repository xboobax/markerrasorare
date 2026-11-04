const assert=require('node:assert/strict');
const {buildArcadeIntelligence,profileLineup,lineupKey}=require('../.test-build/lib/arcade-intelligence.js');
const {optimizeArcadeLineups}=require('../.test-build/lib/arcade.js');
function player(id,position='G',weighted=40,playProb=.85,team='T'+id){
  return {id,name:'Player '+id,team,position,weighted,expected:weighted/Math.max(.1,playProb),playProb,hasGame:true,
    injuries:0,confidence:'hoch',forecastSources:[{label:'L5',value:weighted,share:1,origin:'Sorare'}],floor:weighted*.75,ceiling:weighted*1.45,variability:8,
    recentScores:[],avg:weighted,last5Avg:weighted,last10Avg:weighted,sampleSize:5,status:'STARTER'};
}
const nba=[
  ...Array.from({length:13},(_,i)=>({player:player('N'+i,'G',55-i*2,.94-i*.035,`Team${i%4}`),stars:1+(i%5)*.5,owned:i<9})),
];
const report=buildArcadeIntelligence(nba,{sport:'nba',targetScore:230,limit:5});
assert(report.variants.length>=2,'should return distinct strategies where possible');
assert.equal(new Set(report.variants.map(v=>v.key)).size,report.variants.length,'no duplicate five-player sets');
assert(report.variants.some(v=>v.style==='target'));
assert(report.recommendedKey===report.variants.find(v=>v.style==='target').key);
for(const v of report.variants){
  assert.equal(v.lineup.picks.length,5);
  assert(new Set(v.lineup.picks.map(p=>p.player.id)).size===5);
  assert(v.lineup.starsUsed<=16);
  assert(v.lineup.targetProbability>=0 && v.lineup.targetProbability<=1);
  assert(v.riskIndex>=0 && v.riskIndex<=100);
  assert.equal(v.key,lineupKey(v.lineup));
}
const noGoal=buildArcadeIntelligence(nba,{sport:'nba',targetScore:null});
assert(!noGoal.variants.some(v=>v.style==='target'));
assert(noGoal.variants.every(v=>v.targetGap===null));
const allOwned=buildArcadeIntelligence(nba,{sport:'nba',targetScore:220,ownedOnly:true});
assert(allOwned.variants.every(v=>v.lineup.picks.every(p=>nba.find(c=>c.player.id===p.player.id).owned)));
const locked=buildArcadeIntelligence(nba,{sport:'nba',targetScore:240,lockedPlayerIds:['N0']});
assert(locked.variants.every(v=>v.lineup.picks.some(p=>p.player.id==='N0')));
const excluded=buildArcadeIntelligence(nba,{sport:'nba',excludedPlayerIds:['N0']});
assert(excluded.variants.every(v=>v.lineup.picks.every(p=>p.player.id!=='N0')));
assert.equal(buildArcadeIntelligence(nba,{sport:'nba',lockedPlayerIds:['N0'],excludedPlayerIds:['N0']}).variants.length,0);
const noStars=nba.map(c=>({...c,stars:null}));
assert.equal(buildArcadeIntelligence(noStars,{sport:'nba',targetScore:240}).variants.length,0);
const soccer=[
  {player:player('GK1','GK',52),owned:true},{player:player('GK2','GK',36),owned:true},
  {player:player('D1','DEF',50),owned:true},{player:player('D2','DEF',45),owned:true},
  {player:player('M1','MID',58),owned:true},{player:player('M2','MID',49),owned:true},
  {player:player('F1','FWD',61),owned:true},{player:player('F2','FWD',51),owned:true},
];
const football=buildArcadeIntelligence(soccer,{sport:'football',targetScore:240});
assert(football.variants.length>=1);
for(const v of football.variants){
  assert.equal(v.lineup.picks.length,5);
  const slots=v.lineup.picks.map(p=>p.slot).sort();
  assert.deepEqual(slots,['DEF','FLEX','FWD','GK','MID'].sort());
}
const p1=player('risk','G',45,.3);
const p2=player('fit','G',45,.99);
const mk=p=>({picks:Array.from({length:5},(_,i)=>({player:{...p,id:p.id+i,team:'T'+i},slot:'ANY',stars:2,bonusPercent:0,projectedScore:40,floorScore:20,ceilingScore:60,optimizeScore:40}))});
assert(profileLineup(mk(p1)).riskIndex>profileLineup(mk(p2)).riskIndex,'DNP risk should increase index');
// The underlying strategy remains accessible and identical for users selecting classic optimization.
assert(optimizeArcadeLineups(nba,{sport:'nba',strategy:'balanced',limit:1})[0].picks.length===5);
console.log('✓ V2.2 Arcade Intelligence: unique strategies, goal, NBA cap, owned/locked/excluded, football slots, risk');

const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'app/components/arcade-dashboard.tsx'),'utf8');
const studio=fs.readFileSync(path.join(root,'app/components/arcade-intelligence-lab.tsx'),'utf8');
for(const needle of ['<ArcadeIntelligenceLab','setIntelligencePickKey','activeIntelligence','V3.9 · NEON INTELLIGENCE']) assert(ui.includes(needle),`missing UI integration: ${needle}`);
for(const needle of ['intelligence-studio','intelligence-scenario','intelligence-risk','intelligence-probability','nicht kalibrierte Modellschätzung']) assert(studio.includes(needle),`missing Studio UI: ${needle}`);
const originalScoreHash='32d3189f8de56bd2d358e179803ed297589244d0d4132b4349b7a0575d3fa8db';
const scoreHash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'lib/sorare.ts'))).digest('hex');
assert.equal(scoreHash,originalScoreHash,'original Sorare score adapter must remain byte-identical');

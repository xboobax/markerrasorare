const assert=require('node:assert/strict');
const fs=require('node:fs');
const {forecast}=require('../.test-build/lib/model');
const {buildNbaStarsOptimizer,lineupChanges,normalizeNbaDiversity}=require('../.test-build/lib/nba-stars-optimizer');
const {initialV30Settings}=require('../.test-build/lib/builder-v30');
function mk(id,points,stars,overrides={}){
  const info={id,name:id,team:overrides.team??'Club '+id,position:'G',avg:points,proj:points,averageL5:points,averageL10:points,
    recentScores:[points+6,points-4,points+7,points-3,points+2,points-6,points+9,points-1,points+5,points-2],last5Apps:5,
    status:'STARTER',playOdds:overrides.playOdds??1,injuries:overrides.injuries??0,hasGame:overrides.hasGame??true};
  return {player:forecast(info),stars,bonusPercent:0,owned:true};
}
const cards=Array.from({length:27},(_,i)=>mk(`nba${i}`,85-i*1.7,1+(i%9)*.5));
const opts={sport:'nba',limit:12,advancedSettings:initialV30Settings()};
const signature=line=>line.picks.map(p=>p.player.id).sort().join('|');
const one=buildNbaStarsOptimizer(cards,opts,1);
const two=buildNbaStarsOptimizer(cards,opts,2);
const three=buildNbaStarsOptimizer(cards,opts,3);
assert.equal(normalizeNbaDiversity(undefined),2);
assert.equal(normalizeNbaDiversity(4),2);
assert.equal(normalizeNbaDiversity(1),1);
assert.equal(normalizeNbaDiversity(3),3);
assert.equal(two.requestedDiversity,2);
assert.equal(two.variants.length,4,'all four strategy variants available on a broad roster');
assert.deepEqual(two.unmetDiversity,[],'two-player diversity is feasible in the reference roster');
assert.equal(signature(one.variants[0].lineup),signature(two.variants[0].lineup),'the maximum must not be penalized for diversity');
assert.equal(signature(three.variants[0].lineup),signature(two.variants[0].lineup),'the maximum must not be penalized for diversity');
for(const board of [one,two,three]){
  assert.equal(board.variants[0].mode,'max');
  for(let i=0;i<board.variants.length;i++){
    const current=board.variants[i],l=current.lineup;
    assert.equal(l.picks.length,5);
    assert.ok(l.starsUsed<=16,'respects 16-star limit');
    assert.equal(new Set(l.picks.map(p=>p.player.id)).size,5,'each player picked once');
    assert.ok(Math.abs(current.projectedLoss-(board.referenceScore-l.projectedScore))<1e-6,'exact expected score loss');
    assert.ok(current.projectedLossPercent>=-1e-6,'positive or zero loss for projection-based max');
    assert.equal(current.changesFromMax,lineupChanges(board.variants[0].lineup,l));
    assert.ok(current.mode==='max'||l.projectedScore>=board.referenceScore*.9-1e-6,'no poor alternatives forced to meet diversity');
    if(current.meetsDiversity&&i>0)for(let j=0;j<i;j++)assert.ok(lineupChanges(board.variants[j].lineup,l)>=board.requestedDiversity,'pairwise diversity');
  }
  assert.deepEqual(board.unmetDiversity,board.variants.filter(v=>!v.meetsDiversity).map(v=>v.mode).concat(
    ['value','safe','upside'].filter(m=>!board.variants.some(v=>v.mode===m))));
}
assert.ok(two.variants.slice(1).every(v=>v.meetsDiversity),'default preset should deliver 2+ changes');
assert.ok(three.variants.slice(1).every(v=>v.changesFromMax>=3||!v.meetsDiversity),'3-player differences enforced when possible');
assert.ok(three.unmetDiversity.length>0,'very restrictive pairwise variation is transparently reported');
assert.match(three.note,/Nicht für/);
// Locked players count as mandatory shared picks. Do not bypass locks to manufacture diversity.
const locked=buildNbaStarsOptimizer(cards,{...opts,lockedPlayerIds:two.variants[0].lineup.picks.slice(0,4).map(p=>p.player.id)},2);
assert.ok(locked.variants.length);
assert.ok(locked.variants.every(v=>v.lineup.picks.every(p=>!p.player.id||!opts.excludedPlayerIds?.includes(p.player.id))));
assert.ok(locked.unmetDiversity.length>0,'4 locked picks make 2 changes impossible');
for(const v of locked.variants){
  for(const id of two.variants[0].lineup.picks.slice(0,4).map(p=>p.player.id))assert.ok(v.lineup.picks.some(p=>p.player.id===id));
}
// If the only legal lineup exists, do not invent alternatives or report successful diversity.
const onlyFive=[mk('unique1',54,3),mk('unique2',52,3),mk('unique3',50,3),mk('unique4',48,3),mk('unique5',45,3)];
const narrow=buildNbaStarsOptimizer(onlyFive,opts,2);
assert.equal(narrow.variants.length,1);
assert.deepEqual(narrow.unmetDiversity,['value','safe','upside']);
// Explicitly exclude a player, preserve the condition under diversity.
const excluded=buildNbaStarsOptimizer(cards,{...opts,excludedPlayerIds:['nba4']},2);
assert.ok(excluded.variants.every(v=>v.lineup.picks.every(p=>p.player.id!=='nba4')));
// New controls and mapping MUST be wired into the selection path rather than visual-only.
const ui=fs.readFileSync('app/components/arcade-dashboard.tsx','utf8');
for(const term of ['NBA Stars Optimizer 2.1','nba32-diversity','setNbaDiversity','nbaDiversity','lineupChanges','projectedLoss','minChangesToOtherVariants','buildNbaStarsOptimizer(eligibleCards,v30Options(v30ActiveSettings),nbaDiversity)','neon:nba-diversity-v32'])
  assert.ok(ui.includes(term),`missing: ${term}`);
const css=fs.readFileSync('app/globals.css','utf8');
for(const term of ['.nba32-diversity','.nba32-warning','.nba32-current','.nba32-unmet'])assert.ok(css.includes(term));
console.log('V3.2: selectable diversity (1/2/3), pairwise differences, honest fallback, exact forecast gap, budget/lock/quality guard, persisted UI OK');

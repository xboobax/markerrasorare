const assert=require('node:assert/strict');
const fs=require('node:fs');
const {forecast}=require('../.test-build/lib/model');
const {buildNbaStarsOptimizer,assessNbaStarsLineup,NBA_STARS_MODES}=require('../.test-build/lib/nba-stars-optimizer');
const {initialV30Settings,opponentsAreMatched}=require('../.test-build/lib/builder-v30');
const {captainLineup}=require('../.test-build/lib/lineup-v29');
const mk=(id,points,stars,overrides={})=>{
 const info={id,name:id,team:overrides.team||'Club '+id,position:'G',avg:points,proj:points,averageL5:points,averageL10:points,
  recentScores:[points+5,points-4,points+3,points-2,points+4,points-3,points+5,points-1,points+2,points],
  last5Apps:5,status:'STARTER',playOdds:overrides.playOdds??1,injuries:overrides.injuries??0,hasGame:overrides.hasGame??true,
  opponent:overrides.opponent||undefined};
 const player={...forecast(info),opponentRating:overrides.opponentRating??null,matchupAdjustmentPct:overrides.matchupAdjustmentPct??0};
 if(overrides.confidence)player.confidence=overrides.confidence;
 return {player,stars,bonusPercent:overrides.bonusPercent??0,owned:overrides.owned??true};
};
const base=[
 mk('eliteA',84,5,{opponentRating:1,matchupAdjustmentPct:10}),
 mk('eliteB',80,5),mk('eliteC',78,5),mk('eliteD',75,5),mk('eliteE',72,5),
 mk('valueA',62,2),mk('valueB',57,2),mk('valueC',55,2),mk('valueD',53,2),mk('valueE',49,2),
 mk('midA',68,3),mk('midB',65,3),mk('midC',63,3),mk('midD',61,3),mk('midE',59,3),
 mk('risky',110,3,{playOdds:0.35,injuries:1,confidence:'gering'}),
 mk('noGame',120,1,{hasGame:false}),mk('noStars',95,null),
];
const options={sport:'nba',limit:12,advancedSettings:initialV30Settings()};
const board=buildNbaStarsOptimizer(base,options);
assert.equal(NBA_STARS_MODES.length,4);
assert.ok(board.variants.length>=3,'several distinct profiles must be available');
assert.ok(board.pools.max.length>0);
const unique=new Set(board.variants.map(v=>v.lineup.picks.map(p=>p.player.id).sort().join('|')));
assert.equal(unique.size,board.variants.length);
for(const variant of board.variants){
 const line=variant.lineup;
 assert.equal(line.picks.length,5);
 assert.ok(line.starsUsed<=16);
 assert.equal(new Set(line.picks.map(p=>p.player.id)).size,5);
 assert.ok(line.picks.every(p=>p.player.id!=='noGame'&&p.player.id!=='noStars'));
 assert.equal(captainLineup(line,'nba',line.picks[0].player.id,null),line,'NBA has no captain');
 assert.ok(variant.assessment.pointsPerStar>0);
}
assert.ok(board.pools.max[0].projectedScore>=board.pools.max[1].projectedScore);
assert.ok(board.pools.value[0].projectedScore>=board.pools.max[0].projectedScore*.9-1e-6);
assert.ok(assessNbaStarsLineup(board.pools.value[0]).pointsPerStar>=assessNbaStarsLineup(board.pools.max[0]).pointsPerStar-1e-6);
assert.ok(board.pools.max[0].picks.some(p=>p.player.id==='eliteA'),'matchup-scaled player belongs to pool');
const known=assessNbaStarsLineup({ ...board.pools.max[0],picks:[board.pools.max[0].picks.find(p=>p.player.id==='eliteA'),...board.pools.max[0].picks.filter(p=>p.player.id!=='eliteA')].filter(Boolean)});
assert.ok(known.matchupKnown>=1);
assert.ok(known.matchupFavorable>=1);
assert.ok(known.matchupPercentAverage!==null);
const locked=buildNbaStarsOptimizer(base,{...options,lockedPlayerIds:['valueA','valueB'],excludedPlayerIds:['eliteA']});
assert.ok(locked.variants.length);
for(const v of locked.variants){const ids=v.lineup.picks.map(p=>p.player.id);assert.ok(ids.includes('valueA')&&ids.includes('valueB'));assert.ok(!ids.includes('eliteA'));}
const invalid=buildNbaStarsOptimizer(base,{...options,lockedPlayerIds:['eliteA','eliteB','eliteC','eliteD']});
assert.equal(invalid.variants.length,0,'overspent mandatory stars cannot create an invalid lineup');
assert.equal(buildNbaStarsOptimizer(base,{...options,lockedPlayerIds:['absent']}).variants.length,0);
assert.equal(buildNbaStarsOptimizer(base,{...options,lockedPlayerIds:['valueA'],excludedPlayerIds:['valueA']}).variants.length,0);
const owned=buildNbaStarsOptimizer(base,{...options,ownedOnly:true});
assert.ok(owned.variants.length);
assert.ok(owned.variants.every(v=>v.lineup.picks.every(p=>base.find(c=>c.player.id===p.player.id).owned)));
const min=buildNbaStarsOptimizer(base,{...options,advancedSettings:{...initialV30Settings(),minProjected:9999}});
assert.equal(min.variants.length,0);
const q80Small=base.slice(0,6).map(c=>({...c,player:{...c.player,recentScores:[30,20],sampleSize:2}}));
assert.equal(buildNbaStarsOptimizer(q80Small,{...options,advancedSettings:{...initialV30Settings(),projection:'q80'}}).variants.length,0);
const opposite=[mk('pa',60,2,{team:'Team Alpha',opponent:'Team Beta'}),mk('pb',60,2,{team:'Team Beta',opponent:'Team Alpha'}),mk('pc',60,2),mk('pd',60,2),mk('pe',60,2),mk('pf',58,2)];
assert.ok(opponentsAreMatched(opposite[0].player,opposite[1].player));
const noOpp=buildNbaStarsOptimizer(opposite,{...options,advancedSettings:{...initialV30Settings(),avoidOpponents:true}});
assert.ok(noOpp.variants.length>0);
assert.ok(noOpp.variants.every(v=>!v.lineup.picks.some(p=>p.player.id==='pa')||!v.lineup.picks.some(p=>p.player.id==='pb')));
assert.equal(buildNbaStarsOptimizer(opposite,{...options,lockedPlayerIds:['pa','pb'],advancedSettings:{...initialV30Settings(),avoidOpponents:true}}).variants.length,0);
// Missing matchup stats must be labelled unknown rather than fabricated.
const unscouted=buildNbaStarsOptimizer(base.filter(c=>c.player.id!=='eliteA'),options);
assert.equal(assessNbaStarsLineup(unscouted.pools.max[0]).matchupKnown,0);
assert.equal(assessNbaStarsLineup(unscouted.pools.max[0]).matchupPercentAverage,null);
const ui=fs.readFileSync('app/components/arcade-dashboard.tsx','utf8');
for(const part of ['NBA Stars Optimizer 2.1','nba31-panel','Star Efficiency','Matchup bekannt','NBA_STARS_MODES','nbaProfileLines','buildNbaStarsOptimizer'])assert.ok(ui.includes(part),part);
assert.ok(ui.includes('usage.set(pick.player.id,(usage.get(pick.player.id)??0)+1)'), 'V3.1.1: NBA multi-team reuse counter must refer to pick, not an undefined p');
const css=fs.readFileSync('app/globals.css','utf8');assert.ok(css.includes('.nba31-panel'));
console.log('V3.1: multi-objective star DP, 16-star limit, 4 NBA profiles, distinctive variants, value floor, matchup coverage, risk, locks, exclusions, injuries, min/Q80, no captain and UI OK');

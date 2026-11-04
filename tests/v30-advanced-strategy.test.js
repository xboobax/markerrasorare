const assert=require('node:assert/strict');
const fs=require('node:fs');
const {forecast}=require('../.test-build/lib/model');
const {optimizeArcadeLineups}=require('../.test-build/lib/arcade');
const {smartFillEmptySlots}=require('../.test-build/lib/builder-neon');
const {initialV30Settings,initialV30State,v30ForTeam,restoreV30State,presetSettings,estimatedQ80,projectionValue,historical70Plus,opponentsAreMatched,satisfiesV30Constraints,limitLineupReuse}=require('../.test-build/lib/builder-v30');
const {captainLineup}=require('../.test-build/lib/lineup-v29');
function mk(id,team,pos,score=60,stars=3,opponent=undefined){
  const p=forecast({id,name:id,team,position:pos,avg:score,proj:score,averageL5:score,averageL10:score,recentScores:[score+12,score-10,score+7,score-8,score+6,score-3,score+5,score-4,score+8,score-1],last5Apps:5,status:'STARTER',playOdds:1,injuries:0,hasGame:true,opponent});
  return {player:p,stars,bonusPercent:12,owned:true};
}
const defaults=initialV30Settings();
assert.equal(defaults.projection,'ps');assert.equal(defaults.maxUses,6);
const state=restoreV30State({scope:'team',global:{projection:'raw',maxUses:99},teams:{'team-1':{projection:'q80'},evil:{projection:'raw'}}});
assert.equal(state.global.maxUses,6);assert.equal(v30ForTeam(state,'team-1').projection,'q80');assert.equal(v30ForTeam(state,'team-2').projection,'raw');
assert.equal('evil' in state.teams,false);
assert.equal(presetSettings('ceiling',defaults).projection,'q80');
const sc=mk('a','Club Alpha','MID');
assert.ok(estimatedQ80(sc.player)>0);
assert.equal(estimatedQ80({...sc.player,recentScores:[70,60,50],sampleSize:3}),null,'q80 must not fabricate small samples');
assert.ok(projectionValue(sc,'ps')>projectionValue(sc,'raw'));
assert.ok(projectionValue(sc,'q80')>0);
assert.equal(historical70Plus({...sc.player,recentScores:[80]}),null);
assert.ok(historical70Plus(sc.player)>=0);
const rival=mk('b','Club Beta','DEF',55,3,'Club Alpha');
assert.equal(opponentsAreMatched({...sc.player,opponent:'Club Beta'},rival.player),true);
const football=[mk('g1','Club Alpha','GK',60),mk('d1','Club Alpha','DEF',60),mk('m1','Club Alpha','MID',60),mk('f1','Club Alpha','FWD',65),mk('m2','Club Gamma','MID',58),mk('d2','Club Gamma','DEF',54),mk('f2','Club Gamma','FWD',50),mk('g2','Club Gamma','GK',55),rival];
for(const stack of ['defensive','offensive','team']){
 const settings={...defaults,stack};
 const lines=optimizeArcadeLineups(football,{sport:'football',limit:5,beamWidth:500,advancedSettings:settings});
 assert.ok(lines.length>0,stack+' must be constructible');
 assert.ok(lines.every(l=>satisfiesV30Constraints(l.picks,'football',settings)),stack+' must be enforced');
}
const restrict={...defaults,extraPosition:'DEF',avoidOpponents:true};
const restricted=optimizeArcadeLineups(football,{sport:'football',limit:5,beamWidth:500,advancedSettings:restrict});
assert.ok(restricted.length,'legal defender flex exists');
assert.ok(restricted.every(l=>l.picks.find(p=>p.slot==='FLEX').player.position==='DEF'));
assert.ok(restricted.every(l=>satisfiesV30Constraints(l.picks,'football',restrict)));
const tooHigh=optimizeArcadeLineups(football,{sport:'football',advancedSettings:{...defaults,minProjected:9999}});
assert.equal(tooHigh.length,0,'min points are enforced');
const nba=[mk('n1','New York','G',50,2),mk('n2','Houston','F',60,2),mk('n3','Miami','C',65,2),mk('n4','Brooklyn','F',55,3),mk('n5','Detroit','G',62,3),mk('n6','Boston','G',42,2),mk('n7','Chicago','F',45,3),mk('n8','Dallas','C',50,4),mk('n9','Phoenix','G',49,3),mk('n10','Memphis','C',49,3)];
for(const projection of ['ps','raw','q80']){
 const lineups=optimizeArcadeLineups(nba,{sport:'nba',limit:5,advancedSettings:{...defaults,projection}});
 assert.ok(lineups.length,`NBA ${projection} should build`);
 for(const l of lineups){assert.ok(l.starsUsed<=16);assert.equal(l.picks.length,5);assert.equal(captainLineup(l,'nba',l.picks[0].player.id,null),l,'NBA never gets captain');}
}
const repeated=optimizeArcadeLineups(nba,{sport:'nba',limit:20});
const unique=limitLineupReuse(repeated,1,3);
const seen=new Set();for(const l of unique)for(const p of l.picks){assert.equal(seen.has(p.player.id),false);seen.add(p.player.id);}
const initial=['g1',null,'m1',null,null];
const filled=smartFillEmptySlots(initial,football,'football',{advancedSettings:{...defaults,stack:'defensive',extraPosition:'DEF'},strategy:'balanced'});
assert.equal(filled.reason,null,filled.reason);
assert.equal(filled.selection[0],'g1','existing keeper must remain');
assert.equal(filled.selection[2],'m1','existing midfielder must remain');
assert.ok(filled.selection.every(Boolean));
assert.equal(filled.selection[4]&&football.find(c=>c.player.id===filled.selection[4]).player.position,'DEF');
const rejected=smartFillEmptySlots(initial,football,'football',{advancedSettings:{...defaults,minProjected:1999}});
assert.ok(rejected.reason);assert.deepEqual(rejected.selection,initial,'incompatible settings must not overwrite team');
for(const path of ['app/components/auto-builder-settings.tsx','app/components/arcade-dashboard.tsx','app/components/builder-workspace.tsx']){
 const source=fs.readFileSync(path,'utf8');assert.ok(source.includes('v30'),path+' is not wired');
}
const ui=fs.readFileSync('app/components/auto-builder-settings.tsx','utf8');
for(const label of ['PS Standard','PS Q80','PS Raw','Je Team','Alle Teams','Team-Struktur','Mindestpunkte','Matchup-Konflikte'])assert.ok(ui.includes(label));
console.log('V3.0: team and shared profiles; raw/Q80/PS; football stacks and conflicts; NBA 16-stars/no captain; minimum score and manual preservation OK');

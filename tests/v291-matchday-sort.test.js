const assert=require('node:assert/strict');
const {offsetBerlinDay,berlinCalendarDay,playsOnBerlinDay,expectedCeiling,expectedFloor,expectedUpside,comparePoolValues}=require('../.test-build/lib/builder-pool');
const nbaSchedule={status:'available',fixtures:[
 {id:'1',date:'2026-11-05',tipoff:'2026-11-04T23:30:00Z',home:'Atlanta Hawks',away:'New York Knicks',source:'ESPN',playerIds:[]},
 {id:'2',date:'2026-11-04',tipoff:'2026-11-04T19:30:00Z',home:'Boston Celtics',away:'Miami Heat',source:'ESPN',playerIds:[]},
]};
const noSchedule={status:'unavailable',fixtures:[]};
const player=(team,nextGame,hasGame=true)=>({id:'p',team,nextGame,hasGame});
assert.equal(offsetBerlinDay(new Date('2026-11-04T23:30:00Z')), '2026-11-05');
assert.equal(offsetBerlinDay(new Date('2026-11-04T23:30:00Z'),1),'2026-11-06');
assert.equal(offsetBerlinDay(new Date('2026-03-29T00:30:00Z')), '2026-03-29');
assert.equal(offsetBerlinDay(new Date('2026-03-29T00:30:00Z'),1), '2026-03-30');
assert.equal(berlinCalendarDay(new Date('2026-11-04T23:30:00Z')),'2026-11-05');
assert.equal(playsOnBerlinDay(player('Hawks'),'nba','2026-11-05',nbaSchedule),true);
assert.equal(playsOnBerlinDay(player('Hawks'),'nba','2026-11-04',nbaSchedule),false);
assert.equal(playsOnBerlinDay(player('Celtics'),'nba','2026-11-04',nbaSchedule),true);
assert.equal(playsOnBerlinDay(player('Celtics'),'nba','2026-11-04',noSchedule),false);
assert.equal(playsOnBerlinDay(player('Unknown'),'nba','2026-11-05',nbaSchedule),false);
assert.equal(playsOnBerlinDay(player('Bayern','2026-11-04 FC Bayern - Dortmund'),'football','2026-11-04',noSchedule),true);
assert.equal(playsOnBerlinDay(player('Bayern','2026-11-05 FC Bayern - Dortmund'),'football','2026-11-04',noSchedule),false);
assert.equal(playsOnBerlinDay(player('Bayern','2026-11-04 FC Bayern - Dortmund',false),'football','2026-11-04',noSchedule),false);
assert.equal(playsOnBerlinDay(player('Bayern','2026-11-04 ? - Dortmund'),'football','2026-11-04',noSchedule),false);
assert.equal(playsOnBerlinDay(player('Bayern','no match'),'football','2026-11-04',noSchedule),false);
const p={weighted:40,floor:30,ceiling:80,playProb:0.75};
assert.equal(expectedFloor(p),22.5);assert.equal(expectedCeiling(p),60);assert.equal(expectedUpside(p),20);
assert.ok(comparePoolValues(30,40)>0);assert.ok(comparePoolValues(30,40,false)<0);
assert.equal(comparePoolValues(null,40),1);
assert.equal(comparePoolValues(40,null,-1),-1);assert.equal(comparePoolValues(null,undefined),0);
console.log('V2.9.1 Berlin matchday & sorting tests: OK');

const fs=require('node:fs'),path=require('node:path');
const ui=fs.readFileSync(path.join(__dirname,'../app/components/builder-workspace.tsx'),'utf8');
assert.match(ui,/setHorizon\]=useState<MatchdayHorizon>\(\"today\"\)/);
assert.match(ui,/value=\"today\">◉ Heute spielen/);
assert.match(ui,/value=\"ceiling\">Ceiling/);
assert.match(ui,/value=\"floor\">Floor/);
assert.match(ui,/value=\"upside\">Upside/);
assert.match(ui,/isInSelectedCollection\(c.player.id,cardStore,onlyMyCards,verifiedOwnedReady\)\&\&eligibleByHorizon\(c.player\)/);
assert.match(ui,/nbaSchedule.status!==\"available\"/);

const assert=require('node:assert/strict');
const fs=require('node:fs');
const {forecast}=require('../.test-build/lib/model');
const {evaluateManualLineup}=require('../.test-build/lib/manual-lineup');
const {nbaGameCoverage,opportunitiesForTeam,assessMatchup,compareBuilderTeams,transferWorkspacePlayer,multiGameLabel}=require('../.test-build/lib/builder-pro');
const now=new Date('2026-11-03T20:00:00Z');
const fixture=(id,date,home,away,tipoff)=>({id,date,home,away,tipoff,source:'ESPN',playerIds:[]});
const schedule={status:'available',source:'ESPN',fixtures:[
 fixture('1','2026-11-04','Los Angeles Lakers','LA Clippers','2026-11-04T02:00:00Z'),
 fixture('2','2026-11-06','Los Angeles Lakers','Boston Celtics','2026-11-06T02:00:00Z'),
 fixture('2b','2026-11-06','LA Lakers','Boston Celtics','2026-11-06T02:00:00Z'), // different provider alias duplicate
 fixture('3','2026-11-08','Denver Nuggets','LA Lakers','2026-11-08T02:00:00Z'),
 fixture('4','2026-11-02','New York Knicks','LA Lakers','2026-11-02T02:00:00Z'), // past
 fixture('5','2026-11-20','Boston Celtics','Miami Heat','2026-11-20T02:00:00Z'), // out of window
 fixture('6','2026-11-04','Unknown Wolves','Boston Celtics','2026-11-04T06:00:00Z'),
]};
const w3=nbaGameCoverage(schedule,now,3);
assert.equal(w3.from,'2026-11-03');
assert.equal(opportunitiesForTeam('Lakers',w3).length,1);
const w7=nbaGameCoverage(schedule,now,7);
assert.equal(opportunitiesForTeam('Lakers',w7).length,3,'multiple fixtures survive and alias duplicates are eliminated');
assert.equal(opportunitiesForTeam('Los Angeles Clippers',w7)[0].opponent,'Los Angeles Lakers');
assert.equal(opportunitiesForTeam('Boston Celtics',w7).length,1,'unknown team never matched');
assert.deepEqual(opportunitiesForTeam('Unknown Wolves',w7),[]);
assert.equal(nbaGameCoverage({status:'unavailable',source:null,fixtures:[]},now,7).gamesByTeam.size,0);
assert.equal(multiGameLabel(2),'Double Game');assert.equal(multiGameLabel(3),'3 Spiele');
assert.equal(assessMatchup('LA Clippers',{'Los Angeles Clippers':1},'nba').rating,1);
assert.equal(assessMatchup('Clippers',{'Los Angeles Clippers':5},'nba').tone,'hard');
assert.equal(assessMatchup('Lakers',{'LA Lakers':3,'Los Angeles Lakers':4},'nba').rating,null,'conflicting aliases must not be guessed');
assert.equal(assessMatchup('Unknown',{'Boston Celtics':2},'nba').rating,null);
assert.equal(assessMatchup('FC Bayern München',{'FC Bayern München':4},'football').label,'Schwierig');
const player=(id,position,score,team='Lakers')=>forecast({id,name:id,team,position,avg:score,proj:score,recentScores:[score,score+1,score-1,score,score],last5Apps:5,status:'STARTER',playOdds:1,injuries:0,hasGame:true});
const nbaCards=[player('one','G',40),player('two','F',35),player('three','C',45),player('four','F',43),player('five','G',50),player('six','G',55)].map((p,i)=>({player:p,stars:i===5?5:3,owned:true}));
const left=['one','two','three','four','five'],other=['one','two','three','four',null];
const leftEval=evaluateManualLineup(left,nbaCards,'nba',200);
const rightEval=evaluateManualLineup(other,nbaCards,'nba',200);
assert.equal(leftEval.valid,true);assert.equal(rightEval.valid,false);
const battle=compareBuilderTeams(leftEval,rightEval,200,200);
assert.equal(battle.sharedPlayers,4);assert.equal(battle.deltaScore,leftEval.projectedScore-rightEval.projectedScore);
const good=transferWorkspacePlayer({source:left,target:other,sourceSlot:4,targetSlot:4,sameTeam:false,mode:'copy',sport:'nba',cards:nbaCards});
assert.equal(good.reason,null);assert.equal(good.source[4],'five');assert.equal(good.target[4],'five');
const locked=transferWorkspacePlayer({source:left,target:other,sourceSlot:4,targetSlot:4,sameTeam:false,mode:'move',sport:'nba',cards:nbaCards,sourceLocks:['five']});
assert.match(locked.reason,/fixiert/);
const dup=transferWorkspacePlayer({source:left,target:other,sourceSlot:0,targetSlot:4,sameTeam:false,mode:'copy',sport:'nba',cards:nbaCards});
assert.match(dup.reason,/bereits/);
const badCap=transferWorkspacePlayer({source:left,target:['one','two','three','four',null],sourceSlot:4,targetSlot:4,sameTeam:false,mode:'move',sport:'nba',cards:nbaCards,sourceLocks:[]});
assert.equal(badCap.reason,null,'budget is checked on both resulting lineups');
const sameSwap=transferWorkspacePlayer({source:left,target:left,sourceSlot:0,targetSlot:1,sameTeam:true,mode:'move',sport:'nba',cards:nbaCards});
assert.equal(sameSwap.reason,null);assert.equal(sameSwap.source[0],'two');assert.equal(sameSwap.source[1],'one');
const footballCards=[player('gk','GK',50),player('def','DEF',40),player('mid','MID',40),player('fwd','FWD',40),player('flex','MID',40)].map(p=>({player:p,owned:true}));
const footballTransfer=transferWorkspacePlayer({source:['gk',null,null,null,null],target:[null,null,null,null,null],sourceSlot:0,targetSlot:1,sameTeam:false,mode:'copy',sport:'football',cards:footballCards});
assert.match(footballTransfer.reason,/passt/);
const checkSources=['lib/sorare.ts','lib/nba-stars.ts','lib/nba-stars-feed.ts','lib/model.ts'];
for(const p of checkSources)assert(fs.readFileSync(p).length>0);
const component=fs.readFileSync('app/components/builder-workspace.tsx','utf8');
for(const text of ['TEAM BATTLE','Mehrfachspieler','Gegnerstärke','für Teamtransfer wählen','Spielzeitraum','NBA-Spielzeitraum'])assert(component.includes(text));
console.log('V2.5 Gameweek opportunities, aliases, matchup integrity, team comparisons, touch transfers, NBA cap and football slots passed.');

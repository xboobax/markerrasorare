const assert=require('node:assert/strict');
const fs=require('node:fs');
const {eligibleNbaStarsIds,verifyStarsTransfer}=require('../.test-build/lib/nba-stars-matchday');
const {buildNbaStarsOptimizer,assessNbaStarsLineup}=require('../.test-build/lib/nba-stars-optimizer');
const {initialV30Settings}=require('../.test-build/lib/builder-v30');
const {forecast}=require('../.test-build/lib/model');
const at=new Date('2026-11-06T12:00:00Z'); // 13:00 Berlin
const schedule={status:'available',source:'ESPN',fixtures:[
  {id:'now',date:'2026-11-06',home:'Boston Celtics',away:'Miami Heat',source:'ESPN',tipoff:'2026-11-06T23:30:00Z',playerIds:[]},
  {id:'late',date:'2026-11-07',home:'Dallas Mavericks',away:'Utah Jazz',source:'ESPN',tipoff:'2026-11-07T15:00:00Z',playerIds:[]},
  {id:'tomorrow',date:'2026-11-07',home:'Cleveland Cavaliers',away:'Indiana Pacers',source:'ESPN',tipoff:'2026-11-07T23:30:00Z',playerIds:[]},
  {id:'no-time',date:'2026-11-06',home:'Orlando Magic',away:'Chicago Bulls',source:'ESPN',playerIds:[]},
  {id:'old',date:'2026-11-05',home:'Atlanta Hawks',away:'Denver Nuggets',source:'ESPN',tipoff:'2026-11-05T23:30:00Z',playerIds:[]},
  {id:'unknown',date:'2026-11-06',home:'Unknown Team',away:'Brooklyn Nets',source:'ESPN',tipoff:'2026-11-06T18:00:00Z',playerIds:[]},
]};
const players=['Boston Celtics','Miami Heat','Dallas Mavericks','Utah Jazz','Cleveland Cavaliers','Indiana Pacers','Orlando Magic','Chicago Bulls','Atlanta Hawks','Denver Nuggets','Brooklyn Nets','Phantom Club'].map((team,i)=>({id:String(i),team}));
const ids=(window,sch=schedule)=>eligibleNbaStarsIds(players,sch,window,at);
assert.deepEqual([...ids('24h')].sort(),['0','1'].sort(),'only team fixture within strictly next 24 h');
assert.deepEqual([...ids('today')].sort(),['6','7'].sort(),'Berlin today uses actual tipoff to place UTC-night game on Berlin tomorrow');
assert.deepEqual([...ids('tomorrow')].sort(),['0','1','2','3'].sort());
assert.ok(ids('7d').has('6'),'7-day schedule can include date-only fixtures without claiming 24 h accuracy');
assert.ok(!ids('7d').has('8'),'finished matches excluded');
assert.equal(ids('24h',{...schedule,status:'unavailable'}).size,0,'fail closed on missing schedule');
assert.ok(!ids('24h').has('10'),'single recognized team is not enough');
const allowed=new Set(['a','b','c','d','e']);
const stars=new Map([['a',2],['b',2],['c',2],['d',2],['e',3]]);
assert.equal(verifyStarsTransfer(['a','b','c','d','e'],stars,allowed,11),null);
assert.match(verifyStarsTransfer(['a','b','c','d','e'],stars,allowed,10),/Sterne-Limit/);
assert.match(verifyStarsTransfer(['a','b','c','d','a'],stars,allowed,16),/unterschiedliche/);
assert.match(verifyStarsTransfer(['a','b','c','d','x'],stars,allowed,16),/keinen bestätigten Termin/);
const cards=Array.from({length:13},(_,i)=>({player:forecast({id:'card'+i,name:'Card '+i,team:'Miami Heat',position:'G',avg:80-i,proj:80-i,averageL5:80-i,averageL10:80-i,recentScores:[70,70,70,70,70,70,70,70],last5Apps:5,status:'STARTER',playOdds:1,injuries:0,hasGame:true}),stars:1.5+(i%4)*.5,owned:true,bonusPercent:0}));
const opts={sport:'nba',limit:12,advancedSettings:initialV30Settings()};
const sixteen=buildNbaStarsOptimizer(cards,opts,2,16);
const eleven=buildNbaStarsOptimizer(cards,opts,2,11);
assert.ok(sixteen.variants.length>0&&eleven.variants.length>0);
assert.ok(eleven.variants.every(v=>v.lineup.starsUsed<=11));
assert.ok(assessNbaStarsLineup(eleven.variants[0].lineup,11).unusedStars<=11);
const ui=fs.readFileSync('app/components/arcade-dashboard.tsx','utf8');
const manual=fs.readFileSync('app/components/builder-workspace.tsx','utf8');
for(const token of ['NBA STARS OPTIMIZER 3.0','eligibleNbaStarsIds','matchdayNbaCards','transferStarsLineup','requestedStarsLineup','nbaStarsLimit','nbaWindow'])assert.ok(ui.includes(token),token);
for(const token of ['verifyStarsTransfer','requestedStarsLineup','changeTeam(destination.id','window.confirm','onStarsLineupHandled'])assert.ok(manual.includes(token),token);
assert.ok(!ui.includes('NBA STARS OPTIMIZER 2.1'));
console.log('V4.5.13: strict NBA Matchday, Berlin/UTC windows, confirmed team pairs, 11/16 stars, safe full-lineup transfer + UI replacement OK');

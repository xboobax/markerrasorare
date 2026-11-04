const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {rankDailyMissionPlayers,dailyMissionHasFixture,missionDescription}=require('../.test-build/lib/daily-mission');
const {forecast}=require('../.test-build/lib/model');
const now=new Date('2026-11-04T12:00:00Z');
const nbaSchedule={status:'available',source:'ESPN',fixtures:[{id:'1',date:'2026-11-05',home:'Boston Celtics',away:'Chicago Bulls',tipoff:'2026-11-04T23:00:00Z',source:'ESPN',playerIds:[]}]};
const none={status:'unavailable',source:null,fixtures:[]};
function player(id,sport,overrides={}){
 return {...forecast({id,name:id,team:sport==='nba'?'Boston Celtics':'Club A',position:sport==='nba'?'G':'FWD',
  avg:45,averageL5:45,averageL10:38,proj:45,recentScores:[48,46,42,52,43,41,39,47,40,49],
  status:'STARTER',playOdds:0.95,injuries:0,last5Apps:5,hasGame:true,
  nextGame:sport==='football'?'2026-11-04 Club A - Club B':undefined,...overrides}),...overrides};
}
const opts={sport:'nba',window:'next24',now,nbaSchedule};
const high=player('high','nba',{averageL10:10,proj:45});
const hard=player('hard','nba',{averageL10:51,proj:45});
const missing=player('missing','nba',{averageL10:null});
const rows=rankDailyMissionPlayers([hard,high,missing],opts);
assert.equal(rows.length,2);
assert.equal(rows[0].player.id,'high');
assert.equal(rows[0].threshold,20); // lower-bound is enforced
assert.equal(rows.find(r=>r.player.id==='hard').threshold,58);
assert.equal(rows[0].historicalGames,10);
assert.equal(rows[0].historicalHits,10);
assert.equal(rows[0].quality,'history');
assert.ok(rows.every(r=>r.rankIndex>=0&&r.rankIndex<=100));
assert.ok(rows[0].reason.includes('10/10'));
assert.equal(rankDailyMissionPlayers([high],{...opts,window:'today'}).length,0); // Nov 4 23Z is Berlin Nov 5
assert.equal(rankDailyMissionPlayers([high],{...opts,window:'tomorrow'}).length,1);
assert.equal(rankDailyMissionPlayers([high],{...opts,nbaSchedule:none}).length,0);
assert.equal(rankDailyMissionPlayers([high],{...opts,ownedOnly:true,ownedIds:new Set()}).length,0);
assert.equal(rankDailyMissionPlayers([high],{...opts,ownedOnly:true,ownedIds:new Set(['high'])}).length,1);
assert.equal(rankDailyMissionPlayers([high],{...opts,excludedIds:new Set(['high'])}).length,0);
assert.equal(rankDailyMissionPlayers([player('out','nba',{injuries:1})],opts).length,0);
assert.equal(rankDailyMissionPlayers([player('nogame','nba',{hasGame:false})],opts).length,0);
const noTime={status:'available',source:'ESPN',fixtures:[{...nbaSchedule.fixtures[0],tipoff:undefined}]};
assert.equal(rankDailyMissionPlayers([high],{...opts,nbaSchedule:noTime}).length,0); // no invented tipoffs
assert.ok(dailyMissionHasFixture(high,{...opts,window:'tomorrow'}));
const footOpts={sport:'football',window:'today',now,nbaSchedule:none};
const scorer=player('scorer','football',{position:'FWD',xg:0.8,xa:0.5});
const keeper=player('keeper','football',{position:'GK'});
const defender=player('defender','football',{position:'DEF'});
const footRows=rankDailyMissionPlayers([keeper,defender,scorer],footOpts);
assert.equal(footRows.length,3);
assert.equal(footRows.find(r=>r.player.id==='keeper').kind,'goalkeeper');
assert.equal(footRows.find(r=>r.player.id==='scorer').quality,'partial');
assert.ok(footRows.find(r=>r.player.id==='keeper').reason.includes('nicht separat messbar'));
assert.ok(footRows.find(r=>r.player.id==='scorer').reason.includes('nicht separat messbar'));
assert.equal(rankDailyMissionPlayers([keeper],{...footOpts,window:'tomorrow'}).length,0);
assert.equal(rankDailyMissionPlayers([keeper],{...footOpts,window:'next24'}).length,0); // no invented kickoff
assert.ok(missionDescription('nba').includes('L10'));
const dashboard=fs.readFileSync(path.join(__dirname,'../app/components/arcade-dashboard.tsx'),'utf8');
const component=fs.readFileSync(path.join(__dirname,'../app/components/daily-mission-picker.tsx'),'utf8');
assert.match(dashboard,/DailyMissionPicker/);
assert.match(dashboard,/data-tab="builder" id="daily-mission"/);
assert.match(component,/rankDailyMissionPlayers/);
assert.match(component,/L10/);
assert.match(component,/Einzelscores/);
console.log('V3.6 Daily Mission Picker: L10+7/20, Day+timezone, ownership, availability and football honest fallback OK');

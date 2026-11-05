const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {sorareFootballEstimate,parseFootballStatMinutes,footballStatLine,parseEspnFootballPlayers,parseEspnFootballPlays,parseEspnFootballScoreboard,parseEspnFootballSummary}=require('../.test-build/lib/football-live-core');
const s=(values={})=>({minutes:90,goals:0,assists:0,shotsOnTarget:0,saves:0,clearances:0,tacklesWon:0,interceptions:0,chancesCreated:0,crossesCompleted:0,duelsWon:0,foulsWon:0,yellowCards:0,redCards:0,ownGoals:0,goalsConceded:0,penaltiesSaved:0,penaltiesMissed:0,...values});
assert.equal(parseFootballStatMinutes("90'"),90);
assert.equal(parseFootballStatMinutes('45:00'),45);
assert.equal(parseFootballStatMinutes('--'),null);
assert.equal(footballStatLine(['MIN','G','A','SOG','SV'],["90'",'1','1','2','0']).goals,1);
assert.equal(sorareFootballEstimate(s({goals:1,assists:1,shotsOnTarget:2}), 'FWD').total,null,'incomplete ESPN scoring must not impersonate exact Sorare PS');
const teams=[{id:'11',name:'Arsenal',abbreviation:'ARS'},{id:'22',name:'Chelsea',abbreviation:'CHE'}];
const event={id:'401999111',date:'2026-11-05T19:00Z',competitions:[{date:'2026-11-05T19:00Z',venue:{fullName:'Example Stadium'},status:{period:2,displayClock:"67'",type:{state:'in',shortDetail:"67'"}},competitors:[{homeAway:'home',score:'2',team:{id:teams[0].id,displayName:teams[0].name,abbreviation:'ARS',logo:'https://example.com/ars.png'}},{homeAway:'away',score:'1',team:{id:teams[1].id,displayName:teams[1].name,abbreviation:'CHE',logo:'https://example.com/che.png'}}]}]};
const scores=parseEspnFootballScoreboard({events:[event]},'2026-11-05T19:00:03Z','eng.1');
assert.equal(scores.length,1);assert.equal(scores[0].status,'live');assert.equal(scores[0].home.score,2);assert.equal(scores[0].away.score,1);
const ath=(id,name,stats,starter=true,pos='FWD')=>({athlete:{id,displayName:name,shortName:name,headshot:{href:'https://example.com/photo.png'},position:{abbreviation:pos}},stats,starter});
const summary={header:{id:event.id,date:event.date,competitions:event.competitions},boxscore:{players:[
  {team:teams[0],statistics:[{labels:['MIN','G','A','SOG','SV','TKL','INT','CLR'],athletes:[ath('1','Bukayo Saka',["67'",'1','0','2','0','1','1','0'],true,'MID')]}]},
  {team:teams[1],statistics:[{labels:['MIN','G','A','SOG','SV','TKL','INT','CLR'],athletes:[ath('2','Cole Palmer',["67'",'0','1','1','0','0','0','0'],true,'MID')]}]},
]},commentary:[{id:'100',sequenceNumber:1,text:'Goal by Arsenal',clock:{displayValue:"12'"},awayScore:0,homeScore:1,team:{id:'11'}},{id:'101',sequenceNumber:2,text:'Yellow card',clock:{displayValue:"22'"},team:{id:'22'}}]};
const detail=parseEspnFootballSummary(summary,event.id,'2026-11-05T19:00:05Z','eng.1');
assert.equal(detail.game.leagueName,'Premier League');assert.equal(detail.players.length,2);assert.equal(detail.players[0].score.total,null,'partial stats do not imply a complete Sorare score');assert.equal(detail.plays[0].id,'101');
assert.throws(()=>parseEspnFootballSummary(summary,'999999999','2026-11-05T19:00:05Z','eng.1'),/ander/);
const here=path.join(__dirname,'..');
for(const file of ['lib/football-live-core.ts','lib/football-live-server.ts','features/matches/football-live-center.tsx','app/api/football-live/scoreboard/route.ts','app/api/football-live/game/route.ts','app/api/football-live/projections/route.ts'])assert.ok(fs.existsSync(path.join(here,file)),`${file} exists`);
const ui=fs.readFileSync(path.join(here,'features/matches/football-live-center.tsx'),'utf8');
const page=fs.readFileSync(path.join(here,'app/match-center/page.tsx'),'utf8');
assert.match(ui,/PLAY-BY-PLAY/);assert.match(ui,/SORARE-DATENPRÜFUNG/);assert.match(ui,/PP\/Q80 laden/);assert.match(ui,/document\.hidden/);assert.match(ui,/activeCollectionCards\(cache,'football'\)/);assert.match(ui,/foot-pitch/);
assert.match(page,/if\(searchParams\.sport===\"football\"\)/,'football live route mounted separately');
console.log('V4.2: football live score conversion, routes, lineup UI and safe polling passed');

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {sorareNbaScore,parseStatMinutes,espnStatLine,parseEspnPlayers,parseEspnPlays,parseEspnScoreboard,parseEspnSummary}=require('../.test-build/lib/nba-live-core');
const s=(values={})=>({minutes:32,points:0,rebounds:0,assists:0,steals:0,blocks:0,threes:0,turnovers:0,...values});
assert.equal(sorareNbaScore(s({points:6})),6);
assert.equal(sorareNbaScore(s({points:2,rebounds:1,assists:1})),4.7);
assert.equal(sorareNbaScore(s({points:11,rebounds:10,assists:9,steals:1,blocks:1,threes:1,turnovers:2})),40.5);
assert.equal(sorareNbaScore(s({points:20,rebounds:10,assists:10})),49); // +1 DD +1 TD
assert.equal(parseStatMinutes('31:30'),31.5);
assert.equal(parseStatMinutes('--'),null);
assert.equal(parseStatMinutes('DNP'),null);
assert.equal(espnStatLine(['PTS','REB'],['20','10']),null,'incomplete stats must not generate a fake score');
assert.equal(espnStatLine(['MIN','PTS','REB','AST','3PT','STL','BLK','TO'],['3:00','6','0','0','2-3','0','0','0']).threes,2,'ESPN 3PT made-attempted must count made threes');
const teams=[{id:'11',name:'Los Angeles Lakers',abbreviation:'LAL'},{id:'22',name:'Boston Celtics',abbreviation:'BOS'}];
const event={id:'401723456',date:'2026-11-05T00:00Z',competitions:[{date:'2026-11-05T00:00Z',status:{period:1,displayClock:'11:05',type:{state:'in',shortDetail:'Q1 11:05'}},competitors:[
  {homeAway:'away',score:'5',team:{id:teams[0].id,displayName:teams[0].name,abbreviation:'LAL',logo:'https://example.com/lal.png'}},
  {homeAway:'home',score:'2',team:{id:teams[1].id,displayName:teams[1].name,abbreviation:'BOS',logo:'https://example.com/bos.png'}},
]}]};
const scores=parseEspnScoreboard({events:[event]},'2026-11-05T00:00:03Z');
assert.equal(scores.length,1);assert.equal(scores[0].status,'live');assert.equal(scores[0].home.score,2);assert.equal(scores[0].away.score,5);
assert.throws(()=>parseEspnScoreboard({},new Date().toISOString()),/Spieleliste/);
const ath=(id,name,stats,starter=true)=>({athlete:{id,displayName:name,shortName:name,headshot:{href:'https://example.com/photo.png'}},stats,starter});
const summary={header:{id:event.id,date:event.date,competitions:event.competitions},boxscore:{players:[
  {team:teams[0],statistics:[{labels:['MIN','PTS','REB','AST','3PT','STL','BLK','TO'],athletes:[ath('1','Anthony Davis',['3:00','6','0','0','0-2','0','0','0']),ath('2','DNP Guy',['0','0','0','0','0-0','0','0','0'],false)]}]},
  {team:teams[1],statistics:[{labels:['MIN','PTS','REB','AST','3PT','STL','BLK','TO'],athletes:[ath('3','Derrick White',['3:00','2','1','1','0-0','0','0','0'])]}]},
]},plays:[{id:'100',sequenceNumber:1,text:'Made 3-pt shot',period:{number:1},clock:{displayValue:'11:35'},awayScore:3,homeScore:0,team:{id:'11'},scoringPlay:true},
  {id:'101',sequenceNumber:2,text:'Defensive rebound',period:{number:1},clock:{displayValue:'11:34'},team:{id:'22'},scoringPlay:false}]};
const detail=parseEspnSummary(summary,event.id,'2026-11-05T00:00:05Z');
assert.equal(detail.game.status,'live');assert.equal(detail.players.length,3);assert.equal(detail.players[0].score,6);
assert.equal(detail.players[1].score,null,'DNP with zero minutes is NOT a confirmed zero');
assert.equal(detail.players[2].score,4.7);assert.equal(detail.plays[0].id,'101','newest events first');
assert.throws(()=>parseEspnSummary(summary,'999999999','2026-11-05T00:00:05Z'),/ander/);
assert.ok(parseEspnPlays({...summary,plays:Array.from({length:500},(_,i)=>({id:String(i),text:'test',sequenceNumber:i}))}).length<=180);
const here=path.join(__dirname,'..');
for(const file of ['lib/nba-live-server.ts','features/matches/nba-live-center.tsx','app/api/nba-live/scoreboard/route.ts','app/api/nba-live/game/route.ts'])assert.ok(fs.existsSync(path.join(here,file)),`${file} exists`);
const ui=fs.readFileSync(path.join(here,'features/matches/nba-live-center.tsx'),'utf8');
const page=fs.readFileSync(path.join(here,'app/match-center/page.tsx'),'utf8');
assert.match(ui,/Play-by-Play|PLAY-BY-PLAY/);assert.match(ui,/Sorare-Basisscore/);assert.match(ui,/setInterval/);assert.match(ui,/document\.hidden/);
assert.match(ui,/myCards/);assert.match(ui,/PP\/Q80 laden/);assert.match(ui,/selectedGameRef/);assert.match(page,/if\(searchParams\.sport==="nba"\)/,'do not invoke full Sorare data in live NBA route');
assert.match(ui,/selectedGame\.status==='final'/,'finished games must not be polled');
const route=fs.readFileSync(path.join(here,'app/api/nba-live/game/route.ts'),'utf8');
assert.ok(route.includes('\\d{6,14}'), 'game ID validated');
const server=fs.readFileSync(path.join(here,'lib/nba-live-server.ts'),'utf8');
assert.match(server,/Promise\.allSettled/,'fetch previous US day to handle Germany midnight');
assert.match(server,/Europe\/Berlin/,'match date is Berlin-local');
console.log('V4.1: live score conversion, ESPN adapters, starter validation, play limits, separate lightweight route, bounded polling passed');

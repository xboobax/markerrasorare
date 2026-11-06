const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {footballExplicitMinutes,footballStatLine,parseEspnFootballPlayers}=require('../.test-build/lib/football-live-core');
const {sumKnownMinutes,sumOfficialMinutes}=require('../.test-build/lib/football-stats-v4515');

assert.equal(sumKnownMinutes([]),null,'no matches means unknown minutes');
assert.equal(sumKnownMinutes([{minutes:null},{minutes:null}]),null,'no reported minutes must NOT render 0');
assert.equal(sumKnownMinutes([{minutes:0}]),0,'a confirmed zero stays a real zero');
assert.equal(sumKnownMinutes([{minutes:58},{minutes:null},{minutes:31}]),89);
assert.equal(sumKnownMinutes([{minutes:151},{minutes:null}]),null,'nonsensical minutes are ignored');
assert.equal(sumOfficialMinutes([{stats:{}},{stats:{goals:1}}]),null);
assert.equal(sumOfficialMinutes([{stats:{minsPlayed:90}},{stats:{minsPlayed:64}}]),154);
assert.equal(sumOfficialMinutes([{stats:{minsPlayed:0}}]),0);

assert.equal(footballExplicitMinutes({minutesPlayed:"84'"}),84);
assert.equal(footballExplicitMinutes({minsPlayed:45}),45);
assert.equal(footballExplicitMinutes({minutes:'--'},{playingTime:'61:00'}),61);
assert.equal(footballExplicitMinutes({starter:true,subbedIn:true}),null,'a starter flag cannot imply 90 minutes');
assert.equal(footballStatLine(['MIN PLAYED','G'],['90','1']).minutes,90);
assert.equal(footballStatLine(['MINS','G'],['75','1']).minutes,75);

const base={id:'401999111',leagueKey:'eng.1',date:'2026-11-05T19:00:00Z',
  home:{id:'11',name:'Arsenal'},away:{id:'22',name:'Chelsea'},status:'final'};
const athlete=(id,name,stats,minutes)=>({athlete:{id,displayName:name,position:{abbreviation:'FWD'}},
  starter:true,stats,...(minutes===undefined?{}:{minutesPlayed:minutes})});
const raw={boxscore:{players:[{team:{id:'11'},statistics:[{labels:['G','A'],athletes:[
  athlete('1111','Minutes Present',['1','0'],"83'"),
  athlete('2222','Minutes Missing',['0','1'])]}]}]}};
const players=parseEspnFootballPlayers(raw,base);
assert.equal(players.find(p=>p.id==='1111').stats.minutes,83,'ESPN explicit minutes must be kept');
assert.equal(players.find(p=>p.id==='2222').stats.minutes,null,'missing provider minutes must remain null');

const root=path.join(__dirname,'..');
const panel=fs.readFileSync(path.join(root,'app/components/football-stats-panel.tsx'),'utf8');
assert.match(panel,/sumKnownMinutes\(minutesSource\)/,'profile must not coalesce missing minutes to zero');
assert.match(panel,/Minuten · Sorare/,'official source minutes must be independently labelled');
const db=fs.readFileSync(path.join(root,'lib/football-stats-db-v4515.ts'),'utf8');
assert.match(db,/minutes IS NOT NULL\)::integer AS with_minutes/);
assert.match(db,/official_stats \? 'minsPlayed'/);
console.log('V4.5.16.1.2: missing minutes remain NULL, explicit ESPN minutes captured, Sorare minutes separate');

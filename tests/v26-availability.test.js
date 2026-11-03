const assert=require('node:assert/strict');
const fs=require('node:fs');
const {forecast}=require('../.test-build/lib/model');
const {parseStatus,parseEspnAvailability,parseApiFootballAvailability,availabilityForPlayers,nextRefreshMs,isConfirmedOut}=require('../.test-build/lib/availability');
const {smartFillEmptySlots,quickSwapsForSlot}=require('../.test-build/lib/builder-neon');
for(const [source,expected] of [['Out','out'],['Missing Fixture','out'],['Questionable','questionable'],['Day-To-Day','questionable'],['Probable','probable'],['Available','available'],['Doubtful','doubtful'],['RANDOM',null],['',null]])assert.equal(parseStatus(source),expected);
const nba=parseEspnAvailability({injuries:[{team:{displayName:'Los Angeles Lakers'},injuries:[
  {athlete:{displayName:'LeBron James'},status:'Out',type:'Left ankle'},
  {athlete:{displayName:'Austin Reaves'},status:'Questionable',type:'Knee'}
]},{team:{displayName:'Boston Celtics'},athletes:[{displayName:'Player Three',injuries:[{status:'Probable',details:{type:'Illness'}}]}]}]});
assert.equal(nba.length,3);
assert.equal(nba.find(r=>r.name==='LeBron James')?.team,'Los Angeles Lakers');
assert.equal(nba.find(r=>r.name==='Player Three')?.status,'probable');
const today='2026-11-04';
const foot=parseApiFootballAvailability({response:[
 {player:{name:'Harry Kane'},team:{name:'FC Bayern München'},fixture:{date:'2026-11-06T16:30:00+00:00'},type:'Missing Fixture',reason:'Injury'},
 {player:{name:'Jamal Musiala'},team:{name:'FC Bayern München'},fixture:{date:'2026-11-06'},type:'Questionable',reason:'Illness'},
 {player:{name:'Historical'},team:{name:'FC Bayern München'},fixture:{date:'2026-10-01'},type:'Missing Fixture'}
]},'Bundesliga',today);
assert.equal(foot.length,2);assert.equal(foot[0].status,'out');assert.equal(foot[1].status,'questionable');
const make=(id,name,team,position)=>forecast({id,name,team,position,avg:50,proj:50,recentScores:[50,49,48,47,46],last5Apps:5,status:'STARTER',playOdds:1,injuries:0,hasGame:true,nextGame:'2026-11-06 FC Bayern München - Schalke 04'});
const sample=[make('kane','Harry Kane','FC Bayern München','FWD'),make('musiala','Jamal Musiala','FC Bayern München','MID'),make('duplicate','Harry Kane','Unknown FC','FWD'),make('nba','LeBron James','Lakers','G')];
const byId=availabilityForPlayers(sample,[...foot,...nba],'football');
assert.equal(byId.kane?.status,'out');assert.equal(byId.musiala?.status,'questionable');assert.equal(byId.duplicate,undefined,'wrong football team must not be assigned an injury report');
assert.equal(availabilityForPlayers([sample[3]],nba,'nba').nba.status,'out','NBA alias matching');
assert.equal(availabilityForPlayers([sample[3]],[{name:'LeBron James',team:'LAL',status:'out',source:'ESPN',reason:'Ankle'}],'nba').nba.status,'out','ESPN abbreviation matching');
assert.equal(availabilityForPlayers([make('a','Same Name','A FC','MID'),make('b','Same Name','B FC','MID')],[{name:'Same Name',team:'',source:'ESPN',status:'out',reason:''}],'football').a,undefined,'ambiguous names without a team never match');
const day=Date.parse('2026-11-04T12:00:00Z');
assert.equal(nextRefreshMs(new Date(day),['2026-11-04T12:20:00Z']),300000);
assert.equal(nextRefreshMs(new Date(day),['2026-11-04T13:00:00Z']),600000);
assert.equal(nextRefreshMs(new Date(day),['2026-11-05T13:00:00Z']),1800000);
assert.equal(isConfirmedOut(byId.kane),true);assert.equal(isConfirmedOut(byId.musiala),false);
// Existing optimizer rejects reported OUT when its normal excludedIds parameter is used.
const cards=[make('injured','Injured','Lakers','G'),make('active','Healthy','Lakers','F')].map(p=>({player:p,owned:true,stars:2}));
assert.deepEqual(quickSwapsForSlot(['active',null,null,null,null],0,cards,'nba',['injured']),[]);
const builder=fs.readFileSync('app/components/builder-workspace.tsx','utf8');
const dashboard=fs.readFileSync('app/components/arcade-dashboard.tsx','utf8');
const route=fs.readFileSync('app/api/availability/route.ts','utf8');
for(const word of ['INJURY & AVAILABILITY','LINEUP RISK RADAR','Verletzungsstatus filtern','Quick Swap','availability.refresh','excludedByInjury'])assert(builder.includes(word),word);
assert(dashboard.includes('isConfirmedOut(injuryById[p.id])'));
assert(route.includes('getAvailabilitySnapshot'));
console.log('V2.6 availability parser, ambiguous matching, fixtures, refresh intervals and optimizer safeguards passed.');
(async()=>{
 const {getAvailabilitySnapshot}=require('../.test-build/lib/availability-feed');
 const prev=global.fetch,oldKey=process.env.API_FOOTBALL_KEY;
 delete process.env.API_FOOTBALL_KEY;
 global.fetch=async(url)=>{
  if(String(url).includes('basketball/nba'))return Response.json({injuries:[{athlete:{displayName:'LeBron James'},status:'Out',team:{displayName:'Los Angeles Lakers'}}]});
  if(String(url).includes('soccer/ger.1'))return Response.json({injuries:[]});
  return Response.json({error:'not found'},{status:404});
 };
 try{
  const nb=await getAvailabilitySnapshot('nba','');
  assert.equal(nb.status,'available');assert.equal(nb.reports.length,1);
  const de=await getAvailabilitySnapshot('football','Bundesliga');
  assert.equal(de.status,'available');assert.equal(de.reports.length,0,'no official report is not a fitness clearance');
  const all=await getAvailabilitySnapshot('football','__all');
  assert.equal(all.status,'partial');assert.deepEqual(all.sources,['ESPN Bundesliga']);
 }finally{global.fetch=prev;if(oldKey===undefined)delete process.env.API_FOOTBALL_KEY;else process.env.API_FOOTBALL_KEY=oldKey;}
 console.log('V2.6 provider fallback and unavailable states passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});

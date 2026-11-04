const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {forecast}=require('../.test-build/lib/model');
const {evaluateManualLineup}=require('../.test-build/lib/manual-lineup');
const {diagnoseLineup,doctorRisk}=require('../.test-build/lib/lineup-doctor');
const {findHiddenGems}=require('../.test-build/lib/hidden-gems');
const {analyzeDataHealth,createLocalBackup,parseLocalBackup}=require('../.test-build/lib/data-health');
const make=(id,position,stars=2,opts={})=>({player:forecast({
  id,name:id,team:`Team ${id}`,position,avg:43,averageL5:45,averageL10:42,
  proj:43,recentScores:[42,46,44,45,48,40,39,42,38,41],last5Apps:5,status:'STARTER',
  playOdds:.9,injuries:0,hasGame:true,imageUrl:`https://example.com/${id}.jpg`,...opts,
}),owned:true,stars,bonusPercent:0});
const nba=[make('n1','G',4),make('n2','F',4),make('n3','C',3),make('n4','G',3),make('n5','F',2),
  make('new-guard','G',2,{avg:55,averageL5:57,averageL10:55,proj:54,recentScores:[55,60,53,52,57,58,52,53,54,59]})];
const selection=['n1','n2','n3','n4','n5'];
const report=diagnoseLineup(selection,nba,'nba',200,{limit:3});
assert.equal(report.status,'ready');
assert.ok(report.swaps.some(x=>x.toId==='new-guard'));
assert.ok(report.swaps.length<=3);
for(const swap of report.swaps){
  const revised=[...selection];revised[swap.slotIndex]=swap.toId;
  const evaluated=evaluateManualLineup(revised,nba,'nba',200);
  assert.equal(evaluated.valid,true,'proposed exchange must satisfy NBA stars and five unique players');
  assert.ok(evaluated.starsUsed<=16);
  assert.ok(Math.abs(swap.projectedAfter-evaluated.projectedScore)<1e-6);
}
assert.ok(!report.swaps.some(s=>s.toId==='n1'), 'same player cannot enter lineup twice');
const tooMany=[...nba.map(c=>c.player.id==='n5'?{...c,stars:3}:c),make('repair','G',1.5)];
const broken=diagnoseLineup(selection,tooMany,'nba',null);
assert.equal(broken.status,'invalid');
assert.ok(broken.swaps.length>0,'invalid NBA star budget needs repair proposals when feasible');
for(const s of broken.swaps){
  const next=[...selection];next[s.slotIndex]=s.toId;
  assert.equal(evaluateManualLineup(next,tooMany,'nba').valid,true);
}
assert.equal(diagnoseLineup(['n1',null,null,null,null],nba,'nba',null).status,'incomplete');
const soccer=[make('gk','GK'),make('def','DEF'),make('mid','MID'),make('fwd','FWD'),make('flex','MID'),make('another','FWD')];
for(const swap of diagnoseLineup(['gk','def','mid','fwd','flex'],soccer,'football',200).swaps){
  const next=['gk','def','mid','fwd','flex'];next[swap.slotIndex]=swap.toId;
  assert.equal(evaluateManualLineup(next,soccer,'football').valid,true,'football positions must be respected');
}
const risk=make('risky','G',2,{hasGame:false,playOdds:.1,injuries:1});
assert.ok(doctorRisk(risk.player)>doctorRisk(nba[0].player));

const nbaGems=findHiddenGems(nba.map(c=>c.player),'nba',Object.fromEntries(nba.map(c=>[c.player.id,{owned:c.owned,stars:c.stars}])));
assert.ok(nbaGems.gems.length>0);
assert.ok(nbaGems.gems.every(g=>g.metric.includes('Pkt. pro ★')));
assert.ok(nbaGems.gems.every(g=>g.value>=0));
const noStars=findHiddenGems(nba.map(c=>c.player),'nba',{},{});
assert.equal(noStars.gems.length,0,'missing NBA stars must not be invented');
assert.ok(noStars.missingStars>0);
const filtered=findHiddenGems(nba.map(c=>c.player),'nba',{n1:{owned:true,stars:4}},{ownedOnly:true});
assert.equal(filtered.gems.length,1);
const weak=forecast({id:'weak',name:'weak',team:'T',position:'G',avg:null,proj:null,averageL5:null,averageL10:null,
  recentScores:[],last5Apps:null,status:'',playOdds:null,injuries:0,hasGame:null});
assert.ok(!findHiddenGems([weak],'nba',{weak:{stars:1}}).gems.length);
const soccerGems=findHiddenGems(soccer.map(c=>c.player),'football',{});
assert.ok(soccerGems.gems.length>0);
assert.ok(soccerGems.gems.every(g=>g.metric.includes('Analyse-Index')));

const summary={scopeTeams:6,failedTeams:1,incompleteTeams:2,noScoreTeams:0,generatedAt:'2026-11-03T20:00:00Z'};
let health=analyzeDataHealth([...nba.map(c=>c.player),weak],summary);
assert.equal(health.state,'partial');assert.equal(health.scoreless,1);
assert.ok(health.metrics.some(m=>m.key==='scoring'&&m.count===nba.length));
assert.ok(health.warnings.some(w=>w.includes('Teams')));
health=analyzeDataHealth([], {...summary,error:'Sorare error'});
assert.equal(health.state,'error');
const store={
  'markerras.sorare.watchlist.v19.nba':'["a","b"]',
  'markerras.sorare.manual-lineup.v1.football':'{"selection":[null,null,null,null,null]}',
  'markerras.sorare.cards.v1.nba':'{}',
  'markerras.sorare.model.v18.nba':'v18',
  'my-secret-token':'password-do-not-export',
  'markerras.sorare.tracking.v1.nba':'[{"score":20}]',
};
const storage={length:Object.keys(store).length,key(i){return Object.keys(store)[i]??null;},getItem(k){return store[k]??null;}};
const backup=createLocalBackup(storage,'2026-11-03T20:00:00Z');
assert.equal(backup.format,'markerras-local-settings');
assert.ok(!JSON.stringify(backup).includes('password-do-not-export'));
assert.ok(!Object.keys(backup.settings).some(key=>key.includes('tracking')),'prediction tracking requires separate export');
assert.deepEqual(parseLocalBackup(backup).settings,backup.settings);
assert.throws(()=>parseLocalBackup({...backup,settings:{'my-secret-token':'secret'}}));
assert.throws(()=>parseLocalBackup({...backup,settings:{'markerras.sorare.cards.v1.nba':'broken'}}));
assert.throws(()=>parseLocalBackup({...backup,settings:{'markerras.sorare.model.v18.nba':'evil'}}));
const root=path.join(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'app/components/arcade-dashboard.tsx'),'utf8');
const manual=fs.readFileSync(path.join(root,'app/components/manual-lineup.tsx'),'utf8');
const healthUI=fs.readFileSync(path.join(root,'app/components/data-health-center.tsx'),'utf8');
for(const needle of ['<HiddenGems','<DataHealthCenter','fetchSummary','V3.6 · DAILY MISSIONS'])assert.ok(ui.includes(needle),needle);
for(const needle of ['diagnoseLineup','doctor-recommendations','Diesen Wechsel übernehmen','doctor-issue-details'])assert.ok(manual.includes(needle),needle);
for(const needle of ['createLocalBackup','parseLocalBackup','window.location.reload','window.confirm','Sorare-Abfragen'])assert.ok(healthUI.includes(needle),needle);
const sorare=fs.readFileSync(path.join(root,'lib/sorare.ts'));
const originalSha='32d3189f8de56bd2d358e179803ed297589244d0d4132b4349b7a0575d3fa8db';
assert.equal(crypto.createHash('sha256').update(sorare).digest('hex'),originalSha,
  'critical stable Sorare adapter must remain byte-for-byte unchanged');
console.log('V2.1 Doctor (strict validation), hidden gems, data coverage, safe local backup and integration passed.');

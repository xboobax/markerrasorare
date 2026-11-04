const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {getTeamRoster}=require('../.test-build/lib/sorare.js');
const prev=global.fetch;
const team={slug:'boston-celtics',name:'Boston Celtics',league:'NBA'};
(async()=>{
 try {
   let requests=[];
   global.fetch=async(_url,init)=>{
     const q=JSON.parse(init.body).query;
     requests.push(q);
     // Reject the two fields invalid in the official Nov-2026 NBAPlayer schema.
     if(/\blastFiveSo5AverageScore\b|\blastTenPlayedSo5AverageScore\b/.test(q))
       return {ok:true,text:async()=>JSON.stringify({errors:[{message:'Cannot query field on NBAPlayer.'}]})};
     assert.match(q,/averageL5: averageScore\(type: LAST_FIVE_SO5_AVERAGE_SCORE\)/);
     assert.match(q,/averageL10: averageScore\(type: LAST_TEN_PLAYED_SO5_AVERAGE_SCORE\)/);
     assert.match(q,/rawPlayerGameScores\(last: 10\)/);
     assert.match(q,/anyActivePlayers\(first: 20/);
     return {ok:true,text:async()=>JSON.stringify({data:{team:{anyActivePlayers:{nodes:[
       {slug:'p1',displayName:'Boston Test Player',anyPositions:['Guard'],avatarPictureUrl:'https://example.com/p1.jpg',
       averageL5:38,averageL10:40,rawPlayerGameScores:[38,41,42,43,44,37,39,38,41,37],
       nextDailyFixtureProjectedScore:44,lastFiveSo5Appearances:5}
     ]}}}})};
   };
   const r=await getTeamRoster('nba',team);
   assert.equal(requests.length,1);
   assert.equal(r.scoringFieldsUnavailable,false);
   assert.equal(r.players[0].averageL5,38);
   assert.equal(r.players[0].averageL10,40);
   assert.equal(r.players[0].avg,40);
   assert.equal(r.players[0].recentScores.length,10);
   assert.equal(r.players[0].proj,44);
   // Validate a projection-field schema change doesn't downgrade averages.
   const subprocess=String.raw`
     const assert=require('node:assert/strict');
     const {getTeamRoster}=require('./.test-build/lib/sorare.js');
     let attempts=0;
     global.fetch=async(_url,init)=>{
       const q=JSON.parse(init.body).query;
       attempts++;
       const optional=q.includes('nextDailyFixtureProjectedScore')||q.includes('nextClassicFixtureProjectedScore');
       if(optional) return {ok:true,text:async()=>JSON.stringify({errors:[{message:'Cannot query field "nextDailyFixtureProjectedScore" on type "NBAPlayer".'}]})};
       return {ok:true,text:async()=>JSON.stringify({data:{team:{anyActivePlayers:{nodes:[{
         slug:'p2',displayName:'P2',anyPositions:['Forward'],avatarPictureUrl:'https://example.com/p2.jpg',
         averageL5:34, averageL10:37, rawPlayerGameScores:[35,38,41]
       }]}}}})};
     };
     getTeamRoster('nba',{slug:'miami-heat',name:'Miami Heat',league:'NBA'}).then(r=>{
       assert.equal(attempts,2);
       assert.equal(r.scoringFieldsUnavailable,false);
       assert.equal(r.players[0].avg,37);
       assert.equal(r.players[0].averageL5,34);
       assert.deepEqual(r.players[0].recentScores,[35,38,41]);
       assert.equal(r.players[0].imageUrl,'https://example.com/p2.jpg');
     }).catch(e=>{console.error(e);process.exitCode=1});
   `;
   const child=spawnSync(process.execPath,['-e',subprocess],{cwd:process.cwd(),encoding:'utf8'});
   assert.equal(child.status,0,child.stderr||child.stdout);
   console.log('V1.7.2 verified NBA schema and data-preserving fallbacks passed.');
 } finally {global.fetch=prev;}
})().catch(e=>{console.error(e);process.exitCode=1});

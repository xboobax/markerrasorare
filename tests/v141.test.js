const assert = require('node:assert/strict');
const {getTeamRoster}=require('../.test-build/lib/sorare.js');
const {forecast}=require('../.test-build/lib/model.js');
const original = global.fetch;
(async()=>{
  try {
    let invalidNBAFields = 0;
    global.fetch = async (_url,init)=>{
      const query = JSON.parse(init.body).query;
      if (query.includes('rawPlayerGameScores') || query.includes('activeInjuries') || query.includes('nextGame')) invalidNBAFields++;
      assert.match(query,/lastFiveSo5AverageScore/);
      assert.match(query,/lastTenPlayedSo5AverageScore/);
      const nodes=[{slug:'player-a',displayName:'Player A',anyPositions:['Guard'],
        lastFiveSo5AverageScore:41,lastTenPlayedSo5AverageScore:44,
        nextDailyFixtureProjectedScore:46,lastFiveSo5Appearances:5,
        playingStatus:'STARTER'}];
      return {ok:true,text:async()=>JSON.stringify({data:{team:{anyActivePlayers:{nodes}}}})};
    };
    const result=await getTeamRoster('nba',{slug:'nba-team',name:'NBA Team',league:'NBA'});
    assert.equal(result.complete,true);
    assert.equal(result.scoringFieldsUnavailable,false);
    assert.equal(result.players.length,1);
    assert.equal(invalidNBAFields,0);
    assert.equal(result.players[0].avg,44);
    assert.equal(result.players[0].averageL5,41);
    assert.equal(result.players[0].proj,46);
    const p=forecast(result.players[0]);
    assert.ok(p.expected>40 && p.expected<50);
    assert.equal(p.last5Avg,41);
    assert.equal(p.last10Avg,44);
    console.log('NBA standard average score regression test passed.');
  } finally {global.fetch=original;}
})().catch(e=>{console.error(e);process.exitCode=1;});

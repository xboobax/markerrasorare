const assert = require('node:assert/strict');
const {getTeamRoster}=require('../.test-build/lib/sorare.js');
const {forecast}=require('../.test-build/lib/model.js');
const original = global.fetch;
(async()=>{
  try {
    let invalidNBAFields = 0;
    global.fetch = async (_url,init)=>{
      const query = JSON.parse(init.body).query;
      if (query.includes('lastFiveSo5AverageScore') || query.includes('lastTenPlayedSo5AverageScore') || query.includes('activeInjuries') || query.includes('nextGame')) invalidNBAFields++;
      assert.match(query,/averageL5: averageScore\(type: LAST_FIVE_SO5_AVERAGE_SCORE\)/);
      assert.match(query,/averageL10: averageScore\(type: LAST_TEN_PLAYED_SO5_AVERAGE_SCORE\)/);
      assert.match(query,/rawPlayerGameScores\(last: 10\)/);
      assert.match(query,/anyActivePlayers\(first: 20/);
      const nodes=[{slug:'player-a',displayName:'Player A',anyPositions:['Guard'],
        averageL5:41,averageL10:44,rawPlayerGameScores:[41,41,41,41,41,47,47,47,47,47],
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

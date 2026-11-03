const assert = require('node:assert/strict');
const { getTeamRoster } = require('../.test-build/lib/sorare.js');
const { forecast } = require('../.test-build/lib/model.js');
const prev = global.fetch;
(async () => {
  try {
    for (const league of ['LaLiga', 'Ligue 1', 'Premier League', 'Bundesliga']) {
      let called = 0;
      global.fetch = async (_url, init) => {
        const query = JSON.parse(init.body).query;
        called++;
        assert.match(query, /averageL5: averageScore\(type: LAST_FIVE_SO5_AVERAGE_SCORE\)/);
        assert.match(query, /averageL10: averageScore\(type: LAST_TEN_PLAYED_SO5_AVERAGE_SCORE\)/);
        assert.match(query, /rawPlayerGameScores\(last: 10\)/);
        assert.doesNotMatch(query, /\blastFiveSo5AverageScore\b/);
        assert.match(query, /activePlayers\(first: 40/);
        const player = {slug:'test-player',displayName:'Player',position:'Forward',
          avatarPictureUrl:'https://example.org/p.jpg',playingStatus:'STARTER',
          rawPlayerGameScores:[62,51,49,58,55],averageL5:55,averageL10:52,
          nextClassicFixtureProjectedScore:null,lastFiveSo5Appearances:5};
        return {ok:true,text:async()=>JSON.stringify({data:{football:{club:{activePlayers:{nodes:[player]}}}}})};
      };
      const roster = await getTeamRoster('football',{slug:'club',name:'Test Club',league});
      assert.equal(called,1);
      assert.equal(roster.players[0].averageL5,55);
      assert.equal(roster.players[0].avg,55);
      assert.equal(roster.players[0].imageUrl,'https://example.org/p.jpg');
      assert.ok(forecast(roster.players[0]).expected>40, 'scores must work even with NULL next projection');
    }
    console.log('V1.6.2 four football leagues / actual Sorare field names tests passed.');
  } finally { global.fetch = prev; }
})().catch(e=>{console.error(e);process.exitCode=1;});

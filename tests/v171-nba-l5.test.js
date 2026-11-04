const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { getTeamRoster } = require('../.test-build/lib/sorare.js');
const { forecast } = require('../.test-build/lib/model.js');
const oldFetch = global.fetch;
const club = { slug: 'los-angeles-lakers', name: 'Los Angeles Lakers', league: 'NBA' };
const player = { slug: 'nba-player', displayName: 'NBA Player', anyPositions: ['Guard'], avatarPictureUrl: 'https://example.org/nba.png',
  averageL5: 36, averageL10: 40, rawPlayerGameScores: [36,36,36,36,36,44,44,44,44,44], nextClassicFixtureProjectedScore: null,
  nextDailyFixtureProjectedScore: 42, lastFiveSo5Appearances: 5 };
(async () => {
  try {
    let queries = [];
    global.fetch = async (_url, init) => {
      const q = JSON.parse(init.body).query;
      queries.push(q);
      assert.match(q, /rawPlayerGameScores\(last: 10\)/, 'NBA should use valid rawPlayerGameScores');
      assert.ok(!q.includes('activeInjuries') && !q.includes('nextGame'), 'NBA roster should be compact');
      return {ok:true,text:async () => JSON.stringify({data:{team:{anyActivePlayers:{nodes:[player]}}}})};
    };
    const {players,scoringFieldsUnavailable} = await getTeamRoster('nba',club);
    assert.equal(queries.length,1);
    assert.equal(scoringFieldsUnavailable,false);
    assert.equal(players[0].avg,40);
    assert.equal(players[0].averageL5,36);
    assert.equal(players[0].averageL10,40);
    assert.equal(players[0].imageUrl,'https://example.org/nba.png');
    const p=forecast(players[0]);
    assert.equal(p.last5Avg,36);
    assert.equal(p.last10Avg,40);
    assert.ok(p.expected > 30);

    // Test optional projection-field failures in an isolated process: a schema
    // fallback must still preserve NBA L5/L10 rather than drop to core-only.
    const child = String.raw`
      const assert=require('node:assert/strict');
      const {getTeamRoster}=require('./.test-build/lib/sorare.js');
      let count=0;
      global.fetch=async (_url,init)=>{
        const q=JSON.parse(init.body).query;
        count++;
        const bad=q.includes('nextClassicFixtureProjectedScore') ? 'nextClassicFixtureProjectedScore' :
          q.includes('nextDailyFixtureProjectedScore') ? 'nextDailyFixtureProjectedScore' : '';
        if(bad) return {ok:true,text:async()=>JSON.stringify({errors:[{message:'Cannot query field "'+bad+'" on type "NBAPlayer".'}]})};
        return {ok:true,text:async()=>JSON.stringify({data:{team:{anyActivePlayers:{nodes:[{
          slug:'nba-player', displayName:'NBA Player', anyPositions:['Guard'],
          avatarPictureUrl:'https://example.org/nba.png',
          averageL5:41, averageL10:45, rawPlayerGameScores:[45,42,39]
        }]}}}})};
      };
      getTeamRoster('nba',{slug:'nba-team',name:'NBA Team',league:'NBA'}).then(r=>{
        assert.equal(count,2);
        assert.equal(r.scoringFieldsUnavailable,false);
        assert.equal(r.players[0].avg,45);
        assert.equal(r.players[0].averageL5,41);
        assert.equal(r.players[0].imageUrl,'https://example.org/nba.png');
      }).catch(e=>{console.error(e);process.exitCode=1});
    `;
    const out = spawnSync(process.execPath,['-e',child],{cwd:process.cwd(),encoding:'utf8'});
    assert.equal(out.status,0,out.stderr || out.stdout);
    console.log('V1.7.1 NBA L5/average and compact fallback tests passed.');
  } finally {global.fetch=oldFetch;}
})().catch(e=>{console.error(e);process.exitCode=1});

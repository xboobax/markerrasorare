const assert = require('node:assert/strict');
const {getTeamRoster} = require('../.test-build/lib/sorare.js');
const originalFetch = global.fetch;
const names = {
  nba: {slug:'new-nba-athlete', displayName:'NBA Athlete', anyPositions:['Guard'], avatarPictureUrl:'https://example.org/nba.png'},
  football: {slug:'new-fb-athlete', displayName:'Football Athlete', position:'Forward', playingStatus:'STARTER', avatarPictureUrl:'https://example.org/football.png'},
};

(async () => {
  try {
    // Regression 1: both sports must request avatarPictureUrl and keep their scores.
    for (const sport of ['football','nba']) {
      let calls=0;
      global.fetch = async (_url, init) => {
        const query=JSON.parse(init.body).query;
        assert.match(query, /\bavatarPictureUrl\b/);
        assert.ok(!/\bpictureUrl\b/.test(query), 'Legacy pictureUrl must not break NBA GraphQL');
        calls++;
        const record = {...names[sport], rawPlayerGameScores:[47,53],
          lastFiveSo5AverageScore:50, nextClassicFixtureProjectedScore:52};
        const data = sport === 'nba'
          ? {team:{anyActivePlayers:{nodes:[record]}}}
          : {football:{club:{activePlayers:{nodes:[record]}}}};
        return {ok:true,text:async()=>JSON.stringify({data})};
      };
      const club={slug:'test-team',name:'Test Team',league:sport==='nba'?'NBA':'Bundesliga'};
      const result=await getTeamRoster(sport,club);
      assert.equal(calls,1);
      assert.equal(result.players.length,1);
      assert.equal(result.players[0].imageUrl,names[sport].avatarPictureUrl);
      assert.deepEqual(result.players[0].recentScores,[47,53]);
      assert.equal(result.players[0].proj,52);
    }
    // Regression 2: a schema downgrade must still request avatarPictureUrl.
    // A fresh process tests the first tier. This scenario is NBA because that
    // sport previously dropped photos on its second schema-fallback tier.
    const {spawnSync}=require('node:child_process');
    const separate = `
      const assert=require('node:assert/strict');
      const {getTeamRoster}=require('./.test-build/lib/sorare.js');
      let n=0;
      global.fetch=async (_url,init)=>{
        const q=JSON.parse(init.body).query;
        assert.match(q,/\\bavatarPictureUrl\\b/);
        n++;
        if(q.includes('rawPlayerGameScores')) return {ok:true,text:async()=>JSON.stringify({errors:[{message:'Cannot query field "rawPlayerGameScores" on type "NBAPlayer".'}]})};
        return {ok:true,text:async()=>JSON.stringify({data:{team:{anyActivePlayers:{nodes:[{
          slug:'nba2',displayName:'NBA2',anyPositions:['Guard'],avatarPictureUrl:'https://example.org/2.jpg',
          lastFiveSo5AverageScore:45,nextDailyFixtureProjectedScore:48
        }]}}}})};
      };
      getTeamRoster('nba',{slug:'nba-test',name:'NBA Test',league:'NBA'}).then(r=>{
        assert.equal(n,2);
        assert.equal(r.players[0].imageUrl,'https://example.org/2.jpg');
        assert.equal(r.players[0].proj,48);
      }).catch(e=>{console.error(e);process.exitCode=1});
    `;
    const run=spawnSync(process.execPath,['-e',separate],{cwd:process.cwd(),encoding:'utf8'});
    assert.equal(run.status,0,run.stderr||run.stdout);
    console.log('V1.6.1 player portraits / fallback regression tests passed.');
  } finally {global.fetch=originalFetch;}
})().catch(e=>{console.error(e);process.exitCode=1;});

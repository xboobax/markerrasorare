const assert=require('node:assert/strict');
const {getTeamRoster,getPlayers,getNbaTeams}=require('../.test-build/lib/sorare.js');
const {mapDefenseToRatings,alignOpponentNames,getAutomaticMatchupData}=require('../.test-build/lib/auto-matchups.js');
const {createTrackedPrediction,upsertTracked,setActual,trackingMetrics}=require('../.test-build/lib/tracking.js');
const {forecast}=require('../.test-build/lib/model.js');

(async()=>{
 const prev=global.fetch;
 try {
  let calls=0;
  const athlete=(slug)=>({slug,displayName:slug,position:'Defender',playingStatus:'STARTER'});
  global.fetch=async(_url,init)=>{
    const query=JSON.parse(init.body).query;
    calls++;
    if(query.includes('clubsReady')) throw Error('unexpected');
    if(query.includes('club(')) {
      const second=query.includes('after: "cursor-1"');
      return {ok:true,text:async()=>JSON.stringify({data:{football:{club:{activePlayers:{
        nodes:second?[athlete('b'),athlete('c')]:[athlete('a'),athlete('b')],
        pageInfo:{hasNextPage:!second,endCursor:second?'cursor-2':'cursor-1'}
      }}}}})};
    }
    throw Error('Unexpected '+query);
  };
  const club={slug:'club',name:'Club',league:'Bundesliga'};
  const data=await getTeamRoster('football',club);
  assert.equal(data.complete,true);
  assert.deepEqual(data.players.map(p=>p.id),['a','b','c']);
  assert.equal(calls,2);
  const more=await getPlayers('football',[club]);
  assert.equal(more.incomplete,0);
  assert.equal(more.failed,0);
  assert.equal(more.players.length,3);
  const rating=mapDefenseToRatings([
    {name:'Manchester City',concededPerGame:.4,games:10},
    {name:'Arsenal FC',concededPerGame:.6,games:9},
    {name:'Weak Club',concededPerGame:2.1,games:10},
    {name:'No games',concededPerGame:4,games:0},
  ]);
  assert.equal(rating['Manchester City'],5);
  assert.equal(rating['Weak Club'],1);
  const aligned=alignOpponentNames(rating,['Manchester City FC','Arsenal','Unknown']);
  assert.equal(aligned['Manchester City FC'],5);
  assert.equal(aligned['Arsenal'],3);
  assert.equal(aligned['Unknown'],undefined);
  delete process.env.API_FOOTBALL_KEY;delete process.env.BALLDONTLIE_API_KEY;
  const neutral=await getAutomaticMatchupData('nba',new Date('2026-11-03T00:00:00Z'));
  assert.equal(neutral.coverage,0);
  assert.equal(neutral.source,null);
  assert.equal(neutral.season,2026);
  const player=forecast({id:'x',name:'X',team:'Team',position:'F',avg:50,proj:50,last5Apps:5,status:'STARTER',playOdds:.9,injuries:0,hasGame:true, nextGame:'2026-11-04 A - B'});
  const saved=createTrackedPrediction(player,'nba',new Date('2026-11-03T12:00:00Z'));
  const once=upsertTracked([],saved), twice=upsertTracked(once,saved);
  assert.equal(twice.length,1);
  assert.equal(trackingMetrics(twice).count,0);
  const updated=setActual(twice,saved.key,32);
  assert.equal(updated[0].actual,32);
  assert.equal(trackingMetrics(updated).count,1);
  assert.ok(trackingMetrics(updated).mae>=0);
  assert.equal(setActual(updated,saved.key,-5)[0].actual,32);
  console.log('V1.4 pagination, live feed proxy, tracking tests passed.');
 } finally {global.fetch=prev;}
})().catch(e=>{console.error(e);process.exitCode=1;});

const assert=require('node:assert/strict');
const {extractEspnCompletedGames,getEspnNbaDefenseFallback}=require('../.test-build/lib/nba-defense-fallback');
const event=(id,home,away,homeScore,awayScore,completed=true,season=2)=>({
 id,date:'2026-11-02T20:00:00Z',season:{type:season},status:{type:{completed}},
 competitions:[{competitors:[{homeAway:'home',team:{displayName:home},score:String(homeScore)},
 {homeAway:'away',team:{displayName:away},score:String(awayScore)}]}],
});
const games=[
 event('1','Boston Celtics','LA Lakers',110,90),
 event('2','Boston Celtics','Denver Nuggets',120,80),
 event('3','Boston Celtics','LA Lakers',100,85),
 event('4','Denver Nuggets','LA Lakers',100,75),
 event('5','Denver Nuggets','Boston Celtics',85,140),
 event('6','LA Lakers','Denver Nuggets',90,130),
];
assert.equal(extractEspnCompletedGames([...games,event('7','Toronto Raptors','Utah Jazz',90,90,false),event('8','Boston Celtics','LA Lakers',99,100,true,1),event('9','Bogus City','LA Lakers',99,100),event('10','Boston Celtics','LA Lakers',null,100)],'2026-10-06','2026-11-03').length,6);
(async()=>{
 const old=global.fetch;
 try{
  let count=0;
  global.fetch=async url=>{
   count++;
   assert(String(url).includes('scoreboard'));
   return {ok:true,json:async()=>({events:[...games,...games]})};
  };
  const data=await getEspnNbaDefenseFallback(new Date('2026-11-03T12:00:00Z'));
  assert.equal(data.coverage,3);
  assert.equal(data.ratings['Boston Celtics'],5,'fewest conceded points should be hardest');
  assert.equal(data.ratings['Denver Nuggets'],3);
  assert.equal(data.ratings['Los Angeles Lakers'],1);
  assert.match(data.source,/ESPN/);
  assert.equal(count,2,'only fetch current and previous calendar month');
  global.fetch=async()=>{throw new Error('feed offline');};
  const offline=await getEspnNbaDefenseFallback(new Date('2026-11-03T12:00:00Z'));
  assert.equal(offline.coverage,0);assert.equal(offline.source,null);
  assert.equal(offline.ratings['Boston Celtics'],undefined,'never invent ratings without evidence');
  console.log('V2.5 ESPN matchup fallback: completed-game guards, duplicates, ranked defense and offline safety passed.');
 }finally{global.fetch=old;}
})().catch(e=>{console.error(e);process.exitCode=1});

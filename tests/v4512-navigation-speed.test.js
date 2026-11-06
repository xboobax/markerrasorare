"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
let ts;try{ts=require("typescript")}catch{ts=require(require("node:child_process").execSync("npm root -g",{encoding:"utf8"}).trim()+"/typescript")}
const root=path.join(__dirname,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const source=read("features/core/workspace-server.ts");
assert.match(source,/unstable_cache\(/,"Repeated public roster data is cached");
assert.match(source,/revalidate:180/,"Cache has a short time-to-live");
assert.match(source,/fetchSummary\.failedTeams>0\|\|data\.fetchSummary\.incompleteTeams>0/,"Incomplete rosters are not cached");
assert.doesNotMatch(source,/SORARE_API_KEY|localStorage|ownedCards|sessionToken|accessToken/,"No personal collection or access data in the shared workspace cache");
for(const route of ["app/loading.tsx","app/builder/[sport]/loading.tsx","app/players/loading.tsx","app/analytics/loading.tsx","app/daily-missions/loading.tsx","app/match-center/loading.tsx","app/collection/loading.tsx"]){
  assert.match(read(route),/DreamWorkspaceLoading/,`${route} must show immediate fallback`);
}
assert.match(read("features/shell/dream-workspace-loading.tsx"),/role="status"/);
assert.match(read("features/shell/dream-shell.tsx"),/prefetch=\{false\}/,"Do not preload every heavy route at once");
// Behavior test with a miniature deterministic Next/cache mock: public data
// is reused across menu routes; incomplete snapshots are fetched again.
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
let rosterCalls=0, incomplete=false;
const cacheKeys=[];
const cacheMock={unstable_cache:(fn,keys,options)=>{
  assert.equal(options.revalidate,180);cacheKeys.push(keys[0]);const cache=new Map();
  return async(...args)=>{const key=JSON.stringify(args);if(cache.has(key))return cache.get(key);const value=await fn(...args);cache.set(key,value);return value;};
}};
const clubs=[{slug:"club-a",name:"Club A",league:"Bundesliga"}];
const deps={
 "next/cache":cacheMock,
 "@/lib/sorare":{getFootballClubs:async()=>clubs,getPlayers:async()=>{
   rosterCalls++;return {players:[{id:"player-1",weighted:28}],failed:incomplete?1:0,incomplete:0,noScoreFields:0};
 }},
 "@/lib/regular-nba":{getRegularNbaTeams:async()=>clubs},
 "@/lib/model":{forecast:p=>p},
 "@/lib/leagues":{FOOTBALL_LEAGUES:["Bundesliga"],isFootballLeague:val=>val==="Bundesliga"},
 "@/lib/auto-matchups":{getAutomaticMatchupData:async()=>({ratings:{},coverage:1})},
 "@/lib/nba-defense-fallback":{getEspnNbaDefenseFallback:async()=>({coverage:0})},
 "@/lib/nba-gameweek-feed":{getNbaGameweekSchedule:async()=>({fixtures:[],status:"ready",source:null})},
 "@/lib/nba-fixture-mapping":{attachNbaFixtures:(players)=>players},
};
const moduleMock={exports:{}};
const invoke=new Function("module","exports","require","process",output);
invoke(moduleMock,moduleMock.exports,name=>{if(!(name in deps))throw new Error(`Unexpected import: ${name}`);return deps[name];},process);
(async()=>{
  const load=moduleMock.exports.loadWorkspaceData;
  const one=await load({sport:"football"});
  const two=await load({sport:"football",league:"Bundesliga"});
  assert.equal(one.players.length,1);assert.equal(two.players.length,1);
  assert.equal(rosterCalls,1,"Identical public datasets share cached roster and forecasts");
  const three=await load({sport:"football",league:"__all"});
  assert.equal(rosterCalls,2,"Different scopes must not share wrong roster");
  assert.equal(three.players.length,1);
  incomplete=true;
  await load({sport:"nba"});
  await load({sport:"nba"});
  assert.equal(rosterCalls,4,"Incomplete result must not be cached");
  assert.equal(cacheKeys[0],"dream-public-workspace-v4512");
  console.log("V4.5.12: loading boundaries, shared public cache, scope isolation, no caching partial rosters: OK");
})().catch(err=>{console.error(err);process.exit(1)});

/**
 * Pure validated observations for the V4.5 performance archive.
 * ESPN FINAL boxscore observations are NOT official Sorare scores, and must
 * never be used as the target label for PP/Q80 calibration.
 */
import type {Sport} from './model';
import type {LiveGameDetail} from './nba-live-core';
import type {FootballLiveGameDetail} from './football-live-core';
import {SORARE_AA_MATRIX,decisiveFields} from './sorare-football-scoring';

export type V45Performance={
  sport:Sport;competition:string;gameId:string;playerId:string;playerName:string;
  team:string;opponent:string;position:string|null;fixtureStart:string;
  started:boolean|null;minutes:number|null;stats:Record<string,number>;
  reportedFields:string[];statCount:number;
};
export type V45PerformanceSummary={sport:Sport;total:number;games:number;players:number;lastGame:string|null;
  withMinutes:number;withLineup:number;passingSamples:number;duelSamples:number;threeSamples:number;avgThreeMade:number|null};
const compact=(s:string)=>s.trim().slice(0,160);
const iso=(s:string)=>Number.isFinite(Date.parse(s))?new Date(s).toISOString():null;
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
const statValid=(key:string,x:unknown):x is number=>finite(x)&&x<=1000&&(x>=0||(key==='netDuels'&&x>=-1000));
const GAME_ID=/^\d{6,14}$/;
const PLAYER_ID=/^\d{1,20}$/;
const ONLY_NBA=['points','rebounds','assists','threes','threeAttempts','steals','blocks','turnovers'] as const;
const ONLY_FOOTBALL=['goals','assists','shotsOnTarget','saves','clearances','tacklesWon','interceptions','chancesCreated','crossesCompleted','duelsWon','foulsWon','yellowCards','redCards','ownGoals','goalsConceded','penaltiesSaved','penaltiesMissed'] as const;
// Safelist: all official-matrix event keys, but store only events that the data feed actually supplies.
const FOOTBALL_FIELDS=Array.from(new Set<string>([...ONLY_FOOTBALL,...Object.keys(SORARE_AA_MATRIX),...decisiveFields,'netDuels']));
function recordValid(row:V45Performance):boolean{
  const date=iso(row.fixtureStart);
  return (row.sport==='nba'||row.sport==='football')&&Boolean(date)&&
    GAME_ID.test(row.gameId)&&PLAYER_ID.test(row.playerId)&&row.playerName.length>=2&&
    row.team.length>0&&row.opponent.length>0&&row.statCount>0&&
    row.reportedFields.length===row.statCount&&Object.keys(row.stats).length===row.statCount&&
    row.reportedFields.every(k=>statValid(k,row.stats[k]))&&
    (row.minutes===null||finite(row.minutes)&&row.minutes>=0&&row.minutes<=150);
}
export function v45Validated(rows:V45Performance[],sport:Sport):V45Performance[]{
  const seen=new Set<string>();const out:V45Performance[]=[];
  for(const r of rows){if(r.sport!==sport||!recordValid(r))continue;
    const key=`${r.sport}:${r.competition}:${r.gameId}:${r.playerId}`;
    if(seen.has(key))continue;seen.add(key);out.push(r);
  }return out;
}
function withStats(base:Omit<V45Performance,'stats'|'reportedFields'|'statCount'>,raw:Record<string,number|null>,sport:Sport):V45Performance|null{
  const keys=(sport==='nba'?ONLY_NBA:FOOTBALL_FIELDS).filter(k=>statValid(k,raw[k]));
  const stats:Record<string,number>={};
  for(const key of keys)stats[key]=raw[key]!;
  const result:V45Performance={...base,stats,reportedFields:keys,statCount:keys.length};
  return recordValid(result)?result:null;
}
export function v45NbaObservations(detail:LiveGameDetail):V45Performance[]{
  const {game}=detail;
  if(game.status!=='final'||!iso(game.date)||!GAME_ID.test(game.id))return [];
  const teamStarterCounts=new Map([game.home.id,game.away.id].map(teamId=>[teamId,detail.players.filter(p=>p.teamId===teamId&&p.starter).length]));
  const rows:V45Performance[]=[];
  for(const player of detail.players){
    if(!player.played||!player.stats||!PLAYER_ID.test(player.id))continue;
    const own=player.teamId===game.home.id?game.home:player.teamId===game.away.id?game.away:null;
    const opponent=own?.id===game.home.id?game.away:game.home;
    if(!own)continue;
    const s=player.stats;
    const started=player.starter?true:(teamStarterCounts.get(own.id)??0)>=5?false:null;
    const row=withStats({sport:'nba',competition:'nba',gameId:game.id,playerId:player.id,
      playerName:compact(player.name),team:compact(own.name),opponent:compact(opponent.name),
      position:null,fixtureStart:new Date(game.date).toISOString(),started,minutes:s.minutes},
      {points:s.points,rebounds:s.rebounds,assists:s.assists,threes:s.threes,
        threeAttempts:s.threeAttempts??null,steals:s.steals,blocks:s.blocks,turnovers:s.turnovers},'nba');
    if(row)rows.push(row);
  }
  return v45Validated(rows,'nba');
}
export function v45FootballObservations(detail:FootballLiveGameDetail):V45Performance[]{
  const {game}=detail;
  if(game.status!=='final'||!iso(game.date)||!GAME_ID.test(game.id))return [];
  const teamStarterCounts=new Map([game.home.id,game.away.id].map(teamId=>[teamId,detail.players.filter(p=>p.teamId===teamId&&p.starter).length]));
  const rows:V45Performance[]=[];
  for(const player of detail.players){
    if(!player.played||!player.stats||!PLAYER_ID.test(player.id))continue;
    const own=player.teamId===game.home.id?game.home:player.teamId===game.away.id?game.away:null;
    const opponent=own?.id===game.home.id?game.away:game.home;
    if(!own)continue;
    const s=player.stats;
    // Generic ESPN stats are only accepted if the corresponding source column
    // was present. The historic 0-filled UI model is not evidence of 0 events.
    const observed=new Set(s.observedFields??[]);
    const raw:Record<string,number|null>={};
    for(const key of ONLY_FOOTBALL){if(key in s)raw[key]=observed.has(key)?(s as unknown as Record<string,number>)[key]:null;}
    // Preserve EVERY explicitly reported, defined decisive/AA event; never
    // assume the Sorare scoring feed and ESPN metrics are identical.
    const events=s.sorareEvents??{};
    for(const [key,value] of Object.entries(events)){
      if(FOOTBALL_FIELDS.includes(key)&&statValid(key,value))raw[key]=value;
    }
    const started=player.starter?true:(teamStarterCounts.get(own.id)??0)>=11?false:null;
    const row=withStats({sport:'football',competition:game.leagueKey,gameId:game.id,
      playerId:player.id,playerName:compact(player.name),team:compact(own.name),opponent:compact(opponent.name),
      position:player.position?.slice(0,30)??null,fixtureStart:new Date(game.date).toISOString(),started,minutes:s.minutes},raw,'football');
    if(row)rows.push(row);
  }
  return v45Validated(rows,'football');
}

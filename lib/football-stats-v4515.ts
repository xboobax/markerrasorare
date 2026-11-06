/** V4.5.15: source-separated *observed* football statistics. No forecasts here. */
import type {V45Performance} from './learning-v45-performance';
import type {FootballLiveGame,FootballLiveGameDetail} from './football-live-core';
import {sorareNameKey} from './football-live-sorare';
import {clubsIdentical} from './football-identity-reconcile-v45161';
export type FootballStatsProvider='espn'|'understat'|'fbref'|'sofascore'|'whoscored'|'soccerdata_espn'|'matchhistory'|'clubelo'|'sofifa';
export type FootballMatchStats={source:FootballStatsProvider;sourceGameId:string;sourcePlayerId:string;
  playerName:string;team:string;opponent:string;competition:string;fixtureStart:string;
  position:string|null;started:boolean|null;minutes:number|null;season:string|null;
  stats:Record<string,number>;reportedFields:string[]};
export type FootballProfileRow={source:FootballStatsProvider;sourceGameId:string;sourcePlayerId:string;
  date:string;competition:string;team:string;opponent:string;season:string|null;
  minutes:number|null;started:boolean|null;stats:Record<string,number>;reportedFields:string[]};
export type FootballOfficialScore={scoreId:string;slug:string;playerName:string;gameId:string;
  date:string;competition:string;home:string;away:string;team:string|null;score:number;
  decisive:number|null;allAround:number|null;scoringVersion:number|null;
  stats:Record<string,number>;breakdown:Array<{stat:string;value:number;points:number;category:string}>};
export const UNDERSTAT_FIELDS=['goals','assists','shots','xg','xa','xgChain','xgBuildup','keyPasses',
  'yellowCards','redCards','ownGoals'] as const;
export const EXTRA_STATS_FIELDS=['shots','shotsOnTarget','passes','accuratePasses','totalPasses',
  'keyPasses','crosses','crossesCompleted','tackles','tacklesWon','duelsWon','duelsLost',
  'interceptions','clearances','blockedShots','fouls','foulsWon','yellowCards','redCards',
  'goals','assists','saves','goalsConceded','xg','xa','npxg','xgChain','xgBuildup',
  'bigChancesCreated','bigChancesMissed'] as const;
export function validStatsRow(row:FootballMatchStats):boolean{
  const allowedSource=['espn','understat','fbref','sofascore','whoscored','soccerdata_espn','matchhistory','clubelo','sofifa'].includes(row.source);
  const id=/^[a-zA-Z0-9:_-]{1,100}$/;
  const date=Date.parse(row.fixtureStart);
  if(!allowedSource||!id.test(row.sourceGameId)||!id.test(row.sourcePlayerId)||
     !Number.isFinite(date)||!row.playerName?.trim()||row.playerName.length>160||
     !row.team?.trim()||!row.competition?.trim()||!row.opponent?.trim()||
     (row.minutes!==null&&(!Number.isFinite(row.minutes)||row.minutes<0||row.minutes>150)))return false;
  const keys=Object.keys(row.stats);
  return keys.length>0&&keys.length<=100&&keys.length===row.reportedFields.length&&
    new Set(row.reportedFields).size===keys.length&&keys.every(k=>/^[a-z][a-zA-Z0-9]{0,55}$/.test(k)&&
    row.reportedFields.includes(k)&&Number.isFinite(row.stats[k])&&
    row.stats[k]>=0&&row.stats[k]<=1000&&(!['xg','xa','npxg','xgChain','xgBuildup'].includes(k)||row.stats[k]<=40));
}
export function normalizeStatsRows(rows:readonly FootballMatchStats[],source:FootballStatsProvider):FootballMatchStats[]{
  const seen=new Map<string,FootballMatchStats>();
  for(const row of rows){if(row.source!==source||!validStatsRow(row))continue;
    seen.set(`${source}:${row.sourceGameId}:${row.sourcePlayerId}`,row);
  }return Array.from(seen.values()).slice(0,250);
}
export function fromEspnPerformances(rows:readonly V45Performance[]):FootballMatchStats[]{
  return normalizeStatsRows(rows.filter(p=>p.sport==='football').map(p=>({
    source:'espn' as const,sourceGameId:p.gameId,sourcePlayerId:p.playerId,
    playerName:p.playerName,team:p.team,opponent:p.opponent,
    competition:p.competition,fixtureStart:p.fixtureStart,position:p.position,
    started:p.started,minutes:p.minutes,season:null,stats:p.stats,
    reportedFields:p.reportedFields
  })),'espn');
}
export type UnderstatInput={sourceGameId:unknown;sourcePlayerId:unknown;playerName:unknown;team:unknown;
  opponent:unknown;competition:unknown;fixtureStart:unknown;position?:unknown;minutes?:unknown;
  started?:unknown;season?:unknown;completed?:unknown;stats?:unknown};
const clean=(value:unknown)=>typeof value==='string'?value.trim().slice(0,160):'';
export function fromUnderstatPayload(data:unknown):FootballMatchStats[]{
  if(!Array.isArray(data))return [];
  const rows:FootballMatchStats[]=[];
  for(const entry of data.slice(0,250) as UnderstatInput[]){
    if(!entry||entry.completed!==true)continue;
    const provided=entry.stats&&typeof entry.stats==='object'&&!Array.isArray(entry.stats)?entry.stats as Record<string,unknown>:{};
    const stats:Record<string,number>={};
    for(const key of UNDERSTAT_FIELDS){const value=provided[key];if(typeof value==='number'&&Number.isFinite(value)&&value>=0)stats[key]=value;}
    const minutes=typeof entry.minutes==='number'&&Number.isFinite(entry.minutes)?entry.minutes:null;
    const row:FootballMatchStats={source:'understat',sourceGameId:clean(String(entry.sourceGameId??'')),
      sourcePlayerId:clean(String(entry.sourcePlayerId??'')),playerName:clean(entry.playerName),
      team:clean(entry.team),opponent:clean(entry.opponent),competition:clean(entry.competition),
      fixtureStart:clean(entry.fixtureStart),position:clean(entry.position)||null,
      started:typeof entry.started==='boolean'?entry.started:null,minutes,
      season:clean(entry.season)||null,stats,reportedFields:Object.keys(stats)};
    if(validStatsRow(row))rows.push(row);
  }
  return normalizeStatsRows(rows,'understat');
}
export const normalizedName=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
/** Name + team AND unique candidate mandatory. Never match different teams on name alone. */
export function verifiedProfileMatches<T extends {source:string;playerName:string;team:string;sourcePlayerId:string}>(
  rows:readonly T[],name:string,team:string,linkedIds:ReadonlySet<string>=new Set()):T[]{
  const key=normalizedName(name),club=sorareNameKey(team);
  // Short-name players (e.g. Son) may still match by unique name+team.
  if(key.length<2)return [];
  const isLinked=(r:T)=>linkedIds.has(`${r.source}:${r.sourcePlayerId}`);
  const candidates=rows.filter(r=>isLinked(r)||
    (normalizedName(r.playerName)===key&&club.length>=3&&clubsIdentical(r.team,team)));
  const idsBySource=new Map<string,Set<string>>();
  for(const r of candidates){const source=(r as {source?:string}).source??'unknown';
    const ids=idsBySource.get(source)??new Set<string>();ids.add(r.sourcePlayerId);idsBySource.set(source,ids);}
  return candidates.filter(r=>isLinked(r)||(idsBySource.get(r.source)?.size===1));
}
/** An entirely missing field is unknown, never an observed zero. */
export function sumKnownMinutes(rows:readonly {minutes:number|null}[]):number|null{
  const minutes=rows.map(r=>r.minutes).filter((v):v is number=>
    typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=150);
  return minutes.length?Math.round(minutes.reduce((sum,v)=>sum+v,0)*100)/100:null;
}
/** Official Sorare minutes stay a separate provider sample from ESPN statistics. */
export function sumOfficialMinutes(rows:readonly {stats:Record<string,number>}[]):number|null{
  const minutes=rows.map(r=>r.stats.minsPlayed).filter((v):v is number=>
    typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=150);
  return minutes.length?Math.round(minutes.reduce((sum,v)=>sum+v,0)*100)/100:null;
}
export function sumStat(rows:readonly {stats:Record<string,number>}[],field:string):number|null{
  const known=rows.map(r=>r.stats[field]).filter(n=>typeof n==='number'&&Number.isFinite(n));
  return known.length?Math.round(known.reduce((a,b)=>a+b,0)*100)/100:null;
}

/** A verified FINAL scoreboard may disambiguate a partial ESPN summary.
 * Fail closed if ESPN changes game, teams, competition or kickoff. */
export function validatedEspnFinal(detail:FootballLiveGameDetail,board:FootballLiveGame):FootballLiveGameDetail|null{
  const actual=detail.game;
  if(board.status!=='final'||actual.id!==board.id||actual.leagueKey!==board.leagueKey||
     actual.home.id!==board.home.id||actual.away.id!==board.away.id||
     !Number.isFinite(Date.parse(actual.date))||
     Math.abs(Date.parse(actual.date)-Date.parse(board.date))>3*3600_000)return null;
  return {...detail,game:{...actual,status:'final',statusText:board.statusText}};
}

/** Join source-specific match observations to the exact Sorare FINAL game.
 * Requires same kickoff (max 3 hours) AND both team identities; fail closed.
 * Match IDs and stats remain unmodified, and duplicate provider records are not summed. */
export function linkStatsToOfficialMatches(
  matches:readonly FootballProfileRow[],official:readonly FootballOfficialScore[]
):Record<string,FootballProfileRow[]>{
  const linked:Record<string,FootballProfileRow[]>={};
  for(const row of matches){
    const stamp=Date.parse(row.date);if(!Number.isFinite(stamp))continue;
    const team=sorareNameKey(row.team),opponent=sorareNameKey(row.opponent);
    if(!team||!opponent||clubsIdentical(row.team,row.opponent))continue;
    const eligible=official.filter(score=>{
      const when=Date.parse(score.date);
      if(!Number.isFinite(when)||Math.abs(when-stamp)>3*60*60*1000)return false;
      if(score.team&&!clubsIdentical(row.team,score.team))return false;
      return (clubsIdentical(row.team,score.home)&&clubsIdentical(row.opponent,score.away))||
        (clubsIdentical(row.team,score.away)&&clubsIdentical(row.opponent,score.home));
    });
    if(eligible.length!==1)continue;
    const gameId=eligible[0].scoreId;
    const list=linked[gameId]??[];
    // Dedupe provider-specific records even if input duplicates.
    if(!list.some(x=>x.source===row.source&&x.sourceGameId===row.sourceGameId&&x.sourcePlayerId===row.sourcePlayerId))
      linked[gameId]=[...list,row];
  }
  return linked;
}

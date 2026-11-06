/** V4.5.16: licensed opt-in SoccerData exchange format; independent of forecasts. */
import type {FootballMatchStats,FootballStatsProvider} from './football-stats-v4515';
import {validStatsRow,normalizeStatsRows} from './football-stats-v4515';
export const SOCCERDATA_SOURCES=['understat','fbref','sofascore','whoscored','soccerdata_espn','matchhistory','clubelo','sofifa'] as const;
export type SoccerDataSource=typeof SOCCERDATA_SOURCES[number];
export const SOCCERDATA_KINDS=['player_match','player_season','team_match','team_season','shot_event','match_event','lineup','schedule','team_rating','player_rating'] as const;
export type SoccerDataKind=typeof SOCCERDATA_KINDS[number];
export type SoccerDataRecord={source:SoccerDataSource;kind:SoccerDataKind;externalId:string;
  playerId:string|null;playerName:string|null;team:string|null;opponent:string|null;
  competition:string|null;season:string|null;matchId:string|null;fixtureStart:string|null;
  stats:Record<string,number>;meta:Record<string,string|number|boolean|null>};
const sourceSet=new Set<string>(SOCCERDATA_SOURCES);
const kindSet=new Set<string>(SOCCERDATA_KINDS);
const idRe=/^[a-zA-Z0-9:_-]{1,120}$/;
const keyRe=/^[a-z][a-zA-Z0-9]{0,75}$/;
const safeText=(v:unknown,max=180)=>typeof v==='string'?v.trim().slice(0,max):'';
const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
export const safeSoccerdataSource=(value:unknown):value is SoccerDataSource=>typeof value==='string'&&sourceSet.has(value);
export const safeSoccerdataKind=(value:unknown):value is SoccerDataKind=>typeof value==='string'&&kindSet.has(value);
/** Non-negativity is not enforced for metadata ratings/plus-minus; raw stats remain source-specific. */
export function normalizeSoccerdataRecord(v:unknown):SoccerDataRecord|null{
  if(!v||typeof v!=='object'||Array.isArray(v))return null;
  const r=v as Record<string,unknown>;
  if(!safeSoccerdataSource(r.source)||!safeSoccerdataKind(r.kind)||!idRe.test(safeText(r.externalId,120)))return null;
  const data=r.stats&&typeof r.stats==='object'&&!Array.isArray(r.stats)?r.stats as Record<string,unknown>:{};
  const keys=Object.keys(data);if(keys.length>180)return null;
  const stats:Record<string,number>={};
  for(const key of keys){const value=data[key];if(!keyRe.test(key)||!finite(value)||Math.abs(value as number)>100000)return null;stats[key]=value as number;}
  const extra=r.meta&&typeof r.meta==='object'&&!Array.isArray(r.meta)?r.meta as Record<string,unknown>:{};
  if(Object.keys(extra).length>120)return null;
  const meta:SoccerDataRecord['meta']={};
  for(const [k,value] of Object.entries(extra)){
    if(!keyRe.test(k))return null;
    if(value===null||typeof value==='boolean')meta[k]=value;
    else if(typeof value==='string')meta[k]=value.slice(0,400);
    else if(finite(value))meta[k]=value as number;
  }
  const date=safeText(r.fixtureStart,40);
  if(date&&(!Number.isFinite(Date.parse(date))||Date.parse(date)>Date.now()+86400000))return null;
  const playerName=safeText(r.playerName)||null,team=safeText(r.team)||null;
  if((r.kind==='player_match'||r.kind==='player_season'||r.kind==='player_rating')&&!playerName)return null;
  if(Object.keys(stats).length===0&&Object.keys(meta).length===0)return null;
  return {source:r.source,kind:r.kind,externalId:safeText(r.externalId,120),
    playerId:safeText(r.playerId,120)||null,playerName,team,opponent:safeText(r.opponent)||null,
    competition:safeText(r.competition)||null,season:safeText(r.season,35)||null,
    matchId:safeText(r.matchId,120)||null,fixtureStart:date||null,stats,meta};
}
export function normalizeSoccerdataRecords(payload:unknown,limit=100):SoccerDataRecord[]{
  if(!Array.isArray(payload)||payload.length>limit)return [];
  const seen=new Map<string,SoccerDataRecord>();
  for(const item of payload){const row=normalizeSoccerdataRecord(item);if(!row)return [];
    seen.set(`${row.source}:${row.kind}:${row.externalId}`,row);}
  return [...seen.values()];
}
/** Strict verified player match rows only: no guessed start, ID, team, opponent or stats. */
export function soccerdataMatchRows(records:readonly SoccerDataRecord[]):FootballMatchStats[]{
  const rows:FootballMatchStats[]=[];
  for(const r of records){if(r.kind!=='player_match'||!r.playerId||!r.matchId||!r.playerName||
    !r.team||!r.opponent||!r.competition||!r.fixtureStart||!r.meta.isFinal)continue;
    const minutes=finite(r.meta.minutes)?r.meta.minutes as number:null;
    const started=typeof r.meta.started==='boolean'?r.meta.started:null;
    const row:FootballMatchStats={source:r.source as FootballStatsProvider,sourceGameId:r.matchId,
      sourcePlayerId:r.playerId,playerName:r.playerName,team:r.team,opponent:r.opponent,
      competition:r.competition,fixtureStart:r.fixtureStart,position:typeof r.meta.position==='string'?r.meta.position:null,
      started,minutes,season:r.season,stats:r.stats,reportedFields:Object.keys(r.stats)};
    if(validStatsRow(row))rows.push(row);
  }
  // group by provider to avoid accidental source-crossing; records are at most 100.
  return rows.flatMap((r,i)=>rows.findIndex(x=>x.source===r.source&&x.sourceGameId===r.sourceGameId&&x.sourcePlayerId===r.sourcePlayerId)===i?[r]:[]);
}

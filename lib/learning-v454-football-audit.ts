/** Anonymous source-shape audit. It never returns athlete identities or raw provider JSON. */
import type {FootballLiveGameDetail} from './football-live-core';
import {v45FootballObservations} from './learning-v45-performance';
const obj=(v:unknown):Record<string,any>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,any>:{};
const arr=(v:unknown):any[]=>Array.isArray(v)?v:[];
export function v454AuditFootballSummary(source:unknown,detail:FootballLiveGameDetail){
  const raw=obj(source), groups=arr(obj(raw.boxscore).players),rosters=arr(raw.rosters);
  const boxscoreAthletes=groups.reduce((total,g)=>total+arr(obj(g).statistics).reduce((n,section)=>n+arr(obj(section).athletes).length,0),0);
  const rosterEntries=rosters.reduce((total,g)=>total+arr(obj(g).roster??obj(g).athletes??obj(g).players).length,0);
  const rosterStatPayloads=rosters.reduce((total,g)=>total+arr(obj(g).roster??obj(g).athletes??obj(g).players)
    .filter(entry=>{const row=obj(entry);return Array.isArray(row.stats)?row.stats.length>0:
      Array.isArray(row.statistics)?row.statistics.length>0:Object.keys(obj(row.stats??row.statistics)).length>0;}).length,0);
  const withStats=detail.players.filter(p=>p.stats!==null).length;
  const played=detail.players.filter(p=>p.played).length;
  const archiveReady=v45FootballObservations(detail).length;
  const reason=archiveReady?'ready':!boxscoreAthletes&&!rosterEntries?'no_player_roster_or_boxscore':
    !withStats?'source_has_no_parseable_individual_stats':
    !played?'no_confirmed_minutes_or_play_actions':
    detail.game.status!=='final'?'summary_not_final':'observations_not_archivable';
  return {finalInSummary:detail.game.status==='final',boxscoreGroups:groups.length,boxscoreAthletes,
    rosterGroups:rosters.length,rosterEntries,rosterStatPayloads,playersParsed:detail.players.length,
    playersWithStats:withStats,playersPlayed:played,archiveReady,reason};
}

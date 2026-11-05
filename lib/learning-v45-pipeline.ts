/**
 * Bounded V4.5 historic ESPN FINAL box-score ingestion.
 * ESPN actions are observations, NOT official Sorare FINAL score labels.
 * Each execution has a small league/game shard and one bulk Neon UPSERT.
 */
import type {Sport} from './model';
import {nbaLiveScoreboard,nbaLiveGame} from './nba-live-server';
import {footballLiveScoreboard,footballLiveGame} from './football-live-server';
import {FOOTBALL_COMPETITIONS,type FootballLeagueKey} from './football-competitions';
import {v45NbaObservations,v45FootballObservations,type V45Performance} from './learning-v45-performance';
import {v45SavePerformances,v455ArchivedFootballGames} from './learning-v45-db';
import {v455FootballStatsDays,v455SelectPendingGames} from './learning-v455-backfill';
import {v44SaveJob} from './learning-v44-db';

export const NBA_STAT_SHARDS=5;
const CLUB_BATCHES={
  'league-a':['eng.1','esp.1'],
  'league-b':['ger.1','fra.1'],
  'europe':['uefa.champions','uefa.europa','uefa.europa.conf']
} as const;
const NATIONAL_KEYS=FOOTBALL_COMPETITIONS.filter(c=>c.group==='international').map(c=>c.key);
const nationals=Array.from({length:4},(_,i)=>NATIONAL_KEYS.filter((_,j)=>j%4===i));
export const FOOTBALL_STAT_BATCHES={...CLUB_BATCHES,'national-0':nationals[0],'national-1':nationals[1],
  'national-2':nationals[2],'national-3':nationals[3]} as const;
export type FootballStatBatch=keyof typeof FOOTBALL_STAT_BATCHES;
export const validFootballStatBatch=(scope:string):scope is FootballStatBatch=>Object.prototype.hasOwnProperty.call(FOOTBALL_STAT_BATCHES,scope);
export function v45StableShard(id:string,total:number){let hash=2166136261;for(const ch of id)hash=Math.imul(hash^ch.charCodeAt(0),16777619)>>>0;return hash%total;}
const localDay=(date:Date)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const dayShift=(date:string,n:number)=>new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
async function inBatches<T,R>(entries:readonly T[],maxConcurrent:number,work:(item:T)=>Promise<R>):Promise<PromiseSettledResult<R>[]> {
  const results:PromiseSettledResult<R>[]=[];
  for(let i=0;i<entries.length;i+=maxConcurrent){const settled=await Promise.allSettled(entries.slice(i,i+maxConcurrent).map(work));results.push(...settled);}
  return results;
}
export async function v45NbaStats(shard:number,now=new Date()){
  if(!Number.isInteger(shard)||shard<0||shard>=NBA_STAT_SHARDS)throw Error('Ungültiger NBA-Statistik-Shard.');
  const today=localDay(now),days=[dayShift(today,-1),today];
  const results=await Promise.allSettled(days.map(day=>nbaLiveScoreboard(day)));
  const available=results.filter((r):r is PromiseFulfilledResult<Awaited<ReturnType<typeof nbaLiveScoreboard>>>=>r.status==='fulfilled');
  if(!available.length)throw Error('NBA-Scoreboard nicht verfügbar');
  const found=new Map<string,Awaited<ReturnType<typeof nbaLiveScoreboard>>['games'][number]>();
  for(const response of available)for(const game of response.value.games){if(game.status==='final'&&v45StableShard(game.id,NBA_STAT_SHARDS)===shard)found.set(game.id,game);}
  const games=Array.from(found.values()).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,10);
  const details=await inBatches(games,3,async game=>v45NbaObservations(await nbaLiveGame(game.id)));
  const all=details.flatMap(r=>r.status==='fulfilled'?r.value:[]);
  const saved=await v45SavePerformances('nba',all);const failures=results.filter(r=>r.status==='rejected').length+details.filter(r=>r.status==='rejected').length;
  const message=`NBA Stat ${shard}: ${games.length} Final-Spiele, ${all.length} beobachtete Spieler, ${saved} aktualisiert, ${failures} Feedfehler.`;
  await v44SaveJob({scope:`v45:stats:nba-${shard}`,at:now.toISOString(),ok:failures===0,count:saved,message});
  return {sport:'nba' as Sport,shard,games:games.length,players:all.length,saved,failures,message};
}
export async function v45FootballStats(batch:FootballStatBatch,now=new Date()){
  if(!validFootballStatBatch(batch))throw Error('Ungültiger Fußball-Statistik-Bereich.');
  const days=v455FootballStatsDays(batch,now);
  const competitions=FOOTBALL_STAT_BATCHES[batch] as readonly FootballLeagueKey[];
  // At most 15 ESPN scoreboard requests for the Europe batch; all other
  // batches stay at two days. No fixture or player data is invented.
  const input=competitions.flatMap(league=>days.map(day=>({league,day})));
  const results=await inBatches(input,5,async({league,day})=>footballLiveScoreboard(day,league));
  const available=results.filter((r):r is PromiseFulfilledResult<Awaited<ReturnType<typeof footballLiveScoreboard>>>=>r.status==='fulfilled');
  if(!available.length)throw Error('Fußball-Scoreboards nicht verfügbar');
  const found=new Map<string,Awaited<ReturnType<typeof footballLiveScoreboard>>['games'][number]>();
  for(const response of available)for(const game of response.value.games){if(game.status==='final')found.set(`${game.leagueKey}:${game.id}`,game);}
  const allFinalGames=Array.from(found.values());
  // DB-backed game-level dedupe makes catch-up spend its quota on unprocessed
  // games instead of repeatedly consuming the first 12 results each day.
  const archived=await v455ArchivedFootballGames(days[days.length-1]);
  const games=v455SelectPendingGames(allFinalGames,archived);
  const details=await inBatches(games,3,async game=>v45FootballObservations(await footballLiveGame(game.id,game.leagueKey)));
  const all:V45Performance[]=details.flatMap(r=>r.status==='fulfilled'?r.value:[]);
  const saved=await v45SavePerformances('football',all);
  const failedScoreboards=results.filter(r=>r.status==='rejected').length;
  const failedDetails=details.filter(r=>r.status==='rejected').length;
  const withoutUsableStats=details.filter(r=>r.status==='fulfilled'&&r.value.length===0).length;
  const failures=failedScoreboards+failedDetails;
  const alreadyArchived=allFinalGames.filter(g=>archived.has(`${g.leagueKey}:${g.id}`)).length;
  const remaining=Math.max(0,allFinalGames.length-alreadyArchived-games.length);
  const message=`Football ${batch}: ${allFinalGames.length} Final-Spiele (${days.length} Tage), ${alreadyArchived} bereits archiviert, ${games.length} geprüft, ${withoutUsableStats} ohne auswertbare Spielerwerte, ${all.length} Spielerstatistiken, ${saved} aktualisiert, ${remaining} offene Spiele, ${failures} Feedfehler.`;
  await v44SaveJob({scope:`v45:stats:football-${batch}`,at:now.toISOString(),ok:failures===0,count:saved,message});
  return {sport:'football' as Sport,batch,daysScanned:days,finalGames:allFinalGames.length,
    alreadyArchived,inspectedGames:games.length,games:games.length,withoutUsableStats,
    remaining,players:all.length,saved,failures,failedScoreboards,failedDetails,message};
}

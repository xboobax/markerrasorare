/** Bounded authenticated V4.5.15 imports. Never alter Prediction Engine. */
import {FOOTBALL_STAT_BATCHES,type FootballStatBatch,validFootballStatBatch} from './learning-v45-pipeline';
import {footballLiveScoreboard,footballLiveGame} from './football-live-server';
import {v45FootballObservations} from './learning-v45-performance';
import {v45SavePerformances} from './learning-v45-db';
import {fromEspnPerformances,validatedEspnFinal} from './football-stats-v4515';
import {saveFootballMatchStats,scoreSyncCandidates,getFootballScoreCursor,
  setFootballScoreCursor,saveOfficialFootballScores,linkFootballByOfficialGame} from './football-stats-db-v4515';
import {fetchOfficialSorareHistory} from './football-stats-sorare-v4515';
import {v44SaveJob} from './learning-v44-db';
import type {FootballLiveGame} from './football-live-core';
const dayISO=(date:Date)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const dateShift=(day:string,shift:number)=>new Date(Date.parse(day+'T12:00:00Z')+shift*86400000).toISOString().slice(0,10);
const scoreShard=(s:string,total:number)=>{let hash=2166136261;for(const char of s)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;return hash%total;};
export const V4515_SCORE_SHARDS=5;
export async function v4515SorareScoreSync(shard:number,now=new Date()){
  if(!Number.isInteger(shard)||shard<0||shard>=V4515_SCORE_SHARDS)throw Error('Ungültiger Sorare-Shard');
  const scope=`v4515:sorare-${shard}`;
  const candidates=(await scoreSyncCandidates()).filter(s=>scoreShard(s,V4515_SCORE_SHARDS)===shard);
  if(!candidates.length){await v44SaveJob({scope,at:now.toISOString(),ok:true,count:0,message:'Keine Football-Snapshots für diesen Sorare-Shard'});return {shard,players:0,scores:0,linked:0,failures:0};}
  const offset=(await getFootballScoreCursor(scope))%candidates.length;
  const batch=Array.from({length:Math.min(6,candidates.length)},(_,i)=>candidates[(offset+i)%candidates.length]);
  const results:Awaited<ReturnType<typeof fetchOfficialSorareHistory>>[]=[];const failures:string[]=[];
  for(let i=0;i<batch.length;i+=2){
    const entries=await Promise.allSettled(batch.slice(i,i+2).map(slug=>fetchOfficialSorareHistory(slug,22)));
    entries.forEach((entry,j)=>{if(entry.status==='fulfilled')results.push(entry.value);
      else failures.push(`${batch[i+j]}: Sorare nicht erreichbar`);});
  }
  const scores=results.flatMap(r=>r.rows).filter(s=>Date.parse(s.date)<=now.getTime());
  const saved=await saveOfficialFootballScores(scores);
  // Missing or ambiguous cross-provider identity must not abort saving official FINAL scores.
  let linked=0,linkWarning:string|null=null;
  try {linked=await linkFootballByOfficialGame(scores);}
  catch {linkWarning='Spieler-ID-Abgleich wird im nächsten Job erneut versucht.';}
  await setFootballScoreCursor(scope,(offset+batch.length)%candidates.length,
    `${batch.length} Spieler; ${saved} Scores; ${failures.length} Fehler`);
  const message=`Sorare FINAL Shard ${shard}: ${batch.length} Spieler, ${scores.length} FINAL-Scores, ${saved} aktualisiert, ${linked} verifizierte Verknüpfungen, ${failures.length} Fehler.${linkWarning?' '+linkWarning:''}`;
  await v44SaveJob({scope,at:now.toISOString(),ok:failures.length===0,count:saved,message});
  return {shard,players:batch.length,scores:saved,linked,linkWarning,failures:failures.length,nextOffset:(offset+batch.length)%candidates.length,message};
}
export async function v4515FootballHistoricBackfill(batch:FootballStatBatch,startDay:string,days=2,now=new Date(),offset=0,maxGames=8){
  if(!validFootballStatBatch(batch)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(startDay)||
    !Number.isFinite(Date.parse(startDay+'T12:00:00Z'))||
    startDay>dayISO(now)||Date.parse(startDay+'T00:00:00Z')<now.getTime()-540*86400000||
    !Number.isInteger(days)||days<1||days>3||!Number.isInteger(offset)||offset<0||offset>1000||
    !Number.isInteger(maxGames)||maxGames<1||maxGames>8)throw Error('Ungültiger Nachimport-Bereich (max. 3 Tage und 8 Spiele/Seite, 540 Tage rückwirkend)');
  const leagues=FOOTBALL_STAT_BATCHES[batch] as readonly import('./football-competitions').FootballLeagueKey[];
  const schedule=leagues.flatMap(league=>Array.from({length:days},(_,i)=>({league,day:dateShift(startDay,i)})));
  const results=[] as Array<PromiseSettledResult<Awaited<ReturnType<typeof footballLiveScoreboard>>>>;
  for(let i=0;i<schedule.length;i+=3){results.push(...await Promise.allSettled(schedule.slice(i,i+3).map(s=>footballLiveScoreboard(s.day,s.league))));}
  const found=new Map<string,FootballLiveGame>();
  results.forEach(r=>{if(r.status==='fulfilled')for(const game of r.value.games){
    if(game.status==='final')found.set(`${game.leagueKey}:${game.id}`,game);}});
  const games=[...found.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)).slice(offset,offset+maxGames);
  let saved=0,observations=0,empty=0,detailsFailed=0;
  for(let i=0;i<games.length;i+=2){
    const detailRows=await Promise.allSettled(games.slice(i,i+2).map(async game=>{
      const detail=await footballLiveGame(game.id,game.leagueKey);
      const verified=validatedEspnFinal(detail,game);
      if(!verified)throw Error('Spieldetails stimmen nicht überein');
      // Scoreboard's confirmed FINAL is authoritative if summary omitted status.
      return v45FootballObservations(verified);
    }));
    for(const row of detailRows){if(row.status==='rejected'){detailsFailed++;continue;}
      if(!row.value.length){empty++;continue;}
      observations+=row.value.length;
      await v45SavePerformances('football',row.value);
      saved+=await saveFootballMatchStats('espn',fromEspnPerformances(row.value));
    }
  }
  const failures=results.filter(r=>r.status==='rejected').length+detailsFailed;
  const scope=`v4515:backfill:${batch}`;
  const message=`${startDay} + ${days} Tage: ${games.length} FINAL geprüft, ${observations} Spieler, ${saved} archiviert, ${empty} ohne Stats, ${failures} Fehler.`;
  await v44SaveJob({scope,at:now.toISOString(),ok:failures===0,count:saved,message});
  return {batch,from:startDay,days,offset,maxGames,totalFinalGames:found.size,
    nextOffset:offset+games.length<found.size?offset+games.length:null,
    games:games.length,observations,saved,withoutStats:empty,failures,
    truncated:offset+games.length<found.size,message};
}

/** V4.4 independent automatic capture, official reconciliation and per-sport model promotion. */
import type {Sport} from './model';
import {forecast} from './model';
import {getFootballClubs,getNbaTeams,getPlayers,gql} from './sorare';
import {getAutomaticMatchupData,alignOpponentNames} from './auto-matchups';
import {getNbaGameweekSchedule} from './nba-gameweek-feed';
import {attachNbaFixtures} from './nba-fixture-mapping';
import {getEspnNbaDefenseFallback} from './nba-defense-fallback';
import {freezeCloudPredictions} from './learning-snapshot';
import {findFinalForSnapshot,parseOfficialResults} from './tracking-auto';
import type {GameScore,AutomaticResult} from './tracking-auto';
import {FOOTBALL_LEAGUES} from './leagues';
import {v44SaveSnapshots,v44Pending,v44SaveOfficial,v44Rows,v44ReadModel,v44PromoteCandidate,v44SaveJob,v44SaveNbaThree,v44PopulatePregameThrees,type V44NbaPlayerStat} from './learning-v44-db';
import {v44Candidate} from './learning-v44-calibration';
import {nbaLiveScoreboard,nbaLiveGame} from './nba-live-server';
import {canonicalNbaTeam} from './nba-fixture-mapping';
export const V44_SCOPES=['nba-0','nba-1','nba-2',...FOOTBALL_LEAGUES.flatMap(l=>[`football-${l}-0`,`football-${l}-1`])];
export const validV44Scope=(s:string)=>V44_SCOPES.includes(s);
export const v44Shard=(s:string)=>{let h=2166136261;for(const ch of s){h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;}return h%3;};
export async function v44Capture(scope:string,now=new Date()){
  if(!validV44Scope(scope))throw Error('Ungültiger Capture-Bereich');
  const sport:Sport=scope.startsWith('nba-')?'nba':'football';
  const all=sport==='nba'?await getNbaTeams():await getFootballClubs();
  const group=Number(scope.slice(-1));const league=sport==='football'?scope.slice('football-'.length,-2):'';
  const clubs=all.filter(c=>sport==='nba'||c.league===league).sort((a,b)=>a.slug.localeCompare(b.slug))
    .filter((_,i)=>i%(sport==='nba'?3:2)===group);
  if(!clubs.length)throw Error('Keine Vereine für Capture-Bereich');
  const source=await getPlayers(sport,clubs);
  if(!source.players.length)throw Error('Sorare lieferte keinen Kader');
  const base=source.players.map(forecast);
  const scheduled=sport==='nba'?attachNbaFixtures(base,await getNbaGameweekSchedule()):base;
  let matching=await getAutomaticMatchupData(sport,now);
  if(sport==='nba'&&matching.coverage===0){const fallback=await getEspnNbaDefenseFallback();if(fallback.coverage>0)matching=fallback;}
  const ratings=alignOpponentNames(matching.ratings,scheduled.map(x=>x.opponent).filter((n):n is string=>!!n));
  const snapshots=freezeCloudPredictions(scheduled,sport,ratings,now,sport==='nba'?110:90)
    .filter(s=>typeof s.engineV3PP==='number'&&typeof s.engineV3Q80==='number');
  const saved=await v44SaveSnapshots(sport,snapshots);
  if(sport==='nba'&&saved)await v44PopulatePregameThrees(sport,snapshots.map(s=>s.key));
  const msg=`${scope}: ${source.players.length} Spieler, ${snapshots.length} aktuelle V3-Prognosen, ${saved} neu vor Anpfiff gesichert; ${source.failed} fehlerhafte Kader.`;
  await v44SaveJob({scope:`v44:capture:${scope}`,at:new Date().toISOString(),ok:source.failed===0,message:msg,count:saved});
  return {scope,sport,saved,candidates:snapshots.length,message:msg};
}
export async function v44Reconcile(sport:Sport,shard:number,now=new Date()){
  if(![0,1,2].includes(shard))throw Error('Ungültiger Ergebnis-Shard');
  const pending=(await v44Pending(sport,60)).filter(p=>v44Shard(p.playerId)===shard);
  const byPlayer=new Map<string,typeof pending>();
  for(const row of pending)byPlayer.set(row.playerId,[...(byPlayer.get(row.playerId)??[]),row]);
  const selected=[...byPlayer.entries()].slice(0,24);const official:AutomaticResult[]=[];
  let errors=0,checked=0;
  for(let i=0;i<selected.length;i+=4){const group=selected.slice(i,i+4);
    const fields=group.map(([slug],j)=>`p${j}:anyPlayer(slug:${JSON.stringify(slug)}){allPlayerGameScores(first:30){nodes{score scoreStatus anyGame{date}}}}`);
    try{const data=await gql(`{${fields.join(' ')}}`,0);
      group.forEach(([_,rows],j)=>{checked++;const finals:GameScore[]=parseOfficialResults(data?.[`p${j}`]?.allPlayerGameScores?.nodes);
        for(const p of rows){const match=findFinalForSnapshot(p,finals);if(match)official.push(match);}});
    }catch{errors+=group.length;}
  }
  const matched=await v44SaveOfficial(sport,official);
  const message=`${sport} / Shard ${shard}: ${checked} Spieler geprüft, ${matched} offizielle FINAL-Scores, ${errors} Fehler.`;
  await v44SaveJob({scope:`v44:results:${sport}-${shard}`,at:now.toISOString(),ok:errors===0,message,count:matched});
  return {sport,shard,pending:pending.length,matched,checked,errors,message};
}
export async function v44Train(sport:Sport,now=new Date()){
  const rows=await v44Rows(sport,10000),active=await v44ReadModel(sport);
  const candidate=v44Candidate(rows,sport,active??{ppOffset:0,q80Offset:0});
  const approved=Boolean(process.env.V44_AUTO_PROMOTE==='true'&&candidate?.promotable);
  const promoted=approved&&candidate?await v44PromoteCandidate(sport,candidate,active?.version??0):false;
  const message=candidate?`Validierung ${candidate.train} Training / ${candidate.holdout} Holdout · ${candidate.reason} ${promoted?'Neue Sport-Modellversion aktiviert.':'Keine Modellaktivierung.'}`:'Noch zu wenig bestätigte Vor-Spiel-Prognosen (mind. 140 Spieler-Spiele an 18 Tagen).';
  await v44SaveJob({scope:`v44:train:${sport}`,at:now.toISOString(),ok:true,message,count:candidate?.train??0});
  return {sport,activeVersion:active?.version??0,candidate,promoted,message};
}
/** Strict NBA ESPN per-game observation capture; no invented identity or zero scores. */
export async function v44NbaThrees(date:string,now=new Date()){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Math.abs(Date.parse(date+'T12:00:00Z')-now.getTime())>15*86400000)throw Error('Ungültiger NBA-Abfragetag');
  const board=await nbaLiveScoreboard(date);
  const games=board.games.filter(g=>g.status==='final').slice(0,5);
  const all:V44NbaPlayerStat[]=[];let errors=0;
  for(const g of games){try{const result=await nbaLiveGame(g.id);
      for(const player of result.players){const team=player.teamId===g.home.id?g.home:player.teamId===g.away.id?g.away:null;
        if(!team||!player.played||player.stats?.threeAttempts===null||player.stats?.threeAttempts===undefined||player.stats?.minutes===null||!player.stats)continue;
        const official=canonicalNbaTeam(team.name);if(!official)continue;
        all.push({playerId:player.id,playerName:player.name,team:official,tipoff:g.date,threeMade:player.stats.threes,
          threeAttempts:player.stats.threeAttempts,minutes:player.stats.minutes});}
    }catch{errors++;}}
  const saved=await v44SaveNbaThree(all);
  const message=`NBA ${date}: ${games.length} Final-Spiele geprüft, ${saved} verifizierte 3PM/3PA-Paare zu offiziellen Sorare-Scores ergänzt, ${errors} Abruffehler.`;
  await v44SaveJob({scope:'v44:threes:nba',at:now.toISOString(),ok:errors===0,message,count:saved});
  return {date,saved,games:games.length,errors,message};
}

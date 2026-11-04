/** Automated, public Sorare prediction/reconciliation tasks. Never reads a user's
 * browser archive, OAuth cookie, owned cards, or hand-entered scouting data.
 */
import type {Sport} from './model';
import {forecast} from './model';
import {getFootballClubs,getNbaTeams,getPlayers,gql} from './sorare';
import {getAutomaticMatchupData,alignOpponentNames} from './auto-matchups';
import {getNbaGameweekSchedule} from './nba-gameweek-feed';
import {attachNbaFixtures} from './nba-fixture-mapping';
import {getEspnNbaDefenseFallback} from './nba-defense-fallback';
import {freezeCloudPredictions} from './learning-snapshot';
import {freezeSnapshots,freezeOfficialResults,readCloudArchive,writeJobStatus,type JobStatus} from './learning-cloud';
import {findFinalForSnapshot,parseOfficialResults,pendingForAutoCheck} from './tracking-auto';
import type {GameScore} from './tracking-auto';
import type {AutoCheckItem} from './tracking-auto';
import {FOOTBALL_LEAGUES} from './leagues';

export const CAPTURE_SCOPES=[
  'nba-0','nba-1','nba-2',
  ...FOOTBALL_LEAGUES.flatMap(league=>[`football-${league}-0`,`football-${league}-1`]),
];
const nowIso=()=>new Date().toISOString();
export function validCaptureScope(scope:string):boolean{return CAPTURE_SCOPES.includes(scope);}
export async function captureScope(scope:string,now=new Date()):Promise<JobStatus> {
  if(!validCaptureScope(scope))throw new Error('Unbekannter Capture-Bereich');
  const sport:Sport=scope.startsWith('nba-')?'nba':'football';
  const all=sport==='nba'?await getNbaTeams():await getFootballClubs();
  const group=sport==='nba'?Number(scope.split('-').pop()):Number(scope.slice(-1));
  const league=sport==='football'?scope.slice('football-'.length,-2):'';
  const relevant=all.filter(club=>sport==='nba'||club.league===league).sort((a,b)=>a.slug.localeCompare(b.slug));
  const chunk=sport==='nba'?3:2;
  const clubs=relevant.filter((_,i)=>i%chunk===group);
  if(!clubs.length)throw new Error('Keine Clubs im ausgewählten Capture-Bereich');
  const result=await getPlayers(sport,clubs);
  if(!result.players.length)throw new Error('Sorare lieferte keine Spieler für diesen Bereich');
  const base=result.players.map(forecast);
  const schedule=sport==='nba'?await getNbaGameweekSchedule():null;
  const enriched=schedule?attachNbaFixtures(base,schedule):base;
  let matching=await getAutomaticMatchupData(sport,now);
  if(sport==='nba'&&matching.coverage===0){
    const espn=await getEspnNbaDefenseFallback();
    if(espn.coverage>0)matching=espn;
  }
  const ratings=alignOpponentNames(matching.ratings,enriched.map(p=>p.opponent).filter((v):v is string=>!!v));
  const snapshots=freezeCloudPredictions(enriched,sport,ratings,now,sport==='nba'?80:50);
  const saved=await freezeSnapshots(sport,snapshots);
  const status:JobStatus={scope:`capture:${scope}`,at:nowIso(),ok:result.failed===0,saved,
    candidateCount:snapshots.length,failures:result.failed,
    message:`${clubs.length} Clubs · ${result.players.length} Spieler · ${result.incomplete} unvollständige Kader · ${Object.keys(ratings).length} bewertete Gegner. ${result.failed?'Einige Sorare-Kader konnten nicht geladen werden.':''}`};
  await writeJobStatus(status);
  return status;
}
/** Stable 3-way result shards prevent repeated large bursts and keep jobs short. */
export function resultShard(playerId:string):number{
  let hash=2166136261;
  for(const c of playerId){hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;}
  return hash%3;
}
export async function reconcileSport(sport:Sport,shard:number,now=new Date()):Promise<JobStatus> {
  if(![0,1,2].includes(shard))throw new Error('Ungültiger Ergebnis-Bereich');
  const all=await readCloudArchive(sport,3500);
  const pending=pendingForAutoCheck(all,now).filter(row=>resultShard(row.playerId)===shard);
  const perPlayer=new Map<string,AutoCheckItem[]>();
  // Prefer recently completed fixtures. Missing/DNP results remain pending and
  // are retried without fabricating zero scores.
  for(const row of pending.sort((a,b)=>String(b.fixture).localeCompare(String(a.fixture)))){
    perPlayer.set(row.playerId,[...(perPlayer.get(row.playerId)??[]),row]);
  }
  const selected=[...perPlayer.entries()].slice(0,65);
  let failures=0,checked=0;
  const official:ReturnType<typeof findFinalForSnapshot>[]=[];
  // A handful of aliases per request keeps Sorare query depth/payload bounded.
  for(let i=0;i<selected.length;i+=5){
    const group=selected.slice(i,i+5);
    const fields=group.map(([slug],j)=>`p${j}: anyPlayer(slug: ${JSON.stringify(slug)}) { allPlayerGameScores(first: 30) { nodes { score scoreStatus anyGame { date } } } }`);
    try {
      const data=await gql(`{ ${fields.join(' ')} }`,0);
      for(let j=0;j<group.length;j++){
        checked++;
        const games:GameScore[]=parseOfficialResults(data?.[`p${j}`]?.allPlayerGameScores?.nodes);
        for(const item of group[j][1]){
          const found=findFinalForSnapshot(item,games);
          if(found)official.push(found);
        }
      }
    }catch{failures+=group.length;}
  }
  const matched=await freezeOfficialResults(official.filter((v):v is NonNullable<typeof v>=>v!==null));
  const status:JobStatus={scope:`results:${sport}-${shard}`,at:nowIso(),ok:failures===0,checked,matched,
    pending:pending.length,failures,message:failures?'Sorare-Abfrage teilweise fehlgeschlagen; erneuter Versuch beim nächsten Job.':'Nur eindeutig zugeordnete FINAL-Scores gespeichert.'};
  await writeJobStatus(status);
  return status;
}

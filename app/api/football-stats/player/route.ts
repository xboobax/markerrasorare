import {readSoccerdataProfileExtras} from '@/lib/football-soccerdata-db-v4516';
import {fetchOfficialSorareHistory} from '@/lib/football-stats-sorare-v4515';
import {footballStatsDbReady,readFootballProfile} from '@/lib/football-stats-db-v4515';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=20;
const headers={'Cache-Control':'private, no-store'};
export async function GET(req:Request){
  const p=new URL(req.url).searchParams;
  const slug=p.get('slug')?.trim()??'',name=p.get('name')?.trim()??'',team=p.get('team')?.trim()??'';
  if(!/^[a-z0-9-]{2,130}$/.test(slug)||name.length<2||name.length>160||team.length<2||team.length>160)
    return Response.json({error:'Ungültiger Spieler oder Verein'},{status:400,headers});
  const [official,stored,extra]=await Promise.allSettled([
    fetchOfficialSorareHistory(slug,30),
    footballStatsDbReady()?readFootballProfile(slug,name,team,120):Promise.reject(new Error('Neon nicht eingerichtet')),
    footballStatsDbReady()?readSoccerdataProfileExtras(name,team):Promise.reject(new Error('Neon nicht eingerichtet'))
  ]);
  const liveScores=official.status==='fulfilled'?official.value.rows:[];
  const archived=stored.status==='fulfilled'?stored.value:{matches:[],official:[],linkedProviders:[]};
  const ids=new Set(liveScores.map(s=>s.scoreId));
  const officialScores=[...liveScores,...archived.official.filter(s=>!ids.has(s.scoreId))]
    .sort((a,b)=>b.date.localeCompare(a.date)).slice(0,40);
  return Response.json({slug,name,team,matches:archived.matches,officialScores,
    soccerdataExtras:extra.status==='fulfilled'?extra.value:[],
    linkedProviders:archived.linkedProviders,
    sorareStatus:official.status==='fulfilled'?'available':'unavailable',
    archiveStatus:stored.status==='fulfilled'?'ready':'migration_or_connection_missing',
    sourceWarnings:[...(official.status==='rejected'?['Sorare-Daten derzeit nicht erreichbar']:[]),
      ...(stored.status==='rejected'?['Neon-Statistikarchiv noch nicht bereit; schema/football-stats-v4515.sql ausführen']:[]),
      ...(extra.status==='rejected'?['SoccerData-Erweiterung noch nicht bereit; schema/football-soccerdata-v4516.sql ausführen']:[])],
    scoringNote:'Offizielle FINAL Player Scores ohne Kartenboni; ESPN/Understat bleiben getrennte Leistungsquellen. Kein Forecast-Learning.'},
    {headers});
}

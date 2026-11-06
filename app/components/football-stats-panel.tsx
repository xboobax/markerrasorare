'use client';
import {useEffect,useMemo,useState} from 'react';
import type {FootballOfficialScore,FootballProfileRow} from '@/lib/football-stats-v4515';
import type {SoccerDataProfileExtra} from '@/lib/football-soccerdata-db-v4516';
import {sumStat,sumKnownMinutes,sumOfficialMinutes,linkStatsToOfficialMatches} from '@/lib/football-stats-v4515';
type Data={matches:FootballProfileRow[];officialScores:FootballOfficialScore[];soccerdataExtras?:SoccerDataProfileExtra[];
  sorareStatus:'available'|'unavailable';archiveStatus:'ready'|'migration_or_connection_missing';
  linkedProviders:string[];sourceWarnings:string[];scoringNote:string};
const LABELS:Record<string,string>={
  xg:'xG',xa:'xA',npxg:'npxG',xgChain:'xG Chain',xgBuildup:'xG Buildup',
  goals:'Tore',goalAssist:'Assists (Sorare)',assists:'Assists',ownGoals:'Eigentore',
  shots:'Schüsse',totalScoringAtt:'Schüsse',shotsOnTarget:'Schüsse aufs Tor',ontargetScoringAtt:'Schüsse aufs Tor',
  keyPasses:'Key Passes',accuratePass:'Erfolgreiche Pässe',accuratePasses:'Erfolgreiche Pässe',
  totalPass:'Pässe gesamt',totalPasses:'Pässe gesamt',missedPass:'Fehlpässe',
  totalTackle:'Tacklings',wonTackle:'Gewonnene Tacklings',tacklesWon:'Gewonnene Tacklings',
  duelsWon:'Gewonnene Duelle',duelWon:'Gewonnene Duelle',duelLost:'Verlorene Duelle',
  interceptionWon:'Interceptions',interceptions:'Interceptions',totalClearance:'Klärungen',
  cleanSheet:'Clean Sheet',minsPlayed:'Minuten',saves:'Paraden',goalsConceded:'Gegentore',
  yellowCard:'Gelbe Karten',yellowCards:'Gelbe Karten',redCard:'Rote Karten',redCards:'Rote Karten',
  bigChanceCreated:'Großchancen kreiert',bigChanceMissed:'Großchancen vergeben',
  successfulFinalThirdPasses:'Pässe letztes Drittel',possessionLost:'Ballverluste',
  possLostCtrl:'Ballverluste bei Kontrolle',possWon:'Ballgewinne',wasFouled:'Gefoult worden',
  wonContest:'Gewonnene Dribblings',goodHighClaim:'Hohe Bälle gefangen',
  errorLeadToGoal:'Fehler vor Gegentor',errorLeadToShot:'Fehler vor Schuss'
};
const pretty=(key:string)=>LABELS[key]??key.replace(/([a-z])([A-Z])/g,'$1 $2');
const fmt=(v:number|null|undefined,digits=1)=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('de-DE',{maximumFractionDigits:digits}):'—';
const euroSeason=(date:string)=>{const d=new Date(date);if(!Number.isFinite(d.getTime()))return '';
  const y=d.getUTCMonth()<6?d.getUTCFullYear()-1:d.getUTCFullYear();return `${y}/${String(y+1).slice(-2)}`;};
const date=(v:string)=>new Date(v).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'});
export default function FootballStatsPanel({slug,name,team}:{slug:string;name:string;team:string}){
  const [opened,setOpened]=useState(false);
  const [data,setData]=useState<Data|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(false);
  const [season,setSeason]=useState('all'),[provider,setProvider]=useState('all'),[per90,setPer90]=useState(false);
  useEffect(()=>{if(!opened)return;const c=new AbortController();setData(null);setLoading(true);setError(false);setSeason('all');setProvider('all');setPer90(false);
    fetch(`/api/football-stats/player?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}&team=${encodeURIComponent(team)}`,{signal:c.signal})
      .then(async r=>{if(!r.ok)throw Error('Not available');return r.json();})
      .then((payload:Data)=>{if(!c.signal.aborted)setData(payload);})
      .catch(()=>{if(!c.signal.aborted)setError(true);})
      .finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();
  },[opened,slug,name,team]);
  const seasons=useMemo(()=>[...new Set([...(data?.matches??[]).map(r=>euroSeason(r.date)),
    ...(data?.officialScores??[]).map(r=>euroSeason(r.date)),
    ...(data?.soccerdataExtras??[]).map(r=>r.fixtureStart?euroSeason(r.fixtureStart):
      r.season?String(r.season).replace(/^(\d{4})\/(\d{4})$/,(_,a,b)=>`${a}/${b.slice(-2)}`):'')])].filter(Boolean).sort().reverse(),[data]);
  const official=useMemo(()=>data?.officialScores.filter(r=>season==='all'||euroSeason(r.date)===season)??[],[data,season]);
  const matches=useMemo(()=>data?.matches.filter(r=>(season==='all'||euroSeason(r.date)===season)&&
    (provider==='all'||provider===r.source))??[],[data,season,provider]);
  const allProviders=useMemo(()=>[...new Set([...(data?.matches??[]).map(r=>r.source),
    ...(data?.soccerdataExtras??[]).map(r=>r.source)])].sort(),[data]);
  const extras=useMemo(()=>(data?.soccerdataExtras??[]).filter(r=>
    (provider==='all'||provider===r.source)&&
    (season==='all'||(r.fixtureStart?euroSeason(r.fixtureStart):
      r.season?.replace(/^(\d{4})\/(\d{4})$/,(_,a,b)=>`${a}/${b.slice(-2)}`))===season)),
    [data,season,provider]);
  const mergedMatches=useMemo(()=>{
    // Some SoccerData readers report a complete FINAL match but no stable provider
    // player ID. Show those OBSERVATIONS without fabricating a provider identity.
    const extraGames:FootballProfileRow[]=extras.filter(r=>r.kind==='player_match'&&
      r.meta.isFinal===true&&!!r.matchId&&!!r.fixtureStart&&!!r.team&&!!r.opponent).map(r=>({
        source:r.source,sourceGameId:r.matchId!,sourcePlayerId:r.playerId??`unverified:${r.externalId}`,
        date:r.fixtureStart!,competition:r.competition??'Unbekannt',team:r.team!,opponent:r.opponent!,
        season:r.season,minutes:typeof r.meta.minutes==='number'?r.meta.minutes:null,
        started:typeof r.meta.started==='boolean'?r.meta.started:null,
        stats:r.stats,reportedFields:Object.keys(r.stats)}));
    const keys=new Set(matches.map(r=>`${r.source}:${r.sourceGameId}:${r.date.slice(0,10)}`));
    return [...matches,...extraGames.filter(r=>!keys.has(`${r.source}:${r.sourceGameId}:${r.date.slice(0,10)}`))]
      .sort((a,b)=>b.date.localeCompare(a.date));
  },[matches,extras]);
  const best=useMemo(()=>{
    // Select ONE source per metric, never sum duplicate provider copies of the same match.
    const order=['understat','fbref','espn','sofascore','whoscored','soccerdata_espn'];
    const sources=[...new Set(mergedMatches.map(r=>r.source))];
    const ranked=sources.sort((a,b)=>order.indexOf(a)-order.indexOf(b));
    const select=(field:string)=>ranked.map(source=>mergedMatches.filter(r=>r.source===source&&
      typeof r.stats[field]==='number')).sort((a,b)=>b.length-a.length)[0]??[];
    const metric=(field:string)=>{
      const rows=select(field),total=sumStat(rows,field);
      const totalMinutes=rows.reduce((sum,r)=>sum+(r.minutes??0),0);
      return total===null?null:per90?(totalMinutes>0?Math.round(total/totalMinutes*9000)/100:null):total;
    };
    // Baseline provider chosen by match count, not by an advanced-stat-only source.
    const baseline=[...sources].sort((a,b)=>mergedMatches.filter(r=>r.source===b).length-
      mergedMatches.filter(r=>r.source===a).length||order.indexOf(a)-order.indexOf(b))[0];
    const base=mergedMatches.filter(r=>r.source===baseline);
    // Missing minutes are unknown; select one source with the most real minute samples.
    const minutesSource=ranked.map(source=>mergedMatches.filter(r=>r.source===source&&
      r.minutes!==null&&Number.isFinite(r.minutes))).sort((a,b)=>b.length-a.length)[0]??[];
    return {minutes:sumKnownMinutes(minutesSource),minutesSource:minutesSource[0]?.source??null,
      goals:metric('goals'),assists:metric('assists'),xg:metric('xg'),xa:metric('xa'),
      shots:metric('shots'),sample:base.length};
  },[mergedMatches,per90]);
  const joinedMatches=useMemo(()=>linkStatsToOfficialMatches(mergedMatches,official),[mergedMatches,official]);
  const officialMinutes=sumOfficialMinutes(official);
  const officialMinutesGames=official.filter(r=>typeof r.stats.minsPlayed==='number'&&
    Number.isFinite(r.stats.minsPlayed)&&r.stats.minsPlayed>=0&&r.stats.minsPlayed<=150).length;
  const l5=official.slice(0,5),l15=official.slice(0,15);
  const average=(rows:FootballOfficialScore[])=>rows.length?rows.reduce((sum,r)=>sum+r.score,0)/rows.length:null;
  return <details className="v4515-stats-center" onToggle={e=>setOpened(e.currentTarget.open)}>
    <summary><strong>⚽ REAL STATS · SORARE SCORING</strong><span>SoccerData · ESPN · offizielle FINAL-Werte</span></summary>
    {!opened?null:loading?<p className="profile-muted">Echte Matchstats und Sorare-Scores werden geladen …</p>:
    error?<p className="v4515-stats-warning">Statistikdaten konnten momentan nicht geladen werden.</p>:
    data?<>
      <div className="v4515-stats-toolbar">
        <label>Saison <select aria-label="Statistik-Saison" value={season} onChange={e=>setSeason(e.target.value)}><option value="all">Alle</option>{seasons.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
        <label>Quelle <select aria-label="Statistikquelle" value={provider} onChange={e=>setProvider(e.target.value)}><option value="all">Alle</option>{allProviders.map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}</select></label>
        <label className="v4515-per90"><input type="checkbox" checked={per90} onChange={e=>setPer90(e.target.checked)}/> Pro 90 Minuten</label>
      </div>
      <div className="v4515-source-notes"><span>● Sorare: offizieller FINAL Score, kein Kartenbonus</span><span>● ESPN: Matchstats</span><span>● SoccerData: getrennte Originalquellen, abhängig vom Import</span></div>
      <h4>Offizielle Sorare-Scores</h4>
      <div className="v4515-stat-grid">
        {[['L5 Score Ø',average(l5)],['L15 Score Ø',average(l15)],['Letzter FINAL Score',official[0]?.score??null],
          ['Decisive (letzter)',official[0]?.decisive??null],['All-Around (letzter)',official[0]?.allAround??null],
          ['Sorare-Spiele',official.length]].map(([label,value])=><div className="v4515-stat" key={String(label)}><small>{label}</small><strong>{fmt(value as number|null)}</strong></div>)}
      </div>
      <h4>Spielerleistungen {per90?'· pro 90 Minuten':'· Summe'}</h4>
      <div className="v4515-stat-grid">
        {[['Minuten · Matchstats',best.minutes],['Minuten · Sorare',officialMinutes],['Tore',best.goals],['Assists',best.assists],['xG',best.xg],['xA',best.xa],
          ['Schüsse',best.shots],['Spiele mit Stats',best.sample]].map(([label,value])=><div className="v4515-stat" key={String(label)}><small>{label}</small><strong>{fmt(value as number|null,2)}</strong></div>)}
      </div>
      <p className="profile-muted">Minuten · Matchstats: {best.minutesSource?.toUpperCase()??'keine Quelle'}; Minuten · Sorare: {officialMinutesGames} Spiele mit bekannten Minuten. Die Summen umfassen möglicherweise unterschiedliche Partien und werden nicht addiert. Pro-90-Werte erfordern Minuten derselben Matchstats-Quelle. xG/xA stammen nur aus tatsächlich importierten Daten; fehlende Werte bleiben —.</p>
      {data.sourceWarnings.length>0&&<p className="v4515-stats-warning">{data.sourceWarnings.join(' · ')}</p>}
      <details className="v4515-stats-history"><summary>Sorare FINAL-Historie ({official.length})</summary>
        {official.length?official.map(r=><details key={r.scoreId} className="v4515-stat-match">
          <summary><span>{date(r.date)} · {r.competition} · {r.home} – {r.away}</span><strong>{fmt(r.score)} Pkt. <small>DS {fmt(r.decisive)} · AA {fmt(r.allAround)}</small></strong></summary>
          {(joinedMatches[r.scoreId]??[]).map(game=><div key={`${game.source}:${game.sourceGameId}`} className="v4515-official-companion">
            <strong>{game.source.toUpperCase()} · bestätigte identische Partie</strong>
            <span>{game.minutes===null?'Minuten —':`${fmt(game.minutes)} Minuten`} · xG {fmt(game.stats.xg,2)} · xA {fmt(game.stats.xa,2)} · Tore {fmt(game.stats.goals,0)}</span>
          </div>)}
          {Object.keys(r.stats).length?<div className="v4515-all-stats">{Object.entries(r.stats).map(([key,value])=><div key={key}><span>{pretty(key)}</span><b>{fmt(Number(value),2)}</b></div>)}</div>:<p className="profile-muted">Keine detaillierten Ereignisse von Sorare geliefert.</p>}
          {r.breakdown.length>0&&<details><summary>Offizielle Sorare-Punkte je Ereignis</summary><div className="v4515-all-stats">{r.breakdown.map((b,i)=><div key={`${b.stat}-${i}`}><span>{pretty(b.stat)} ({fmt(b.value,2)})</span><b>{fmt(b.points,2)} Punkte</b></div>)}</div></details>}
        </details>):<p className="profile-muted">Noch keine finalen Sorare-Scores für die gewählte Saison.</p>}
      </details>
      <details className="v4515-stats-history"><summary>Einzelspiele · alle Statistikquellen ({mergedMatches.length})</summary>
        {mergedMatches.length?mergedMatches.map(r=><details key={`${r.source}:${r.sourceGameId}:${r.sourcePlayerId}`} className="v4515-stat-match">
          <summary><span>{date(r.date)} · {r.competition} · {r.opponent}</span><strong>{r.source.toUpperCase()} · {r.minutes===null?'Min. —':`${fmt(r.minutes)} Min.`}</strong></summary>
          <div className="v4515-all-stats">{Object.entries(r.stats).map(([key,value])=><div key={key}><span>{pretty(key)}</span><b>{fmt(Number(value),2)}</b></div>)}</div>
        </details>):<p className="profile-muted">Noch keine eindeutig zugeordneten Einzelspielstatistiken im Neon-Archiv.</p>}
      </details>
      <details className="v4515-stats-history"><summary>SoccerData · weitere Saisonwerte, Events, Ratings ({extras.length})</summary>
        {extras.length?extras.map(r=><details key={`${r.source}:${r.kind}:${r.externalId}`} className="v4515-stat-match">
          <summary><span>{r.source.toUpperCase()} · {r.kind.replace(/_/g,' ')} · {r.season??''} {r.fixtureStart?date(r.fixtureStart):''}</span><strong>{Object.keys(r.stats).length} Werte</strong></summary>
          <div className="v4515-all-stats">{Object.entries(r.stats).map(([key,value])=><div key={key}><span>{pretty(key)}</span><b>{fmt(value,2)}</b></div>)}</div>
          {Object.keys(r.meta).length>0&&<details><summary>Weitere Quell-Metadaten</summary><div className="v4515-all-stats">{Object.entries(r.meta).map(([key,value])=><div key={key}><span>{pretty(key)}</span><b>{String(value??'—')}</b></div>)}</div></details>}
        </details>):<p className="profile-muted">Noch keine zusätzlichen SoccerData-Werte importiert oder diesem Spieler eindeutig zuordenbar.</p>}
      </details>
      <p className="profile-muted">Quellenstatus: Sorare {data.sorareStatus==='available'?'verbunden':'nicht erreichbar'} · Neon {data.archiveStatus==='ready'?'bereit':'Migration erforderlich'} · Spieler-Verknüpfung: {data.linkedProviders.join(', ')||'nur eindeutiger Name + Verein'}. Keine Auswirkung auf PP, Q80 oder Optimizer.</p>
    </>:null}
  </details>;
}

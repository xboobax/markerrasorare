'use client';
import {useEffect,useState} from 'react';
import type {Sport} from '@/lib/model';
import type {V45RecentPerformance} from '@/lib/learning-v45-db';
import type {V45PerformanceSummary} from '@/lib/learning-v45-performance';
type Payload={sport:Sport;configured:boolean;schemaReady:boolean;summary:V45PerformanceSummary|null;recent:V45RecentPerformance[];message:string};
const fmt=(x:number|null|undefined,precision=1)=>typeof x==='number'?x.toLocaleString('de-DE',{maximumFractionDigits:precision}):'–';
const day=(iso:string)=>new Date(iso).toLocaleDateString('de-DE',{timeZone:'Europe/Berlin',day:'2-digit',month:'2-digit'});
const keysNba:[string,string][]=[['points','PTS'],['rebounds','REB'],['assists','AST'],['threes','3PM'],['threeAttempts','3PA'],['steals','STL'],['blocks','BLK'],['turnovers','TO']];
const keysFoot:[string,string][]=[['goals','Tore'],['assists','AST'],['accuratePasses','Pässe'],['tacklesWon','Tackles'],['interceptions','INT'],['duelsWon','Duelle']];
export default function PredictionPerformanceV45({sport}:{sport:Sport}){
  const [data,setData]=useState<Payload|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[counter,setCounter]=useState(0);
  useEffect(()=>{const c=new AbortController();setLoading(true);setError('');
    fetch(`/api/learning-v45?sport=${sport}`,{signal:c.signal,cache:'no-store'})
      .then(async r=>{if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json()})
      .then((p:Payload)=>{if(!c.signal.aborted)setData(p)})
      .catch(e=>{if(!c.signal.aborted)setError(e instanceof Error?e.message:'Archiv nicht erreichbar')})
      .finally(()=>{if(!c.signal.aborted)setLoading(false)});
    return ()=>c.abort();
  },[sport,counter]);
  const s=data?.summary,labels=sport==='nba'?keysNba:keysFoot;
  return <section className="learning-performance-v45" aria-label={`V4.5 ${sport} Einzelstatistiken`}>
    <div className="learning-cloud-head"><div><span className="section-kicker">V4.5 · PLAYER PERFORMANCE ARCHIVE</span>
      <h3>{sport==='nba'?'🏀 NBA':'⚽ Fußball'} · Einzelstatistiken</h3>
      <p>Abgeschlossene ESPN-Spiele · einzeln gespeicherte Statistiken · getrennt nach Sportart</p></div>
      <button type="button" disabled={loading} onClick={()=>setCounter(n=>n+1)}>{loading?'Lädt …':'↻ Aktualisieren'}</button></div>
    {loading?<p className="learning-cloud-muted">Lade Statistikarchiv …</p>:error?<p className="learning-cloud-warning">{error}</p>:
      !data?.schemaReady?<div className="learning-cloud-setup"><strong>V4.5-Migration erforderlich</strong><p>{data?.message??'Datenbank noch nicht bereit.'}</p><small>In Neon die Datei <code>schema/learning-v45-performance.sql</code> ausführen. Die bisherigen V4.4-Daten bleiben erhalten.</small></div>:
      <><div className="learning-cloud-metrics">
          <div><small>Spieler-Leistungen</small><strong>{fmt(s?.total,0)}</strong><span>Nur abgeschlossene Spiele</span></div>
          <div><small>Spiele archiviert</small><strong>{fmt(s?.games,0)}</strong><span>{fmt(s?.players,0)} unterschiedliche ESPN-Spieler-IDs</span></div>
          <div><small>Minuten vorhanden</small><strong>{fmt(s?.withMinutes,0)}</strong><span>Kein Ersatzwert für fehlende Minuten</span></div>
          <div><small>{sport==='nba'?'3PM + 3PA vorhanden':'Passdaten vorhanden'}</small><strong>{fmt(sport==='nba'?s?.threeSamples:s?.passingSamples,0)}</strong><span>{sport==='nba'?`Ø 3PM: ${fmt(s?.avgThreeMade,2)}`:`Duelle: ${fmt(s?.duelSamples,0)}`}</span></div>
        </div>
        {data.recent.length>0?<div className="learning-cloud-table-wrap"><table className="tracking-table learning-cloud-table"><thead><tr><th>Spieltag</th><th>Spieler</th><th>Team</th><th>MIN</th><th>Rolle</th>{labels.map(([key,label])=><th key={key}>{label}</th>)}</tr></thead><tbody>
          {data.recent.map(row=><tr key={`${row.competition}:${row.fixtureStart}:${row.player}:${row.team}`}><td>{day(row.fixtureStart)}</td><td>{row.player}</td><td>{row.team}</td><td>{fmt(row.minutes,0)}</td><td>{row.started===true?'Start':row.started===false?'Bank':'–'}</td>{labels.map(([key])=><td key={key}>{Object.prototype.hasOwnProperty.call(row.stats,key)?fmt(row.stats[key],0):'–'}</td>)}</tr>)}
        </tbody></table></div>:<p className="learning-cloud-muted">Noch keine abgeschlossenen Spielerstatistiken archiviert. Die getrennten V4.5-Jobs erfassen die letzten beiden deutschen Kalendertage nach Spielende.</p>}
        <p className="learning-cloud-muted">ESPN-Statistiken dienen der künftigen Analyse. Nicht verfügbare Werte erscheinen als „–“, nicht als 0. Diese Daten sind keine offiziellen Sorare-Scores und ändern PP/Q80 noch nicht automatisch. Die V4.4-Endscore-Kalibrierung bleibt unverändert.</p>
      </>}
  </section>;
}

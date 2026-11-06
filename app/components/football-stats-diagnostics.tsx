'use client';
import {useEffect,useState} from 'react';
type Status={schemaReady:boolean;sourceStats?:Array<{source:string;rows:number;games:number;players:number;with_xg:number;with_xa:number;linked:number;last_import:string|null}>;
  soccerdataSchemaReady?:boolean;
  soccerdataRecords?:Array<{source:string;kind:string;rows:number;with_xg:number;with_xa:number;last_import:string|null}>;
  officialScores?:{rows:number;players:number;with_aa:number;with_decisive:number;last_import:string|null};
  verifiedLinks?:Array<{provider:string;count:number}>;jobs?:Array<{scope:string;at:string;ok:boolean;message:string}>;predictionModelChanged:boolean};
export default function FootballStatsDiagnostics(){
  const [open,setOpen]=useState(false),[data,setData]=useState<Status|null>(null),[error,setError]=useState(false);
  useEffect(()=>{if(!open)return;const controller=new AbortController();setError(false);
    fetch('/api/football-stats/status',{cache:'no-store',signal:controller.signal})
      .then(async r=>{if(!r.ok)throw Error('Status failed');return r.json();})
      .then(v=>{if(!controller.signal.aborted)setData(v);}).catch(()=>{if(!controller.signal.aborted)setError(true);});
    return()=>controller.abort();},[open]);
  return <details className="v4515-stats-center" onToggle={e=>setOpen(e.currentTarget.open)}>
    <summary><strong>⚽ FOOTBALL STATS CENTER 2.0</strong><span>ESPN · Understat · offizielle Sorare-Scores · Neon</span></summary>
    {error?<p className="v4515-stats-warning">Diagnose derzeit nicht erreichbar.</p>:!data?<p className="profile-muted">Statistikstatus laden …</p>:
      !data.schemaReady?<p className="v4515-stats-warning">Datenbankmigration fehlt. Zuerst schema/football-stats-v4515.sql im Neon SQL Editor ausführen.</p>:<>
      <div className="v4515-stat-grid">
        {data.sourceStats?.map(s=><div key={s.source} className="v4515-stat"><small>{s.source.toUpperCase()}</small><strong>{s.rows.toLocaleString('de-DE')}</strong><small>{s.games} Spiele · xG {s.with_xg} · xA {s.with_xa}</small></div>)}
        {data.soccerdataRecords?.map(s=><div key={`${s.source}:${s.kind}`} className="v4515-stat"><small>{s.source.toUpperCase()} · {s.kind.replace(/_/g,' ')}</small><strong>{s.rows.toLocaleString('de-DE')}</strong><small>xG {s.with_xg} · xA {s.with_xa}</small></div>)}
        <div className="v4515-stat"><small>Offizielle Sorare FINAL Scores</small><strong>{(data.officialScores?.rows??0).toLocaleString('de-DE')}</strong><small>{data.officialScores?.players??0} Spieler</small></div>
        <div className="v4515-stat"><small>Verifizierte Spieler-Links</small><strong>{data.verifiedLinks?.reduce((n,l)=>n+l.count,0)??0}</strong><small>Keine unsicheren Namensmatches</small></div>
      </div>
      {!data.soccerdataSchemaReady&&<p className="v4515-stats-warning">SoccerData-Zusatzarchiv fehlt: schema/football-soccerdata-v4516.sql in Neon ausführen.</p>}
      <p className="profile-muted">Prognosen unverändert. SoccerData-Quellen sind opt-in und werden nur nach Prüfung der jeweiligen Datenrechte importiert. Sorare-FINAL bleibt die einzige offizielle Punktequelle.</p>
      <details className="v4515-stats-history"><summary>Importverlauf</summary>{data.jobs?.length?data.jobs.map(j=><p className="profile-muted" key={j.scope}><strong>{j.ok?'✓':'⚠'} {j.scope}</strong> · {new Date(j.at).toLocaleString('de-DE')} · {j.message}</p>):<p className="profile-muted">Noch keine Importjobs.</p>}</details>
      </>}
  </details>;
}

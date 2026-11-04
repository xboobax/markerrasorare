'use client';
import {useEffect,useState} from 'react';
import type {Sport} from '@/lib/model';
import type {LearningSummary} from '@/lib/learning-metrics';
import type {JobStatus} from '@/lib/learning-cloud';

type Payload={configured:boolean;ready:boolean;cronConfigured?:boolean;summary:LearningSummary|null;
  statuses:JobStatus[];message:string;limit?:number};
const n=(x:number)=>x.toLocaleString('de-DE',{maximumFractionDigits:2});
export default function PredictionLearningCloud({sport}:{sport:Sport}){
  const [data,setData]=useState<Payload|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    const abort=new AbortController();
    setLoading(true);setError('');setData(null);
    fetch(`/api/prediction-learning?sport=${sport}`,{signal:abort.signal,cache:'no-store'})
      .then(async r=>{if(!r.ok)throw Error('Verbindung zur Lern-Datenbank derzeit nicht verfügbar');return r.json();})
      .then((p:Payload)=>setData(p))
      .catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Ladevorgang fehlgeschlagen');})
      .finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return()=>abort.abort();
  },[sport,revision]);
  const summary=data?.summary;
  const capture=(data?.statuses??[]).filter(x=>x.scope.startsWith('capture:'));
  const results=(data?.statuses??[]).filter(x=>x.scope.startsWith('results:'));
  const last=([...(data?.statuses??[])].sort((a,b)=>b.at.localeCompare(a.at))[0]?.at);
  const coverage=summary?.models[0]?.count??0;
  const best=summary?.winner;
  const maxDay=Math.max(1,...(summary?.trend??[]).flatMap(d=>[d.v17,d.v18,d.v20]));
  return <section className="learning-cloud" aria-label="Automatisches Prediction Learning Lab">
    <div className="learning-cloud-head">
      <div><span className="section-kicker">V3.4 · AUTOMATIC PREDICTION LEARNING</span>
        <h3>Automatisches Lernlabor · {sport==='nba'?'NBA':'Fußball'}</h3>
        <p>Kein manuelles Eintragen: Server speichert öffentliche Vor-Spiel-Prognosen und gleicht bestätigte Sorare-Ergebnisse automatisch ab.</p></div>
      <button type="button" onClick={()=>setRevision(x=>x+1)} disabled={loading} aria-label="Learning-Daten aktualisieren">{loading?'Lädt …':'↻ Aktualisieren'}</button>
    </div>
    {error?<p className="learning-cloud-warning" role="status">{error} · Vorhandene Browser-Prognosen bleiben erhalten.</p>:
      !data?<p className="learning-cloud-muted">Lade Status der automatischen Datensammlung …</p>:
      !data.configured||!data.cronConfigured?<div className="learning-cloud-setup" role="status"><strong>Einmalige Einrichtung erforderlich</strong>
        <p>{data.message} Für einen unbeaufsichtigten Betrieb brauchst du eine Upstash-Redis-Datenbank sowie die drei Vercel-Variablen <code>UPSTASH_REDIS_REST_URL</code>, <code>UPSTASH_REDIS_REST_TOKEN</code> und <code>CRON_SECRET</code>. Danach läuft die tägliche Datensammlung ohne Eingaben.</p>
        <small>Einrichtung in der Datei UPDATE_V3_4_AUTOMATION_DE.md beschrieben. Kein Score und keine Prognose muss manuell eingetragen werden.</small></div>
        :<>
          <div className="learning-cloud-state"><span className={`learning-cloud-dot ${data.ready?'on':'pending'}`}/>
            <strong>{data.ready?'Erster erfolgreicher Capture-Lauf bestätigt':'Warte auf ersten erfolgreichen Capture-Lauf'}</strong>
            <small>{last?`Letzter Job: ${new Date(last).toLocaleString('de-DE')}`:'Noch keine Job-Ausführung'} · {capture.length} Capture-Teilbereiche / {results.length} Ergebnis-Teilbereiche zuletzt gemeldet</small></div>
          <div className="learning-cloud-metrics">
            <div><small>Vorab gespeichert</small><strong>{n(summary?.total??0)}</strong><span>Ausgewertetes Archivfenster</span></div>
            <div><small>FINAL zugeordnet</small><strong>{n(summary?.resolved??0)}</strong><span>Offizielle Sorare-Ergebnisse</span></div>
            <div><small>Gültige 3er-Vergleiche</small><strong>{n(coverage)}</strong><span>{summary?.days??0} unterschiedliche Spieltage</span></div>
            <div><small>Aktuell niedrigster MAE</small><strong>{best??'—'}</strong><span>{best?'Vorläufig, kein automatischer Wechsel':'Ab 30 Spielen / 8 Tagen sichtbar'}</span></div>
          </div>
          <div className="learning-cloud-table-wrap"><table className="tracking-table learning-cloud-table"><thead><tr><th>Prognosemodell</th><th>Spiele</th><th>MAE ↓</th><th>RMSE ↓</th><th>Bias</th></tr></thead><tbody>
            {(summary?.models??[]).map(m=><tr key={m.model}><td><strong>{m.model}</strong>{best===m.model&&<small>kleinster aktueller MAE</small>}</td><td>{m.count}</td><td>{m.count?n(m.mae):'—'}</td><td>{m.count?n(m.rmse):'—'}</td><td>{m.count?`${m.bias>0?'+':''}${n(m.bias)}`:'—'}</td></tr>)}
          </tbody></table></div>
          {summary?.trend?.length?<div className="learning-cloud-trend"><strong>Letzte 12 Spieltage · absoluter Prognosefehler (niedriger ist besser)</strong><div className="learning-cloud-trend-items">
            {summary.trend.map(row=><div className="learning-cloud-day" key={row.day} title={`${row.day} · V1.7 ${n(row.v17)} / V1.8 ${n(row.v18)} / V2.0 ${n(row.v20)} · ${row.count} Spiele`}>
              <div className="learning-cloud-bars"><i style={{height:`${Math.max(3,row.v17/maxDay*100)}%`}}/><i style={{height:`${Math.max(3,row.v18/maxDay*100)}%`}}/><i style={{height:`${Math.max(3,row.v20/maxDay*100)}%`}}/></div><small>{row.day.slice(5)}</small></div>)}
          </div><div className="learning-cloud-legend">V1.7 · Blau &nbsp; V1.8 · Mint &nbsp; V2.0 · Lila</div></div>:null}
          <p className="learning-cloud-muted">{summary?.note} {summary?.pending??0} Scores noch offen. Gespeichert werden ausschließlich vorab berechnete, öffentliche Spielerprognosen. Es werden keine Modellgewichte automatisch verändert. {data.limit?`Anzeige der jüngsten ${data.limit} Archiv-Einträge, ältere bleiben gespeichert.`:''}</p>
          {(data.statuses??[]).some(x=>!x.ok)&&<p className="learning-cloud-warning">Einzelne Hintergrundläufe haben Fehler gemeldet. Der nächste geplante Lauf versucht es erneut; Ergebnisse werden nicht erfunden.</p>}
        </>}
  </section>;
}

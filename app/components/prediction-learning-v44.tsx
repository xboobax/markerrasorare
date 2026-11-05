'use client';
import {useEffect,useState} from 'react';
import type {Sport} from '@/lib/model';
import type {V44Evaluation,V44Candidate,V44Calibration} from '@/lib/learning-v44-calibration';
import type {V44Job} from '@/lib/learning-v44-db';
type Payload={sport:Sport;configured:boolean;active:V44Calibration|null;summary:V44Evaluation|null;candidate:V44Candidate|null;jobs:V44Job[];message:string};
const f=(n:number|null|undefined,precision=1)=>typeof n==='number'?n.toLocaleString('de-DE',{maximumFractionDigits:precision}):'–';
export default function PredictionLearningV44({sport}:{sport:Sport}){
  const [data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[counter,setCounter]=useState(0);
  useEffect(()=>{const c=new AbortController();setData(null);setLoading(true);setError('');
    fetch(`/api/learning-v44?sport=${sport}`,{signal:c.signal,cache:'no-store'})
      .then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.message||'Lern-Datenbank nicht erreichbar');return data;})
      .then((payload:Payload)=>{if(!c.signal.aborted)setData(payload);})
      .catch(e=>{if(!c.signal.aborted)setError(e instanceof Error?e.message:'Ladefehler');})
      .finally(()=>{if(!c.signal.aborted)setLoading(false);});return ()=>c.abort();
  },[sport,counter]);
  const summary=data?.summary,active=data?.active,candidate=data?.candidate;
  return <section className="learning-cloud" aria-label="Prediction Learning Engine 4.4">
    <div className="learning-cloud-head"><div><span className="section-kicker">V4.4 · ADAPTIVE PREDICTION INTELLIGENCE</span>
      <h3>{sport==='nba'?'🏀 NBA':'⚽ Football'} · eigene Learning Engine</h3>
      <p>Getrennte Sportmodelle · unveränderliche Vor-Spiel-V3-Prognosen · nur bestätigte Sorare-FINAL-Werte · kein Upstash.</p></div>
      <button type="button" disabled={loading} onClick={()=>setCounter(n=>n+1)}>{loading?'Lädt …':'↻ Aktualisieren'}</button></div>
    {loading?<p className="learning-cloud-muted">Lade gesicherte Ergebnisse …</p>:error?<p className="learning-cloud-warning">{error}</p>:
      !data?.configured?<div className="learning-cloud-setup"><strong>Datenbankeinrichtung erforderlich</strong><p>Neon-PostgreSQL-Datenbank und <code>CRON_SECRET</code> einmalig in Vercel einrichten. Bis dahin läuft die bisherige Prediction Engine unverändert.</p><small>Details: UPDATE_V4_4_0_LEARNING_ENGINE_DE.md</small></div>:
      <><div className="learning-cloud-state"><span className={`learning-cloud-dot ${active?'on':'pending'}`}/>
        <strong>{active?`Validiertes ${sport.toUpperCase()}-Modell V${active.version} aktiv`:'Noch keine validierte Modelländerung aktiv'}</strong>
        <small>NBA und Fußball nutzen voneinander unabhängige Kalibrierungswerte. {data.message}</small></div>
        <div className="learning-cloud-metrics">
          <div><small>Vor-Spiel-Snapshots</small><strong>{f(summary?.total,0)}</strong><span>Nur {sport==='nba'?'NBA':'Football'}</span></div>
          <div><small>Offiziell auswertbar</small><strong>{f(summary?.eligible,0)}</strong><span>{f(summary?.days,0)} Spieltage</span></div>
          <div><small>PP-Fehler · MAE</small><strong>{f(summary?.ppMae)}</strong><span>Nur bestätigte Einsätze</span></div>
          <div><small>Q80-Abdeckung</small><strong>{typeof summary?.q80Coverage!=='number'?'–':f(summary.q80Coverage*100)+' %'}</strong><span>Ziel: ca. 80 %</span></div>
        </div>
        {sport==='nba'&&<div className="learning-cloud-metrics">
          <div><small>Dreier-Spieler-Spiele</small><strong>{f(summary?.threeSamples,0)}</strong><span>ESPN + Sorare eindeutig verknüpft</span></div>
          <div><small>Ø 3PM</small><strong>{f(summary?.threeMadeMean,2)}</strong><span>Erfolgreiche Dreier</span></div>
          <div><small>Ø 3PA</small><strong>{f(summary?.threeAttemptMean,2)}</strong><span>Versuche</span></div>
          <div><small>3P%</small><strong>{typeof summary?.threePct!=='number'?'–':f(summary.threePct*100,1)+' %'}</strong><span>Pregame-Dreierprofile: {f(summary?.pregameThreeSamples,0)}</span></div>
        </div>}
        <div className="learning-cloud-table-wrap"><table className="tracking-table learning-cloud-table"><thead><tr><th>Modellprüfung</th><th>PP-Offset</th><th>Q80-Offset</th><th>Holdout MAE</th><th>Q80-Abdeckung</th></tr></thead><tbody>
          <tr><td>Aktiv · {active?`V${active.version}`:'V3 Basis'}</td><td>{active?f(active.ppOffset):'0'}</td><td>{active?f(active.q80Offset):'0'}</td><td>{f(active?.holdoutMae)}</td><td>{active?f(active.holdoutCoverage*100)+' %':'–'}</td></tr>
          {candidate&&<tr><td>Kandidat · {candidate.promotable?'Rücktest bestanden':'nicht freigegeben'}</td><td>{f(candidate.ppOffset)}</td><td>{f(candidate.q80Offset)}</td><td>{f(candidate.candidateMae)}</td><td>{f(candidate.candidateCoverage*100)} %</td></tr>}
        </tbody></table></div>
        <p className="learning-cloud-muted">{candidate?`${candidate.train} Trainingsbeispiele / ${candidate.holdout} unabhängige Holdout-Beispiele. ${candidate.reason}`:
          'Noch nicht genug bestätigte Spiele für ein sicheres automatisches Update: mindestens 140 eindeutige Spieler-Spiele an 18 Tagen.'}
          {' '}Automatische Aktivierung ist zusätzlich durch <code>V44_AUTO_PROMOTE=true</code> zu erlauben. Keine automatischen Änderungen ohne bestandenen Rücktest.</p>
        {data.jobs?.length>0&&<div className="learning-cloud-table-wrap"><table className="tracking-table learning-cloud-table"><thead><tr><th>Hintergrundjob</th><th>Status</th><th>Zuletzt</th></tr></thead><tbody>
          {data.jobs.slice(0,9).map(job=><tr key={job.scope}><td title={job.message}>{job.scope.replace('v44:','')}</td><td>{job.ok?'OK':'Fehler'}</td><td>{new Date(job.at).toLocaleString('de-DE')}</td></tr>)}
        </tbody></table></div>}
      </>}
  </section>;
}

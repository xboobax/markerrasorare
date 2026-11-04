"use client";

import {useMemo,useState} from "react";
import type {TrackedPrediction} from "@/lib/tracking";
import type {Sport} from "@/lib/model";
import {analyzePredictionLab,type LabRange,type LabGroup} from "@/lib/prediction-lab-pro";

const number=(n:number|null|undefined)=>typeof n==="number"&&Number.isFinite(n)?n.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1}):"—";
const displayDay=(date:string)=>date ? new Date(date+"T12:00:00Z").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}):"—";
export default function PredictionLabPro({rows,sport}:{rows:TrackedPrediction[];sport:Sport}){
  const [range,setRange]=useState<LabRange>("all");
  const [group,setGroup]=useState<LabGroup>("score");
  // Time is read at render, not persisted. Switching tabs/filters re-evaluates
  // historical outcomes without modifying the archived predictions.
  const result=useMemo(()=>analyzePredictionLab(rows,sport,range,new Date()),[rows,sport,range]);
  const candidate=result.candidate;
  const segments=group==="score"?result.scoreSegments:group==="position"?result.positionSegments:result.teamSegments;
  const maxTrend=Math.max(1,...result.trends.flatMap(row=>[row.baselineMae,row.challengerMae]));
  const candidateReady=candidate.readiness==="promising";
  const candidateHasTest=candidate.weight!==null;
  return <section className="prediction-pro" aria-label="Prediction Lab Pro">
    <header className="prediction-pro-head">
      <div><span className="section-kicker">V2.7 / PREDICTION LAB PRO</span><h3>Wird deine Prognose wirklich besser?</h3><p>Nur vorab gespeicherte Modelle und spätere offizielle Sorare-Ergebnisse. Keine nachträglich erfundenen Vorhersagen.</p></div>
      <label className="prediction-pro-range">Zeitraum
        <select value={range} aria-label="Auswertungszeitraum" onChange={event=>setRange(event.target.value as LabRange)}><option value="all">Gesamtes Archiv</option><option value="30">Letzte 30 Tage</option><option value="90">Letzte 90 Tage</option></select>
      </label>
    </header>
    <div className="prediction-pro-kpis">
      <div className="prediction-kpi-mint"><small>V1.7 · MAE</small><strong>{number(result.baseline?.mae)}</strong><span>Ø Fehler in Sorare-Punkten</span></div>
      <div className="prediction-kpi-cyan"><small>V1.8 · MAE</small><strong>{number(result.challenger?.mae)}</strong><span>Nur eingefrorene Vergleiche</span></div>
      <div className="prediction-kpi-violet"><small>V1.8 gewinnt</small><strong>{result.winRate===null?"—":`${number(result.winRate)} %`}</strong><span>Ohne exakte Gleichstände; erst ab 5 Entscheidungen</span></div>
      <div className="prediction-kpi-gold"><small>80-%-Intervall: Treffer</small><strong>{result.intervalCoverage80===null?"—":`${number(result.intervalCoverage80)} %`}</strong><span>{result.intervalCount} gültige Intervalle · ab 10 angezeigt</span></div>
    </div>
    <p className="prediction-pro-audit">Datengrundlage: <strong>{result.included} Spieler-Spiele</strong> an <strong>{result.days} Spieltagen</strong>. {result.unresolved} Ergebnisse noch offen · {result.manualExcluded} manuell eingetragen (nicht im offiziellen Vergleich) · {result.noFrozenComparison} ohne vorab gespeicherten Modellvergleich · {result.invalidOfficial} unplausibel oder zeitlich ungeklärt · {result.duplicateExcluded} Dubletten entfernt. Alte Aufzeichnungen werden nicht nachträglich ergänzt.</p>
    <div className="prediction-pro-two">
      <div className="prediction-pro-block">
        <div className="prediction-pro-title"><h4>Fehler nach Spieltag</h4><span>Letzte 12 Spieltage</span></div>
        {result.trends.length>0?<>
          <div className="prediction-pro-chart" aria-label="Vergleich der mittleren absoluten Fehler pro Spieltag">
            {result.trends.map(row=><div className="prediction-trend-day" key={row.date} title={`${row.date}: V1.7 ${number(row.baselineMae)} Punkte, V1.8 ${number(row.challengerMae)} Punkte (${row.count} Spiele)`}>
              <div className="prediction-trend-bars"><span className="prediction-bar-base" style={{height:`${Math.max(3,row.baselineMae/maxTrend*100)}%`}}/><span className="prediction-bar-new" style={{height:`${Math.max(3,row.challengerMae/maxTrend*100)}%`}}/></div>
              <small>{displayDay(row.date)}</small>
              <em>{row.count}</em>
            </div>)}
          </div>
          <div className="prediction-pro-legend"><span><i className="prediction-legend-base"/> V1.7</span><span><i className="prediction-legend-new"/> V1.8</span><small>Niedrigerer MAE ist besser · Zahlen unter dem Datum = Stichprobe</small></div>
        </>:<p className="prediction-pro-empty">Noch keine zulässigen offiziellen Ergebnisse mit zwei eingefrorenen Prognosen vorhanden.</p>}
      </div>
      <div className={`prediction-pro-block prediction-pro-experiment ${candidateReady?"prediction-candidate-promising":""}`}>
        <div className="prediction-pro-title"><h4>Modell-Experiment</h4><span className={candidateReady?"prediction-label-ready":"prediction-label-pending"}>{candidateReady?"Interessanter Kandidat":candidateHasTest?"Noch kein Vorteil":"Datensammlung"}</span></div>
        <p>Wir testen eine Mischung aus V1.7 und V1.8. Das Mischverhältnis wird <strong>ausschließlich aus älteren Spieltagen</strong> bestimmt und auf späteren, zuvor ungesehenen Spieltagen überprüft.</p>
        {candidateHasTest?<>
          <div className="prediction-candidate-weight"><span>V1.7-Anteil <strong>{Math.round((1-candidate.weight!)*100)} %</strong></span><span>V1.8-Anteil <strong>{Math.round(candidate.weight!*100)} %</strong></span></div>
          <div className="prediction-candidate-track"><div style={{width:`${Math.round(candidate.weight!*100)}%`}}/></div>
          <div className="prediction-pro-candidate-grid"><div><small>Training · MAE</small><strong>{number(candidate.blendedTrainMae)}</strong><span>{candidate.trainingCount} Spiele / {candidate.trainingDays} Tage</span></div><div><small>Späterer Holdout · MAE</small><strong>{number(candidate.blendedHoldoutMae)}</strong><span>{candidate.holdoutCount} Spiele / {candidate.holdoutDays} Tage</span></div><div><small>Baseline im Holdout</small><strong>{number(candidate.baselineHoldoutMae)}</strong><span>V1.7 ohne Anpassung</span></div><div><small>Holdout-Veränderung</small><strong>{candidate.improvementPercent===null?"—":`${candidate.improvementPercent>0?"+":""}${number(candidate.improvementPercent)} %`}</strong><span>Positiv = kleinerer Fehler</span></div></div>
          <p className="prediction-pro-small">Training bis {candidate.lastTrainDate}, Holdout ab {candidate.firstHoldoutDate}. Die späteren Ergebnisse haben die Mischung <strong>nicht</strong> bestimmt. {candidateReady?"Der Kandidat erfüllt eine vorsichtige Mindesthürde, ist aber noch keine bewiesene dauerhafte Verbesserung.":"Kein ausreichender Vorteil auf dem späteren Testzeitraum: Standardmodell unverändert lassen."}</p>
        </>:<div className="prediction-pro-empty">Für den zeitlich getrennten Modelltest benötigen wir mindestens <strong>30 offizielle Vergleiche an acht Spieltagen</strong> (davon mindestens 20 frühere und acht spätere Spiele). Bisher {result.included} Vergleiche an {result.days} Tagen.</div>}
        <p className="prediction-pro-guard"><strong>Kein automatisches Umtrainieren:</strong> V1.7 bleibt Standard. V1.8 lässt sich weiterhin im bestehenden Forecast Lab manuell als Experiment aktivieren. Ein besserer Holdout allein ist keine Gewinngarantie.</p>
      </div>
    </div>
    <div className="prediction-pro-block prediction-pro-breakdown">
      <div className="prediction-pro-title"><h4>Wo passieren die Prognosefehler?</h4><span>Segmentanalyse</span></div>
      <div className="prediction-pro-tabs" role="group" aria-label="Segmentierung wählen">
        <button type="button" aria-pressed={group==="score"} className={group==="score"?"active":""} onClick={()=>setGroup("score")}>Punktbereich</button>
        <button type="button" aria-pressed={group==="position"} className={group==="position"?"active":""} onClick={()=>setGroup("position")}>Position</button>
        <button type="button" aria-pressed={group==="team"} className={group==="team"?"active":""} onClick={()=>setGroup("team")}>Verein</button>
      </div>
      <div className="tracking-scroll"><table className="tracking-table prediction-pro-table"><thead><tr><th>Gruppe</th><th>Vergleiche</th><th>V1.7 MAE</th><th>V1.8 MAE</th><th>V1.8 Vorteil</th><th>V1.8 Bias</th></tr></thead><tbody>
        {segments.length?segments.map(row=><tr key={row.name}><td><strong>{row.name}</strong>{row.count<10&&<small>Wenig Daten · keine Schlussfolgerung</small>}</td><td>{row.count}</td><td>{number(row.baseline.mae)}</td><td>{number(row.challenger.mae)}</td><td className={row.delta>0?"prediction-positive":row.delta<0?"prediction-negative":""}>{row.delta>0?"+":""}{number(row.delta)}</td><td>{row.challenger.bias>0?"+":""}{number(row.challenger.bias)}</td></tr>):<tr><td colSpan={6}>Noch keine geeigneten offiziellen Vergleiche.</td></tr>}
      </tbody></table></div>
      <p className="prediction-pro-small">Punktbereiche richten sich nach der <strong>vor dem Spiel gespeicherten V1.7-Prognose</strong>, nicht nach dem Ergebnis. Positionen sind nur bei neuen Snapshots verfügbar; ältere Einträge werden nicht nachträglich ergänzt. Kleine Stichproben nicht überinterpretieren.</p>
    </div>
    <div className="prediction-pro-block prediction-pro-misses">
      <div className="prediction-pro-title"><h4>Die größten Abweichungen</h4><span>V1.7 · Offizielle Ergebnisse</span></div>
      <div className="tracking-scroll"><table className="tracking-table prediction-pro-table"><thead><tr><th>Spieler / Datum</th><th>Ist</th><th>V1.7</th><th>V1.8</th><th>V1.7 Fehler</th></tr></thead><tbody>
        {result.misses.length?result.misses.map(row=><tr key={row.key}><td><strong>{row.name}</strong><small>{row.team} · {row.date}</small></td><td>{number(row.actual)}</td><td>{number(row.baseline)}</td><td>{number(row.challenger)}</td><td className="prediction-negative">{number(row.absError)} Punkte</td></tr>):<tr><td colSpan={5}>Noch keine offiziellen Ergebnisse mit eingefrorenen Prognosen.</td></tr>}
      </tbody></table></div>
      <p className="prediction-pro-small">Die Liste dient zur Ursachenanalyse, nicht zum rückwirkenden „Anpassen“ der gespeicherten Vorhersagen. Vergangene Fehler können nicht verlässlich als künftige Fehler vorhergesagt werden.</p>
    </div>
  </section>;
}

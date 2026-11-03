"use client";

import {useMemo,useRef,useState} from "react";
import {analyzeDataHealth,createLocalBackup,parseLocalBackup,type FetchSummary} from "@/lib/data-health";
import type {Player,Sport} from "@/lib/model";

type Props={sport:Sport;players:Player[];summary:FetchSummary;archiveBackend:"indexeddb"|"localStorage";pendingResults:number;
 matchupSource:string|null;scheduleStatus:string};
const statusLabel={healthy:"Daten verfügbar",partial:"Teilweise Datenlücken",error:"Abruffehler",empty:"Kein Kader geladen"};
export default function DataHealthCenter({sport,players,summary,archiveBackend,pendingResults,matchupSource,scheduleStatus}:Props){
  const [message,setMessage]=useState("");
  const [refreshing,setRefreshing]=useState(false);
  const input=useRef<HTMLInputElement|null>(null);
  const scan=useMemo(()=>analyzeDataHealth(players,summary),[players,summary]);
  const date=Number.isFinite(Date.parse(summary.generatedAt))?new Date(summary.generatedAt).toLocaleString("de-DE",{dateStyle:"short",timeStyle:"short",timeZone:"Europe/Berlin"}):"Unbekannt";
  const downloadBackup=()=>{
    try{
      const backup=createLocalBackup(window.localStorage,new Date().toISOString());
      if(!Object.keys(backup.settings).length){setMessage("Noch keine lokalen Einstellungen zum Sichern vorhanden.");return;}
      const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:"application/json"}));
      const a=document.createElement("a");a.href=url;a.download=`markerras-einstellungen-v21-${new Date().toISOString().slice(0,10)}.json`;a.click();
      window.setTimeout(()=>URL.revokeObjectURL(url),1000);
      setMessage(`${Object.keys(backup.settings).length} lokale Einstellungsbereiche exportiert. Forecast-Lab-Prognosen separat im Tracking-Bereich sichern.`);
    }catch{setMessage("Export nicht möglich. Prüfe die Speicherberechtigung des Browsers.");}
  };
  const importBackup=async(file:File|undefined)=>{
    if(!file)return;
    if(file.size>1_100_000){setMessage("Die Sicherung ist zu groß (max. 1,1 MB).");return;}
    try{
      const backup=parseLocalBackup(JSON.parse(await file.text()));
      const entries=Object.entries(backup.settings);
      if(!window.confirm(`${entries.length} lokale Einstellungsbereiche aus dieser Sicherung übernehmen? Vorhandene Einstellungen mit demselben Namen werden überschrieben. Danach lädt die Seite neu.`)){
        setMessage("Import abgebrochen – nichts verändert.");return;
      }
      // Roll back all keys if the browser storage quota or permissions reject a write.
      const before=entries.map(([key])=>[key,window.localStorage.getItem(key)] as const);
      try{for(const [key,value] of entries)window.localStorage.setItem(key,value);}
      catch(e){for(const [key,value] of before){try{if(value===null)window.localStorage.removeItem(key);else window.localStorage.setItem(key,value);}catch{}}
        throw e;}
      window.location.reload();
    }catch(e){setMessage(e instanceof Error?`Import fehlgeschlagen: ${e.message}`:"Import fehlgeschlagen: ungültige Sicherung.");}
  };
  return <section className="panel health-center" id="data-health">
    <div className="section-top health-heading"><div><span className="section-kicker">V2.1 / DATA OBSERVABILITY</span><h2>Data Health & Sync Center</h2><p>So erkennst du Datenlücken, bevor sie deine Prognosen und Lineups verfälschen.</p></div><span className={`health-status status-${scan.state}`}><i aria-hidden="true"/>{statusLabel[scan.state]}</span></div>
    <div className="health-overview">
      <div><small>DATENBEREICH</small><strong>{scan.players.toLocaleString("de-DE")}</strong><span>geladene Spieler</span></div>
      <div><small>TEAMS ERFOLGREICH</small><strong>{Math.max(0,summary.scopeTeams-summary.failedTeams)} <em>/ {summary.scopeTeams}</em></strong><span>{summary.incompleteTeams} Kader nur teilweise</span></div>
      <div><small>OHNE SCORE-GRUNDLAGE</small><strong className={scan.scoreless?"health-highlight":""}>{scan.scoreless}</strong><span>Keine Null-Prognosen erfinden</span></div>
      <div><small>DATENSTAND</small><strong className="health-time">{date}</strong><span>Zeitpunkt der Server-Antwort*</span></div>
    </div>
    <div className="health-main">
      <div className="health-checks"><div className="health-mini-heading">DATENABDECKUNG <small>im aktuell gewählten Team-/Ligabereich</small></div>
        {scan.metrics.map(m=><div className="health-metric" key={m.key}><div className="health-metric-top"><span>{m.label}<small>{m.note}</small></span><strong>{m.count} / {scan.players} · {m.percent} %</strong></div><div className="health-bar"><span style={{width:`${m.percent}%`}}/></div></div>)}
      </div>
      <div className="health-sidebar">
        <div className="health-mini-heading">SYSTEMSTATUS</div>
        <div className="health-system"><span>Prognosearchiv</span><strong>{archiveBackend==="indexeddb"?"IndexedDB lokal":"Browser-Speicher (Fallback)"}</strong></div>
        <div className="health-system"><span>Offene Ergebnisprüfungen</span><strong>{pendingResults}</strong></div>
        <div className="health-system"><span>Gegnerdaten</span><strong>{matchupSource??"Keine externe Quelle"}</strong></div>
        {sport==="nba"&&<div className="health-system"><span>NBA-Spielplan</span><strong>{scheduleStatus==="available"?"Verfügbar":scheduleStatus==="not-configured"?"Nicht eingerichtet":"Momentan nicht verfügbar"}</strong></div>}
        <div className="health-mini-heading health-issues-title">DIAGNOSE</div>
        {scan.warnings.length ? <ul className="health-warnings">{scan.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul> : <p className="health-ok">✓ Keine auffälligen Datenlücken in den geprüften Feldern. Das bestätigt nicht alle externen Datenquellen.</p>}
      </div>
    </div>
    <div className="health-actions"><div><strong>Lokale Daten sichern & wiederherstellen</strong><p>Kartenmarkierungen, Watchlist, Lineups, Arcade-Fortschritt und Einstellungen. Prognosen aus dem Forecast Lab müssen weiterhin separat dort exportiert werden. Kein Cloud-Sync.</p></div><div className="health-buttons">
      <button type="button" onClick={()=>{setRefreshing(true);window.location.reload();}} disabled={refreshing}>↻ Seite neu laden</button>
      <button type="button" className="health-export" onClick={downloadBackup}>↓ Einstellungen sichern</button>
      <button type="button" onClick={()=>input.current?.click()}>↑ Sicherung importieren</button>
      <input ref={input} type="file" accept=".json,application/json" className="health-file-input" aria-label="Lokale Sicherung auswählen" onChange={e=>{void importBackup(e.target.files?.[0]);e.target.value="";}}/>
    </div></div>
    {message&&<p className="health-message" role="status">{message}</p>}
    <p className="health-caveat">* Der Zeitstempel markiert die Erstellung dieser Server-Antwort. Sorare-Abfragen können durch Next.js zwischengespeichert sein (Kader typischerweise bis zu 15 Minuten); Neuladen erzwingt keinen neuen Live-Abruf. Bild-URLs können vorhanden sein, auch wenn eine Bildanzeige scheitert. Es wurden keine zusätzlichen Sorare-GraphQL-Abfragen eingebaut.</p>
  </section>;
}

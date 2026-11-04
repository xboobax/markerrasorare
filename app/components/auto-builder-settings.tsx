"use client";
import {useState} from "react";
import type {Sport} from "@/lib/model";
import {initialV30Settings,presetSettings,v30ForTeam,type BuilderV30Settings,type BuilderV30State,type ProjectionMode,type StackMode,type AutoPreset} from "@/lib/builder-v30";

type Props={sport:Sport;league:string;leagues:string[];state:BuilderV30State;onChange:(next:BuilderV30State)=>void;teamId:string;onTeamChange?:(id:string)=>void;maxTeams?:number};
export default function AutoBuilderSettings({sport,league,leagues,state,onChange,teamId,onTeamChange,maxTeams=5}:Props){
  const [open,setOpen]=useState(false);
  const settings=v30ForTeam(state,teamId);
  const update=(patch:Partial<BuilderV30Settings>)=>{
    const next={...settings,...patch,preset:"custom" as AutoPreset};
    onChange(state.scope==="all"?{...state,global:next}:{...state,teams:{...state.teams,[teamId]:next}});
  };
  const applyPreset=(preset:Exclude<AutoPreset,"custom">)=>{
    const next=presetSettings(preset,settings);
    onChange(state.scope==="all"?{...state,global:next}:{...state,teams:{...state.teams,[teamId]:next}});
  };
  const availableLeagues=[...new Set([league,...leagues].filter(Boolean))];
  const toggleLeague=(value:string,checked:boolean)=>update({excludedLeagues:checked?[...settings.excludedLeagues,value]:settings.excludedLeagues.filter(v=>v!==value)});
  return <section className="v30-strategy" aria-label="Erweiterte Auto-Builder-Einstellungen">
    <div className="v30-strategy-head"><div><span className="v30-kicker">V3.0 · ADVANCED STRATEGY</span><h3>Auto-Builder-Einstellungen</h3><p>Für NBA und Fußball · gespeicherte Regeln, keine automatische Änderung bestehender Teams</p></div><button type="button" className="v30-open-btn" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>{open?"▴ Schließen":"⚙ Einstellungen"}</button></div>
    <div className="v30-scope-row"><span>Geltungsbereich</span><button type="button" className={state.scope==="team"?"active":""} onClick={()=>onChange({...state,scope:"team"})}>Je Team</button><button type="button" className={state.scope==="all"?"active":""} onClick={()=>onChange({...state,scope:"all"})}>Alle Teams</button>{state.scope==="team"&&onTeamChange&&<select aria-label="Einstellungen für Team auswählen" value={teamId} onChange={e=>onTeamChange(e.target.value)}>{Array.from({length:maxTeams},(_,i)=><option value={`team-${i+1}`} key={i}>Team {i+1}</option>)}</select>}<small>{state.scope==="all"?"Eine Einstellung für alle automatisch erstellten Teams.":`Einstellungen für ${teamId.replace("team-","Team ")}.`}</small></div>
    <div className="v30-core-row"><fieldset><legend>Projektion · Optimierungsziel</legend>{(["ps","q80","raw"] as ProjectionMode[]).map(mode=><button type="button" key={mode} className={settings.projection===mode?"active":""} onClick={()=>update({projection:mode})}>{({ps:"PS Standard",q80:"PS Q80*",raw:"PS Raw"} as const)[mode]}</button>)}<small>PS = Erwartungswert mit Karte. Raw = ohne Bonus. *Q80 ist eine experimentelle, unkalibrierte 80%-Modellquantilschätzung und benötigt ≥8 reale Scores.</small></fieldset>
      <fieldset><legend>Strategievorlagen</legend>{(["safe","balanced","ceiling"] as const).map(p=><button key={p} type="button" className={settings.preset===p?"active":""} onClick={()=>applyPreset(p)}>{({safe:"Safe",balanced:"Balanced",ceiling:"High Ceiling"} as const)[p]}</button>)}<small>Vorlage anklicken oder Einstellungen unten individuell ändern.</small></fieldset></div>
    {open&&<div className="v30-options-grid">
      {sport==="football"&&<section><strong>Ausgeschlossene Ligen</strong><small>Wirkt auf die aktuell geladene Liga. Für weitere Ligen bitte zuerst den Datenbereich wechseln.</small><div className="v30-checks">{availableLeagues.map(l=><label key={l}><input type="checkbox" checked={settings.excludedLeagues.includes(l)} onChange={e=>toggleLeague(l,e.target.checked)}/>{l}</label>)}</div></section>}
      {sport==="football"&&<section><strong>Team-Struktur</strong><small>Verpflichtende Kombination beim automatischen Aufstellen.</small><select aria-label="Fußball Team-Stack auswählen" value={settings.stack} onChange={e=>update({stack:e.target.value as StackMode})}><option value="none">Keine Vorgabe</option><option value="defensive">Defensiv-Stack · TW + VER vom selben Club</option><option value="offensive">Offensiv-Stack · MF + ST vom selben Club</option><option value="team">Team-Stack · mindestens 3 vom selben Club</option></select></section>}
      <section><strong>Matchup-Konflikte</strong><label><input type="checkbox" checked={settings.avoidOpponents} onChange={e=>update({avoidOpponents:e.target.checked})}/> Keine gegeneinander spielenden Clubs im selben Lineup</label><small>Nur verifizierbare Gegnerzuordnungen; unbekannte Paarungen werden nicht geraten.</small></section>
      <section><strong>Übergreifende Spielerbegrenzung</strong><label>Maximale Lineups pro Spieler<select aria-label="Maximale Team-Verwendungen pro Spieler" value={settings.maxUses} onChange={e=>update({maxUses:Number(e.target.value)})}>{Array.from({length:6},(_,i)=><option key={i+1} value={i+1}>{i+1===6?"Keine zusätzliche Begrenzung":`${i+1} Team${i===0?"":"s"}`}</option>)}</select></label><small>Gilt für automatisch erstellte Varianten innerhalb dieses Builders; vorhandene Teams werden nicht entfernt.</small></section>
      <section><strong>Spieler-/Kartenpräferenzen</strong><label><input type="checkbox" checked={settings.preferPrimary} onChange={e=>update({preferPrimary:e.target.checked})}/> Standardposition bevorzugen</label><label title="Die Synchronisierung liefert noch keine zuverlässige Classic-Kennzeichnung"><input type="checkbox" disabled checked={false} readOnly/> Classic-Karten bevorzugen (nicht verfügbar)</label><small>Eine Classic-Präferenz wird erst angeboten, sobald Sorare die Kartentypen zuverlässig unterscheidbar liefert.</small></section>
      {sport==="football"&&<section><strong>Fußball-Lineup-Plätze</strong><label>Extra-Position<select value={settings.extraPosition} aria-label="Extra-Position bevorzugen" onChange={e=>update({extraPosition:e.target.value as BuilderV30Settings["extraPosition"]})}><option value="ANY">Beliebige Feldposition</option><option value="DEF">Nur Verteidiger</option><option value="MID">Nur Mittelfeld</option><option value="FWD">Nur Stürmer</option></select></label><small>👑 Captain bleibt automatisch oder manuell wählbar · immer +50 %.</small></section>}
      <section><strong>Mindestpunkte</strong><label>Mindestens prognostizierte Teampunkte<input type="number" min={1} max={2000} step={1} placeholder="Kein Minimum" value={settings.minProjected??""} onChange={e=>update({minProjected:e.target.value?Number(e.target.value):null})}/></label><small>Werden die Vorgaben nicht erfüllt, entsteht kein künstliches Lineup. NBA bleibt auf 16 ★ begrenzt.</small></section>
      <section><strong>Konfliktprüfung & Datenqualität</strong><p>Unvereinbare Filter können leere Ergebnisse verursachen. Dann Hinweise beachten und z. B. Team-Stack oder Liga-Ausschluss lockern.</p><button type="button" onClick={()=>update(initialV30Settings())}>Einstellungen zurücksetzen</button></section>
    </div>}
  </section>;
}

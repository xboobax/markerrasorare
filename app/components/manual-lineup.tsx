"use client";

import Link from "next/link";
import {useEffect, useMemo, useState} from "react";
import {ARCADE} from "@/config/divination";
import {slotAccepts, isValidNbaStars, type CardInput} from "@/lib/arcade";
import {emptyManualSelection, evaluateManualLineup, normalizeManualSelection, type ManualSelection} from "@/lib/manual-lineup";
import type {Forecast, Sport} from "@/lib/model";

type CardSettings = {owned?:boolean; stars?:number|null; bonusPercent?:number};
type Props = {
  sport: Sport;
  players: Forecast[];
  cardStore: Record<string, CardSettings>;
  updateCard: (id:string, patch:CardSettings)=>void;
  targetScore: number|null;
  onOpenProfile: (id:string)=>void;
  onSavePredictions: (picks:Forecast[])=>void;
};
const abbreviations:Record<string,string>={GK:"TW",DEF:"VER",MID:"MF",FWD:"FWD",FLEX:"EX",ANY:"NBA"};
const names:Record<string,string>={GK:"Torwart",DEF:"Verteidiger",MID:"Mittelfeld",FWD:"Stürmer",FLEX:"Zusätzlicher Feldspieler",ANY:"Freie Wahl"};
const fmt=(n:number)=>Number.isFinite(n)?n.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1}):"—";
const starOptions=Array.from({length:9},(_,i)=>1+i*.5);
const normalize=(value:string)=>value.toLocaleLowerCase("de-DE").normalize("NFKD").replace(/[\u0300-\u036f]/g,"");
const storageKey=(sport:Sport)=>`markerras.sorare.manual-lineup.v1.${sport}`;

function ManualAvatar({player}:{player?:Forecast}) {
  const [broken,setBroken]=useState(false);
  useEffect(()=>setBroken(false),[player?.imageUrl]);
  return player?.imageUrl && !broken ?
    <img className="manual-avatar" src={player.imageUrl} alt={`Foto: ${player.name}`} loading="lazy" referrerPolicy="no-referrer" onError={()=>setBroken(true)}/> :
    <span className="manual-avatar manual-avatar-fallback" aria-label={player ? `Kein verfügbares Foto: ${player.name}` : "Freier Slot"}>
      {player?.name.slice(0,2).toUpperCase()||"+"}
    </span>;
}

export default function ManualLineup({sport,players,cardStore,updateCard,targetScore,onOpenProfile,onSavePredictions}:Props) {
  const [selection,setSelection]=useState<ManualSelection>(emptyManualSelection);
  const [presets,setPresets]=useState<Record<string,ManualSelection>>({});
  const [loadedSport,setLoadedSport]=useState<Sport|null>(null);
  const [activeSlot,setActiveSlot]=useState<number|null>(null);
  const [search,setSearch]=useState("");
  const [ownedOnly,setOwnedOnly]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    setLoadedSport(null); setActiveSlot(null); setSearch(""); setMessage("");
    try {
      const raw=window.localStorage.getItem(storageKey(sport));
      const data=raw?JSON.parse(raw):null;
      setSelection(normalizeManualSelection(data?.selection));
      const items:Record<string,ManualSelection>={};
      if(data?.presets && typeof data.presets==="object") {
        for(const key of ["1","2","3"]) if(data.presets[key]) items[key]=normalizeManualSelection(data.presets[key]);
      }
      setPresets(items);
    } catch {setSelection(emptyManualSelection());setPresets({});}
    setLoadedSport(sport);
  },[sport]);
  useEffect(()=>{
    if(loadedSport!==sport) return;
    try {window.localStorage.setItem(storageKey(sport),JSON.stringify({selection,presets}));}
    catch { /* browser storage blocked: manual builder still works this session */ }
  },[sport,loadedSport,selection,presets]);

  const cards:CardInput[]=useMemo(()=>players.map(p=>({player:p,owned:cardStore[p.id]?.owned===true,
    stars:cardStore[p.id]?.stars??null,bonusPercent:cardStore[p.id]?.bonusPercent??0})),[players,cardStore]);
  const lineup=useMemo(()=>evaluateManualLineup(selection,cards,sport,targetScore),[selection,cards,sport,targetScore]);
  const slots=sport==="nba"?ARCADE.nba.slots:ARCADE.football.slots;
  const selectedIds=new Set(selection.filter((id):id is string=>Boolean(id)));
  const candidates=useMemo(()=>{
    if(activeSlot===null) return [];
    const slot=slots[activeSlot];
    const term=normalize(search.trim());
    return players.filter(p=>slotAccepts(slot,p.position) && !selectedIds.has(p.id)
      && (!ownedOnly || cardStore[p.id]?.owned)
      && (!term || normalize(`${p.name} ${p.team} ${p.position}`).includes(term)))
      .sort((a,b)=> term ? a.name.localeCompare(b.name,"de") : b.weighted-a.weighted)
      .slice(0,90);
  },[activeSlot,slots,players,search,ownedOnly,cardStore,selection]);
  const pickPlayer=(index:number,id:string)=>{
    const next=selection.slice();next[index]=id;setSelection(next);setSearch("");setMessage("");
    const following=next.findIndex((v,i)=>i>index&&!v);
    setActiveSlot(following>=0?following:null);
  };
  const savePreset=(key:string)=>{
    setPresets(previous=>({...previous,[key]:normalizeManualSelection(selection)}));
    setMessage(`Aufstellung ${key} lokal gespeichert.`);
  };
  const loadPreset=(key:string)=>{
    if(!presets[key]) return;
    setSelection(normalizeManualSelection(presets[key]));setActiveSlot(null);setMessage(`Aufstellung ${key} geladen.`);
  };
  const missing=selection.filter(id=>id&&!players.some(p=>p.id===id)).length;

  return <div className="manual-builder">
    <div className="manual-intro">
      <div><strong>Deine Aufstellung – du entscheidest</strong><p>Wähle jeden Spieler einzeln für einen Slot aus. Keine automatische Ersetzung. Deine Auswahl wird auf diesem Gerät gespeichert.</p></div>
      <button type="button" className="manual-reset" onClick={()=>{setSelection(emptyManualSelection());setActiveSlot(null);setMessage("Aufstellung geleert.");}}>Alle entfernen</button>
    </div>
    <div className="manual-presets" aria-label="Gespeicherte Aufstellungen">
      {["1","2","3"].map(key=><div className="manual-preset" key={key}>
        <span>Aufstellung {key}</span>
        <button type="button" onClick={()=>savePreset(key)}>Speichern</button>
        <button type="button" disabled={!presets[key]} onClick={()=>loadPreset(key)}>Laden</button>
      </div>)}
    </div>
    {message&&<p className="manual-message" role="status">{message}</p>}
    <div className="manual-lineup-slots">
      {slots.map((slot,index)=>{
        const pick=lineup.slots[index];
        const active=activeSlot===index;
        const id=selection[index];
        return <div key={`${slot}-${index}`} className={`manual-slot ${active?"is-active":""} ${pick?"has-player":""}`}>
          <div className="manual-slot-head"><span>{sport==="nba"?`Karte ${index+1}`:`${abbreviations[slot]} · ${names[slot]}`}</span><span>{pick?`${fmt(pick.projectedScore)} Pkt.`:"Nicht besetzt"}</span></div>
          <div className="manual-slot-main">
            <ManualAvatar player={pick?.player}/>
            <div className="manual-player-title">
              {pick?<><button type="button" onClick={()=>onOpenProfile(pick.player.id)}>{pick.player.name} ↗</button><small>{pick.player.team} · {pick.player.position} {pick.player.hasGame===false?"· Kein Spiel":""}</small></>
                :<strong>{id?"Spieler ist im aktuellen Datenbereich nicht geladen":"Spieler auswählen"}</strong>}
            </div>
            <div className="manual-slot-buttons"><button type="button" className="manual-pick-button" onClick={()=>{setActiveSlot(active?null:index);setSearch("");}}>{id?"Ändern":"+ Hinzufügen"}</button>{id&&<button type="button" className="manual-remove" aria-label={`Spieler aus Slot ${index+1} entfernen`} onClick={()=>{const next=selection.slice();next[index]=null;setSelection(next);setMessage("");}}>×</button>}</div>
          </div>
          {pick&&<div className="manual-card-options">
            {sport==="nba"&&<label>Sterne <select aria-label={`Sterne von ${pick.player.name}`} value={isValidNbaStars(cardStore[pick.player.id]?.stars)?String(cardStore[pick.player.id]?.stars):""} onChange={e=>updateCard(pick.player.id,{stars:e.target.value?Number(e.target.value):null})}><option value="">Bitte wählen</option>{starOptions.map(star=><option key={star} value={star}>{fmt(star)} ★</option>)}</select></label>}
            <label>Kartenbonus <select aria-label={`Kartenbonus von ${pick.player.name}`} value={cardStore[pick.player.id]?.bonusPercent??0} onChange={e=>updateCard(pick.player.id,{bonusPercent:Number(e.target.value)})}>{[0,5,10,15,20,25,30].map(b=><option value={b} key={b}>+{b} %</option>)}</select></label>
            <label className="manual-owned"><input type="checkbox" checked={cardStore[pick.player.id]?.owned===true} onChange={e=>updateCard(pick.player.id,{owned:e.target.checked})}/> Meine Karte</label>
          </div>}
        </div>;
      })}
    </div>
    {activeSlot!==null&&<div className="manual-picker" aria-label="Spieler für Slot auswählen">
      <div className="manual-picker-head"><strong>Spieler wählen · {sport==="nba"?`Karte ${activeSlot+1}`:names[slots[activeSlot]]}</strong><button type="button" onClick={()=>setActiveSlot(null)} aria-label="Spielersuche schließen">×</button></div>
      <input className="manual-search" autoFocus type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Spieler oder Verein suchen …" aria-label="Spieler für manuelles Lineup suchen"/>
      <label className="manual-only-owned"><input type="checkbox" checked={ownedOnly} onChange={e=>setOwnedOnly(e.target.checked)}/> Nur meine markierten Karten</label>
      <div className="manual-candidates">
        {candidates.map(p=><button type="button" key={p.id} className="manual-candidate" onClick={()=>pickPlayer(activeSlot,p.id)}>
          <span className="manual-candidate-person"><strong>{p.name}</strong><small>{p.team} · {p.position}</small></span>
          <span>{p.avg===null&&p.proj===null&&p.sampleSize===0?"Score unbekannt":`${fmt(p.weighted)} Pkt.`}</span>
          {sport==="nba"&&<small>{isValidNbaStars(cardStore[p.id]?.stars)?`${fmt(cardStore[p.id]!.stars!)} ★`:"★ fehlt"}</small>}
          <span className="manual-plus">+</span>
        </button>)}
        {!candidates.length&&<div className="empty-state">Keine passenden Spieler im geladenen Bereich. Prüfe die Liga-/Team-Auswahl und den Kartenfilter.</div>}
      </div>
      <p className="manual-footnote">Zeigt die besten 90 passenden Treffer aus dem geladenen Spielerbereich. Über die Suche kannst du weitere Namen finden. {sport === "football" && <>Für die vereinsübergreifende Auswahl: <Link href="/?sport=football&league=__all">Alle vier Ligen laden</Link>.</>}</p>
    </div>}
    <div className="manual-summary">
      <div><small>MANUELLER GESAMTSCORE</small><strong>{fmt(lineup.projectedScore)} <span>Pkt.</span></strong><small>{lineup.picks.length} / 5 Spieler</small></div>
      {sport==="nba"&&<div><small>NBA STERNE-LIMIT</small><strong className={lineup.starsUsed>16?"manual-error-text":""}>{fmt(lineup.starsUsed)} <span>/ 16 ★</span></strong><div className="manual-star-bar"><span style={{width:`${Math.min(100,lineup.starsUsed/16*100)}%`,background:lineup.starsUsed>16?"#e48d87":undefined}}/></div></div>}
      <div><small>FLOOR / CEILING*</small><strong>{fmt(lineup.floorScore)} – {fmt(lineup.ceilingScore)}</strong><small>Heuristische Modellspanne</small></div>
      {targetScore!==null&&<div><small>GESCHÄTZTE ZIELCHANCE*</small><strong>{lineup.targetProbability===null?"—":`${Math.round(lineup.targetProbability*100)} %`}</strong><small>Score-Ziel {fmt(targetScore)}</small></div>}
    </div>
    {lineup.errors.length>0&&<div className="manual-validation" role="alert"><strong>Aufstellung noch nicht gültig</strong>{lineup.errors.map((error,i)=><p key={i}>• {error}</p>)}</div>}
    {!lineup.complete&&!lineup.errors.length&&<p className="manual-hint">Noch {5-lineup.picks.length} freie Slots – stelle insgesamt fünf verschiedene Spieler auf.</p>}
    {lineup.valid&&<p className="manual-valid" role="status">✓ Fünf Spieler und die im Builder geprüften Regeln sind erfüllt. Die tatsächliche Sorare-Arcade-Berechtigung hängt zusätzlich von Set, Karten und Spieltag ab.</p>}
    {missing>0&&<p className="manual-hint">{missing} gespeicherte Spieler sind in der aktuellen Liga-/Team-Auswahl nicht geladen. {sport === "football" && <Link href="/?sport=football&league=__all">Alle vier Ligen anzeigen</Link>}</p>}
    {lineup.warnings.length>0&&<details className="manual-warnings"><summary>{lineup.warnings.length} Hinweise zu Daten oder Kartenbesitz</summary>{lineup.warnings.map((warning,i)=><p key={i}>• {warning}</p>)}</details>}
    {lineup.valid&&<button type="button" className="action-primary manual-save-predictions" onClick={()=>{onSavePredictions(lineup.picks.map(p=>p.player));setMessage("Die fünf Modellprognosen wurden für das Tracking gespeichert.");}}>Prognosen für diese Aufstellung merken</button>}
    <p className="manual-footnote">* Scores und Zielchancen sind Modellschätzungen, keine garantierten Ergebnisse. Sterne und Kartenbonus trägst du selbst ein. Der Builder reicht kein Lineup bei Sorare ein. Aufstellungen bleiben lokal in deinem Browser gespeichert.</p>
  </div>;
}

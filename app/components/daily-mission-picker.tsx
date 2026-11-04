"use client";

import {useEffect,useMemo,useState} from 'react';
import type {Sport} from '@/lib/model';
import type {ScheduleData} from '@/lib/gameweek-center';
import type {AvailabilityReport,AvailabilitySnapshot} from '@/lib/availability';
import {offsetBerlinDay} from '@/lib/builder-pool';
import {missionDescription,rankDailyMissionPlayers,pickOneClickDailyMission,reviewDailyMissionPool,
  type DailyMissionCandidate,type MissionWindow,type MissionRow,type MissionOptions} from '@/lib/daily-mission';

type Props={
  sport:Sport;
  players:DailyMissionCandidate[];
  nbaSchedule:ScheduleData;
  ownedIds:ReadonlySet<string>;
  excludedIds:ReadonlySet<string>;
  onOpenPlayer:(id:string)=>void;
  onSendToBuilder:(id:string)=>void;
  scope:string;
  verifiedOwned:boolean;
  onGoCollection?:()=>void;
  availabilityById?:Readonly<Record<string,AvailabilityReport|undefined>>;
  availabilitySnapshot?:AvailabilitySnapshot|null;
  active?:boolean;
};
const fmt=(n:number)=>n.toLocaleString('de-DE',{maximumFractionDigits:1,minimumFractionDigits:1});
const safetyText={ready:'Gut geprüft',caution:'Prüfen',high:'Hohes Risiko'} as const;
function CandidateCard({row,index,onOpenPlayer,onSendToBuilder,isOwned}: {
  row:MissionRow;index:number;isOwned:boolean;
  onOpenPlayer:(id:string)=>void;onSendToBuilder:(id:string)=>void;
}){
  const p=row.player;
  return <article className="v36-mission-row v38-mission-row">
    <span className="v36-mission-rank">#{index+1}</span>
    <div className="v36-mission-player">
      <button type="button" onClick={()=>onOpenPlayer(p.id)}>{p.name} ↗</button>
      <small>{p.team} · {p.position} · Einsatzmodell {Math.round(p.playProb*100)}%{isOwned?' · Meine Karte':''}</small>
      {p.nextGame&&<small>{p.nextGame}</small>}
      {row.kind==='nba'
        ?<small>L10: {fmt(row.l10!)} · Ziel: <strong>{fmt(row.threshold!)} Pkt.</strong> · Abstand Prognose: <strong>{row.forecastMargin!>=0?'+':''}{fmt(row.forecastMargin!)}</strong></small>
        :<small>{row.reason}</small>}
      {row.kind==='nba'&&<small>{row.historicalGames?`${row.historicalHits}/${row.historicalGames} vergangene Scores ≥ Ziel`:'Keine Einzelscores · Ranking aus Prognose und Streuung'}</small>}
      <small className="v37-data-quality">Datenbasis: {row.quality==='history'?'L10 + historische Scores':row.quality==='partial'?'Scores + optionale Scouting-Daten':'heuristisch · eingeschränkt'}</small>
      <span className={`v38-safety-pill v38-safety-${row.safety.level}`} title={row.safety.notes.join(' · ')||'Keine zusätzlichen Warnhinweise'}>
        {safetyText[row.safety.level]} · Risikoindex {row.safety.riskIndex}/100
      </span>
      {row.safety.notes.length>0&&<small className="v38-safety-note">{row.safety.notes.slice(0,2).join(' · ')}</small>}
    </div>
    <div className="v36-mission-score"><strong>{Math.round(row.rankIndex)}</strong><small>Ranking*</small></div>
    <button type="button" className="v36-mission-add" onClick={()=>onSendToBuilder(p.id)} title="In den manuellen Builder übernehmen; keine Sorare-Daily-Abgabe">+ Builder</button>
  </article>;
}
export default function DailyMissionPicker({sport,players,nbaSchedule,ownedIds,excludedIds,onOpenPlayer,onSendToBuilder,scope,verifiedOwned,
  availabilityById,availabilitySnapshot,onGoCollection,active=true}:Props){
  const [windowMode,setWindowMode]=useState<MissionWindow>(sport==='nba'?'next24':'today');
  const [ownedOnly,setOwnedOnly]=useState(false);
  const [now,setNow]=useState<Date|null>(null);
  const [notice,setNotice]=useState('');
  // Refresh when the tab becomes visible; no polling or background cron required.
  useEffect(()=>{if(active)setNow(new Date());},[sport,active]);
  useEffect(()=>{setWindowMode(sport==='nba'?'next24':'today');setNotice('');},[sport]);
  const options=useMemo<MissionOptions|null>(()=>now?{
    sport,window:windowMode,now,nbaSchedule,ownedOnly,ownedIds,excludedIds,availabilityById,
    availabilityStatus:availabilitySnapshot?.status,availabilityFetchedAt:availabilitySnapshot?.fetchedAt,
  }:null,[sport,windowMode,now,nbaSchedule,ownedOnly,ownedIds,excludedIds,availabilityById,availabilitySnapshot]);
  const ranked=useMemo(()=>options?rankDailyMissionPlayers(players,options):[],[players,options]);
  const audit=useMemo(()=>options?reviewDailyMissionPool(players,options):null,[players,options]);
  const oneClick=useMemo(()=>pickOneClickDailyMission(ranked,ownedIds,verifiedOwned),[ranked,ownedIds,verifiedOwned]);
  const sections=sport==='football'?[{title:'Feldspieler · entscheidende Aktion',kind:'field' as const},{title:'Torhüter · Clean Sheet / Elfmeter',kind:'goalkeeper' as const}]:[{title:'Beste NBA Daily Picks',kind:'nba' as const}];
  const labelDay=now?offsetBerlinDay(now,windowMode==='tomorrow'?1:0):'—';
  const doOneClick=()=>{
    if(!oneClick.row)return;
    setNotice(`${oneClick.row.player.name}: ${oneClick.message} Übernahme im lokalen Builder angefordert (Slot- und Kartenregeln werden dort geprüft); keine Abgabe bei Sorare.`);
    onSendToBuilder(oneClick.row.player.id);
  };
  return <section className="panel v36-mission v38-mission" id="daily-mission-picker" aria-label="Daily Mission Picker">
    <div className="v36-mission-head"><div><span className="section-kicker">DAILY MISSION INTELLIGENCE · V3.8</span><h2>{sport==='nba'?'🏀 NBA Daily Picker':'⚽ Entscheidender-Spieler-Picker'}</h2><p>{missionDescription(sport)}</p></div><span className="v36-mission-source">Kostenlose Daten · aktueller Spielerpool</span></div>
    <div className="v36-mission-tools">
      <label>Spielzeitraum <select aria-label="Daily Mission Zeitraum" value={windowMode} onChange={e=>{setWindowMode(e.target.value as MissionWindow);setNotice('');}}>
        <option value="today">Heute (Berlin)</option><option value="tomorrow">Morgen (Berlin)</option>
        {sport==='nba'&&<option value="next24">Nächste 24 Stunden</option>}
      </select></label>
      <label className="v36-mission-owned"><input type="checkbox" checked={ownedOnly} onChange={e=>setOwnedOnly(e.target.checked)}/> Nur meine Karten</label>
      <button type="button" onClick={()=>{setNow(new Date());setNotice('');}}>↻ Aktualisieren</button>
      <small>{windowMode==='next24'?'Ab jetzt bis +24h':labelDay} · {scope}</small>
    </div>
    <div className="v38-mission-hero">
      <div className="v38-mission-hero-copy"><strong>⚡ One-Click Mission Pick · Top Pick aus deiner Sammlung</strong>
        <span>{oneClick.row?`${oneClick.row.player.name} · ${oneClick.row.player.team} · Ranking ${Math.round(oneClick.row.rankIndex)}/100`:'Kein automatisch verwendbarer Pick'}</span>
        <small>{oneClick.message} Eigene, aktuell synchronisierte Karte ist Pflicht; als hochriskant eingestufte Spieler werden übersprungen.</small>
      </div>
      <button type="button" className="v38-mission-pick-button" onClick={doOneClick} disabled={!oneClick.row}
        title="Übernimmt den besten ausreichend geprüften eigenen Spieler in deinen manuellen Builder; sendet keine Mission an Sorare">
        ⚡ Besten eigenen Spieler übernehmen
      </button>
      {!verifiedOwned&&onGoCollection&&<button type="button" className="v38-mission-collection-button" onClick={onGoCollection}>Sammlung synchronisieren ↗</button>}
    </div>
    {notice&&<p role="status" className="v38-mission-feedback">{notice}</p>}
    {ownedOnly&&!verifiedOwned&&<p className="v36-mission-warning">{sport==='football'?'Fußball: Das aktuelle Sorare-Set ist noch nicht verifiziert. Bitte die Sammlung synchronisieren. Alte Sets gelten niemals als gültiger Besitz.':'„Nur meine Karten“ ist noch nicht durch einen aktuellen Sorare-Sync verifiziert.'}</p>}
    {sport==='nba'&&nbaSchedule.status!=='available'&&<p className="v36-mission-warning">Der NBA-Spielplan ist nicht bestätigt verfügbar. Ohne verifizierte Ansetzungen gibt es keine Picks.</p>}
    {(!availabilitySnapshot||availabilitySnapshot.status==='unavailable')&&<p className="v38-mission-status-warning">Mission Safety: Verletzungsstatus nicht aktuell bestätigt. „Prüfen“ bedeutet nicht einsatzsicher. Kein zusätzlicher Datenanbieter nötig.</p>}
    {audit&&<div className="v38-mission-audit" aria-label="Mission Safety Prüfbericht"><strong>✓ Mission Safety</strong>
      <span>{ranked.length} Kandidaten bewertet</span>
      <span>{audit.withoutFixture} ohne passendes Spiel</span>
      <span>{audit.injuredOrOut} verletzt / OUT</span>
      {sport==='nba'&&<span>{audit.missingL10} ohne offizielles L10</span>}
      {audit.notOwned>0&&<span>{audit.notOwned} nicht in Sammlung</span>}
    </div>}
    <div className="v36-mission-groups">
      {sections.map(section=>{
        const data=ranked.filter(r=>r.kind===section.kind).slice(0,6);
        return <div className="v36-mission-group" key={section.kind}>
          <div className="v36-mission-group-head"><strong>{section.title}</strong><small>{data.length} Vorschläge</small></div>
          {data.length?data.map((row,i)=><CandidateCard key={row.player.id} row={row} index={i} isOwned={verifiedOwned&&ownedIds.has(row.player.id)} onOpenPlayer={onOpenPlayer} onSendToBuilder={onSendToBuilder}/>)
            :<p className="v36-mission-empty">Keine passenden Spieler mit bestätigtem Spiel und ausreichenden Daten. Prüfe Zeitraum, Ligaauswahl oder den Kartenfilter.</p>}
        </div>;
      })}
    </div>
    <div className="v36-mission-footer">
      <strong>Wichtig:</strong> Ranking* und Risikoindex sind heuristische Vergleichswerte, <strong>keine kalibrierten Erfolgs- oder Verletzungswahrscheinlichkeiten</strong>. OUT-Spieler sind ausgeschlossen. {sport==='nba'
        ?'Ziel = max(20, L10 + 7), bezogen auf offizielle Sorare-Managerpunkte. Historische Treffer sind keine Garantie.'
        :'Der kostenlose aktuelle Feed liefert keine separaten Tor-, Assist-, Torlinienklärungs-, Elfmeter- oder Clean-Sheet-Statistiken. Die Feldspieler- und Torhüter-Ranglisten sind daher vorsichtige Näherungen anhand vorhandener Form-, Prognose-, Einsatz- und optionaler xG/xA-Daten.'}
      {' '}One-Click und „+ Builder“ erstellen nur eine lokale Vorauswahl. Es wird nichts automatisch bei Sorare eingereicht.
    </div>
  </section>;
}

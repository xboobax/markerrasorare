"use client";

import {useEffect,useMemo,useState} from 'react';
import type {Sport} from '@/lib/model';
import type {ScheduleData} from '@/lib/gameweek-center';
import {offsetBerlinDay} from '@/lib/builder-pool';
import {missionDescription,rankDailyMissionPlayers,type DailyMissionCandidate,type MissionWindow,type MissionRow} from '@/lib/daily-mission';

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
  active?:boolean;
};
const fmt=(n:number)=>n.toLocaleString('de-DE',{maximumFractionDigits:1,minimumFractionDigits:1});
function CandidateCard({row,index,onOpenPlayer,onSendToBuilder}:{
  row:MissionRow;index:number;onOpenPlayer:(id:string)=>void;onSendToBuilder:(id:string)=>void;
}){
  const p=row.player;
  return <article className="v36-mission-row">
    <span className="v36-mission-rank">#{index+1}</span>
    <div className="v36-mission-player">
      <button type="button" onClick={()=>onOpenPlayer(p.id)}>{p.name} ↗</button>
      <small>{p.team} · {p.position} · Einsatzmodell {Math.round(p.playProb*100)}%</small>
      {p.nextGame&&<small>{p.nextGame}</small>}
      {row.kind==='nba'
        ?<small>Offizielles L10: {fmt(row.l10!)} · Ziel: <strong>{fmt(row.threshold!)} Pkt.</strong> · Prognoseabstand: <strong>{row.forecastMargin!>=0?'+':''}{fmt(row.forecastMargin!)}</strong></small>
        :<small>{row.reason}</small>}
      {row.kind==='nba'&&<small>{row.historicalGames?`${row.historicalHits}/${row.historicalGames} vergangene Scores ≥ Ziel`:'Keine Einzelscores · Ranking aus Prognose und Streuung'}</small>}
      <small className="v37-data-quality">Datenbasis: {row.quality==='history'?"L10 + historische Scores":row.quality==='partial'?"Scores + optionale Scouting-Daten":"heuristisch · eingeschränkt"}</small>
    </div>
    <div className="v36-mission-score"><strong>{Math.round(row.rankIndex)}</strong><small>Ranking*</small></div>
    <button type="button" className="v36-mission-add" onClick={()=>onSendToBuilder(p.id)} title="In den manuellen Builder übernehmen; keine Sorare-Daily-Abgabe">+ Builder</button>
  </article>;
}
export default function DailyMissionPicker({sport,players,nbaSchedule,ownedIds,excludedIds,onOpenPlayer,onSendToBuilder,scope,verifiedOwned,active=true}:Props){
  const [windowMode,setWindowMode]=useState<MissionWindow>(sport==='nba'?'next24':'today');
  const [ownedOnly,setOwnedOnly]=useState(false);
  const [now,setNow]=useState<Date|null>(null);
  // Refresh the time window whenever the dedicated tab becomes visible.
  useEffect(()=>{if(active)setNow(new Date());},[sport,active]);
  useEffect(()=>{setWindowMode(sport==='nba'?'next24':'today');},[sport]);
  const ranked=useMemo(()=>now?rankDailyMissionPlayers(players,{sport,window:windowMode,now,nbaSchedule,ownedOnly,ownedIds,excludedIds}):[],
    [players,sport,windowMode,now,nbaSchedule,ownedOnly,ownedIds,excludedIds]);
  const sections=sport==='football'?[{title:'Feldspieler · entscheidende Aktion',kind:'field' as const},{title:'Torhüter · Clean Sheet / Elfmeter',kind:'goalkeeper' as const}]:[{title:'Beste NBA Daily Picks',kind:'nba' as const}];
  const missingL10=sport==='nba'?players.filter(p=>p.averageL10===null||p.averageL10===undefined).length:0;
  const labelDay=now?offsetBerlinDay(now,windowMode==='tomorrow'?1:0):'—';
  return <section className="panel v36-mission" id="daily-mission-picker" aria-label="Daily Mission Picker">
    <div className="v36-mission-head"><div><span className="section-kicker">DAILY MISSION INTELLIGENCE · V3.7</span><h2>{sport==='nba'?'🏀 NBA Daily Picker':'⚽ Entscheidender-Spieler-Picker'}</h2><p>{missionDescription(sport)}</p></div><span className="v36-mission-source">Nur geladener Spielerpool</span></div>
    <div className="v36-mission-tools">
      <label>Spielzeitraum <select aria-label="Daily Mission Zeitraum" value={windowMode} onChange={e=>setWindowMode(e.target.value as MissionWindow)}>
        <option value="today">Heute (Berlin)</option><option value="tomorrow">Morgen (Berlin)</option>
        {sport==='nba'&&<option value="next24">Nächste 24 Stunden</option>}
      </select></label>
      <label className="v36-mission-owned"><input type="checkbox" checked={ownedOnly} onChange={e=>setOwnedOnly(e.target.checked)}/> Nur meine Karten</label>
      <button type="button" onClick={()=>setNow(new Date())}>↻ Aktualisieren</button>
      <small>{windowMode==='next24'?'Ab jetzt bis +24h':labelDay} · {scope}</small>
    </div>
    {ownedOnly&&!verifiedOwned&&<p className="v36-mission-warning">„Meine Karten“ basiert aktuell auf lokalen Markierungen. Für verifizierten Besitz die Sorare-Sammlung synchronisieren.</p>}
    {sport==='nba'&&nbaSchedule.status!=='available'&&<p className="v36-mission-warning">Der NBA-Spielplan ist nicht bestätigt verfügbar. Ohne verifizierte Ansetzungen werden keine Picks ausgegeben.</p>}
    {ranked.length>0&&<div className="v37-mission-spotlight"><strong>✦ Top Pick {sport==='nba'?'für NBA':'aus dem aktuellen Pool'}</strong><span>{ranked[0].player.name} · {ranked[0].player.team} · Ranking {Math.round(ranked[0].rankIndex)}/100</span><small>Nur Ranking innerhalb des geladenen Pools – keine garantierte Missions-Erfüllung.</small></div>}
    <div className="v36-mission-groups">
      {sections.map(section=>{
        const data=ranked.filter(r=>r.kind===section.kind).slice(0,6);
        return <div className="v36-mission-group" key={section.kind}>
          <div className="v36-mission-group-head"><strong>{section.title}</strong><small>{data.length} Vorschläge</small></div>
          {data.length?data.map((row,i)=><CandidateCard key={row.player.id} row={row} index={i} onOpenPlayer={onOpenPlayer} onSendToBuilder={onSendToBuilder}/>)
            :<p className="v36-mission-empty">Keine passenden Spieler mit bestätigtem Spiel und ausreichenden Daten. Prüfe Zeitraum, Ligaauswahl oder den Kartenfilter.</p>}
        </div>;
      })}
    </div>
    <div className="v36-mission-footer">
      <strong>Wichtig:</strong> Ranking* ist ein transparenter Vergleichsindex, keine kalibrierte Erfolgswahrscheinlichkeit. Verletzte/ausgeschlossene Spieler werden entfernt. {sport==='nba'
        ?`Ziel = max(20, L10 + 7). Bei ${missingL10} geladenen Spielern fehlt ein offizieller L10-Wert; diese werden nicht bewertet. Historische Treffer bedeuten keine sichere zukünftige Leistung; die endgültige Managerpunkte-Wertung richtet sich nach Sorare.`
        :'Für Tor, Assist, Klärung auf der Linie, gehaltenen Elfmeter und Clean Sheet liefert der aktuelle Feed keine separaten Ereignisstatistiken. Deshalb basiert diese Rangfolge ersatzweise auf Prognose, Form, Einsatzdaten und ggf. xG/xA; Torhüter und Feldspieler werden bewusst getrennt verglichen.'}
      {' '}„+ Builder“ überträgt nur den Spieler in dein lokales Team und gibt keine Mission bei Sorare ab.
    </div>
  </section>;
}

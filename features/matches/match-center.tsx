"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import type {Forecast,Sport} from "@/lib/model";
import type {ScheduleData} from "@/lib/gameweek-center";
import {canonicalNbaTeam} from "@/lib/nba-fixture-mapping";
import {sorarePlayerUrl} from "@/lib/sorare-profile";

type Game={id:string;date:string;tipoff?:string;home:string;away:string;origin:string};
const deDay=(date:string)=>new Date(`${date}T12:00:00Z`).toLocaleDateString("de-DE",{timeZone:"UTC",day:"2-digit",month:"2-digit",year:"numeric"});
const displayTime=(iso?:string)=>iso?new Date(iso).toLocaleTimeString("de-DE",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit"}):"Uhrzeit offen";
const fmt=(n:number)=>n.toLocaleString("de-DE",{maximumFractionDigits:1});
export function footballFixturesFromPlayers(players:Forecast[]):Game[]{
  const entries=new Map<string,Game>();
  for(const p of players){
    if(!p.nextGame||!/^(\d{4}-\d{2}-\d{2})\s+/.test(p.nextGame))continue;
    const date=p.nextGame.slice(0,10);
    const parts=p.nextGame.slice(11).split(" - ");
    if(parts.length!==2||!parts[0].trim()||!parts[1].trim())continue;
    const home=parts[0].trim(),away=parts[1].trim(),id=`football:${date}:${home}:${away}`;
    entries.set(id,{id,date,home,away,origin:"Sorare · nächstes Fixture"});
  }
  return [...entries.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
export default function MatchCenter({sport,players,schedule}:{sport:Sport;players:Forecast[];schedule:ScheduleData}){
  const fixtures=useMemo(()=>sport==="nba"?schedule.fixtures.map(f=>({id:f.id,date:f.date,tipoff:f.tipoff,home:f.home,away:f.away,origin:f.source??"Spielplan"})):footballFixturesFromPlayers(players),[sport,players,schedule]);
  const [selected,setSelected]=useState<string|null>(null),[showCourt,setShowCourt]=useState(false),[horizon,setHorizon]=useState("all");
  const today=new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"});
  const subset=useMemo(()=>fixtures.filter(g=>horizon==="all"||g.date===today).slice(0,140),[fixtures,horizon,today]);
  const game=subset.find(g=>g.id===selected)??subset[0]??null;
  const isRelevant=(p:Forecast,name:string)=>sport==="nba"?canonicalNbaTeam(p.team)===canonicalNbaTeam(name):p.team.toLocaleLowerCase("de-DE")===name.toLocaleLowerCase("de-DE");
  const forTeam=(name:string)=>game?players.filter(p=>isRelevant(p,name)).sort((a,b)=>b.weighted-a.weighted).slice(0,5):[];
  const home=game?forTeam(game.home):[],away=game?forTeam(game.away):[];
  return <section className="dream-match-layout">
    <div className="dream-match-list"><div className="dream-match-list-head"><h2>Spiele <span>{subset.length}</span></h2><select aria-label="Spielzeitraum" value={horizon} onChange={e=>{setHorizon(e.target.value);setSelected(null)}}><option value="all">Verfügbare Spiele</option><option value="today">Heute (Berlin)</option></select></div>
      <div className="dream-match-items">{subset.map(g=><button type="button" key={g.id} className={`dream-match-item ${game?.id===g.id?"selected":""}`} onClick={()=>{setSelected(g.id);setShowCourt(false)}}>
        <small>{deDay(g.date)} · {displayTime(g.tipoff)}</small><div><span>{g.home}</span><b>vs</b><span>{g.away}</span></div>
      </button>)}{!subset.length&&<p className="dream-empty">Für diesen Zeitraum wurden keine verifizierten Ansetzungen gefunden. Wir zeigen keine erfundenen Begegnungen.</p>}</div>
    </div>
    <div className="dream-match-detail">{game?<>
      <div className="dream-match-summary"><span className="dream-eyebrow">{sport==="nba"?"NBA":"FOOTBALL"} / MATCHUP</span><div className="dream-match-score"><strong>{game.home}</strong><span>VS</span><strong>{game.away}</strong></div><p>{deDay(game.date)} · {displayTime(game.tipoff)} · {game.origin}</p><small>Für kommende Spiele kein Ergebnisstatus aus den hier verfügbaren Daten abgeleitet.</small></div>
      <div className="dream-match-tools"><h3>Scouting-Vorschau</h3><button onClick={()=>setShowCourt(v=>!v)}>{showCourt?"Tabelle anzeigen":sport==="nba"?"Court-Vorschau":"Positions-Vorschau"}</button></div>
      <p className="dream-match-warning">Die folgenden Spieler sind <strong>keine bestätigten Startaufstellungen</strong>. Angezeigt werden die fünf höchsten verfügbaren Modellprognosen aus den geladenen Vereins-Kadern.</p>
      {showCourt?<div className={`dream-field ${sport==="nba"?"dream-court":"dream-pitch"}`}><div className="dream-midline"/><div className="dream-court-circle"/><div className="dream-team-preview"><div className="dream-lineup-preview">{home.map((p,i)=><div key={p.id} className={`dream-lineup-marker dream-marker-${i}`}><span>{p.imageUrl?<img src={p.imageUrl} loading="lazy" alt=""/>:"●"}</span><small>{p.name.split(" ").slice(-1)[0]}</small></div>)}</div><div className="dream-lineup-preview">{away.map((p,i)=><div key={p.id} className={`dream-lineup-marker dream-marker-${i}`}><span>{p.imageUrl?<img src={p.imageUrl} loading="lazy" alt=""/>:"●"}</span><small>{p.name.split(" ").slice(-1)[0]}</small></div>)}</div></div></div>:
        <div className="dream-match-scouting">{[{label:game.home,list:home},{label:game.away,list:away}].map(side=><div key={side.label}><h4>{side.label}</h4>{side.list.length?side.list.map(p=><div className="dream-scout-row" key={p.id}><span>{p.name}<small>{p.position} · {Math.round(p.playProb*100)} % Einsatzmodell</small></span><strong>{fmt(p.weighted)} PS</strong>{sorarePlayerUrl(sport,p.id)&&<a href={sorarePlayerUrl(sport,p.id)!} target="_blank" rel="noopener noreferrer" title="Sorare Profil">↗</a>}</div>):<p>Keine aktuellen Kaderspieler geladen.</p>}</div>)}</div>}
      <div className="dream-match-footer"><Link href={`/builder/${sport}`}>Im Builder analysieren ↗</Link><span>Quellenabhängige Vorschau · keine bestätigte Starting Five/Elf</span></div>
    </>:<div className="dream-match-empty"><h3>Kein Spiel ausgewählt</h3><p>Der verfügbare kostenlose Spielplan enthält für den aktuellen Filter keine Paarungen.</p><Link href={`/builder/${sport}`}>Zum Builder ↗</Link></div>}</div>
  </section>
}

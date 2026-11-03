"use client";

import type {Sport} from "@/lib/model";
import type {IntelligenceBoard,IntelligenceStyle} from "@/lib/arcade-intelligence";

type Props={
  sport:Sport;
  board:IntelligenceBoard;
  target:string;
  onTargetChange:(value:string)=>void;
  selectedKey:string|null;
  onSelect:(key:string)=>void;
};
const fmt=(n:number)=>Number.isFinite(n)?n.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1}):"—";
const icon:Record<IntelligenceStyle,string>={safe:"◈",balanced:"✦",upside:"◆",target:"◎"};
const order:Record<IntelligenceStyle,number>={safe:0,balanced:1,upside:2,target:3};

export default function ArcadeIntelligenceLab({sport,board,target,onTargetChange,selectedKey,onSelect}:Props){
  const recommended=board.variants.find(v=>v.key===board.recommendedKey);
  const preview=board.variants.find(v=>v.key===selectedKey);
  return <section className="intelligence-studio" aria-labelledby="intelligence-title" id="arcade-intelligence">
    <header className="intelligence-heading">
      <div><div className="intelligence-kicker"><span className="intelligence-live-dot"/> V2.2 · ARCADE INTELLIGENCE</div>
        <h3 id="intelligence-title">Bis zu vier Ansätze. <em>Dein Ziel.</em></h3>
        <p>Vergleiche echte, regelkonforme Lineup-Alternativen aus deinem geladenen Spielerpool. Wähle eine Variante, um sie darunter in der Aufstellung zu prüfen.</p>
      </div>
      <div className="intelligence-input-wrap"><label htmlFor="intelligence-target">DEIN ARCADE-PUNKTEZIEL</label><div><input type="number" id="intelligence-target" min="1" step="1" inputMode="numeric" value={target} placeholder="Punkteziel" onChange={e=>onTargetChange(e.target.value)}/><span>Pkt.</span></div></div>
    </header>
    {board.target===null&&<div className="intelligence-hint">◎ Trage ein Punkteziel ein, damit die zielorientierte Variante und ihre geschätzte Erreichungschance angezeigt werden.</div>}
    {board.variants.length>0?<>
      <div className="intelligence-scenarios" role="group" aria-label="Aufstellungsstrategien vergleichen">
        {board.variants.slice().sort((a,b)=>order[a.style]-order[b.style]).map(v=>{
          const selected=preview?.key===v.key;
          const recommended=board.recommendedKey===v.key;
          return <article key={v.key} className={`intelligence-scenario scenario-${v.style} ${selected?"is-selected":""}`}>
            <div className="intelligence-scenario-heading"><span className="intelligence-scenario-symbol" aria-hidden="true">{icon[v.style]}</span><span className="intelligence-scenario-label"><strong>{v.label}</strong><small>{v.subtitle}</small></span>{recommended&&<span className="intelligence-recommended">{board.target!==null?"Ziel-Favorit":"Score-Favorit"}</span>}</div>
            <div className="intelligence-scenario-total"><small>PROGNOSE</small><strong>{fmt(v.lineup.projectedScore)} <span>Pkt.</span></strong></div>
            <div className="intelligence-scenario-band"><span>Floor <b>{fmt(v.lineup.floorScore)}</b></span><span>Ceiling <b>{fmt(v.lineup.ceilingScore)}</b></span></div>
            {board.target!==null&&<div className="intelligence-probability"><div className="intelligence-probability-top"><span>Geschätzte Zielchance</span><strong>{v.lineup.targetProbability===null?"—":`${Math.round(v.lineup.targetProbability*100)} %`}</strong></div><div className="intelligence-probability-track"><span style={{width:`${Math.max(0,Math.min(100,Math.round((v.lineup.targetProbability??0)*100)))}%`}}/></div><small className={v.targetGap!==null&&v.targetGap>=0?"intelligence-above":"intelligence-below"}>{v.targetGap!==null&&v.targetGap>=0?`+${fmt(v.targetGap)} Punkte über Ziel`:`${fmt(Math.abs(v.targetGap??0))} Punkte unter Ziel`}</small></div>}
            <div className="intelligence-risk"><span>Risikoindex <b>{v.riskIndex}/100</b></span><div className="intelligence-risk-track"><i style={{width:`${v.riskIndex}%`}}/></div><small>{v.riskLabel} · {v.atRisk} Spieler mit erhöhtem Einsatzrisiko</small></div>
            <div className="intelligence-player-list">{v.lineup.picks.map((pick,i)=><div key={pick.player.id}><span>{i+1}</span><strong title={pick.player.name}>{pick.player.name}</strong><small>{sport==="nba"?`${fmt(pick.stars??0)} ★`:pick.slot}</small></div>)}</div>
            <button type="button" className="intelligence-preview-button" aria-pressed={selected} onClick={()=>onSelect(v.key)}>{selected?"✓ In Aufstellung ausgewählt":"Diese Aufstellung ansehen →"}</button>
          </article>;
        })}
      </div>
      <div className="intelligence-bottom"><div><strong>{board.variants.length} verschiedene Aufstellungen</strong><span>aus {board.availablePlayers} für den Builder geeigneten Spielern · {board.possibleCount} unterschiedliche Kandidaten geprüft</span></div><div><strong>{recommended?`Empfehlung: ${recommended.label}`:"Keine gültige Empfehlung"}</strong><span>{board.note}</span></div></div>
    </>:<div className="intelligence-empty">Für diesen Datenbereich ist momentan keine gültige automatische Aufstellung möglich. Kontrolliere NBA-Sterne, verfügbare Spieler, Fixierungen und den Kartenbesitz-Filter.</div>}
    <p className="intelligence-disclaimer">* Die Zielchance ist eine <strong>nicht kalibrierte Modellschätzung</strong>, der Risikoindex eine transparente Heuristik aus Einsatzwahrscheinlichkeit, Formstreuung, Datenlage und Teamüberschneidungen. Weder tatsächliche Verletzungsmeldungen noch offizielle Sorare-Gewinnchancen. Aktuelle NBA-Spielersterne können vom festgelegten Preis der konkreten Gameweek abweichen; Kartenbesitz und Wettbewerbseignung vor dem Einreichen prüfen.</p>
  </section>;
}

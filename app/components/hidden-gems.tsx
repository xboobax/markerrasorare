"use client";

import {useMemo,useState} from "react";
import {findHiddenGems,type GemCardSettings} from "@/lib/hidden-gems";
import type {Forecast,Sport} from "@/lib/model";

type Props={sport:Sport;players:Forecast[];cardStore:Record<string,GemCardSettings>;watchlist:string[];
 onOpenPlayer:(id:string)=>void;onAddPlayer:(id:string)=>void;onToggleFavorite:(id:string)=>void};
const fmt=(n:number)=>n.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1});
export default function HiddenGems({sport,players,cardStore,watchlist,onOpenPlayer,onAddPlayer,onToggleFavorite}:Props){
  const [ownedOnly,setOwnedOnly]=useState(false);
  const [position,setPosition]=useState("all");
  const [showAll,setShowAll]=useState(false);
  const result=useMemo(()=>findHiddenGems(players,sport,cardStore,{ownedOnly,position,limit:showAll?20:6}),[players,sport,cardStore,ownedOnly,position,showAll]);
  const positions=[...new Set(players.map(p=>p.position))].sort();
  return <section className="panel gem-center" id="hidden-gems">
    <div className="section-top gem-heading"><div><span className="section-kicker">V2.1 / DISCOVERY ENGINE</span><h2>Hidden Gems Finder <span className="gem-diamond">◆</span></h2><p>Entdecke interessante Kandidaten, die du sonst leicht übersiehst – transparent berechnet aus deinen geladenen Daten.</p></div><span className="gem-live">{result.eligible} AUSWERTBAR</span></div>
    <div className="gem-toolbar">
      <label>Position <select value={position} onChange={e=>setPosition(e.target.value)}><option value="all">Alle Positionen</option>{positions.map(p=><option value={p} key={p}>{p}</option>)}</select></label>
      <label className="gem-toggle"><input type="checkbox" checked={ownedOnly} onChange={e=>setOwnedOnly(e.target.checked)}/> Nur meine Karten</label>
      <span className="gem-meta">{sport==="nba"?"Rangfolge: erwartete Punkte / offizielle Sorare-Sterne (sonst manueller Fallback)":"Rangfolge: Form- und Stabilitätsindex"}</span>
    </div>
    {sport==="nba"&&result.missingStars>0&&<p className="gem-hint">★ {result.missingStars} Spieler ohne verfügbare offizielle oder manuell ergänzte Sterne bleiben aus dem Vergleich ausgeschlossen.</p>}
    <div className="gem-grid">
      {result.gems.map(g=><article className="gem-card" key={g.player.id}>
        <div className="gem-card-top"><span className="gem-rank">#{String(g.rank).padStart(2,"0")}</span><span className="gem-card-type">{g.owned?"MEINE KARTE":"ENTDECKUNG"}</span><button type="button" aria-label={`${g.player.name} ${watchlist.includes(g.player.id)?"aus Favoriten entfernen":"favorisieren"}`} aria-pressed={watchlist.includes(g.player.id)} onClick={()=>onToggleFavorite(g.player.id)} className="gem-heart">{watchlist.includes(g.player.id)?"★":"☆"}</button></div>
        <div className="gem-player">
          <span className="gem-photo"><span>{g.player.name.slice(0,2).toUpperCase()}</span>{g.player.imageUrl&&<img src={g.player.imageUrl} alt={`Spielerfoto von ${g.player.name}`} loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display="none";}}/>}</span>
          <div><button className="gem-player-name" type="button" onClick={()=>onOpenPlayer(g.player.id)}>{g.player.name} ↗</button><small>{g.player.team} · {g.player.position}</small></div>
        </div>
        <div className="gem-score-row"><div><small>GEM-WERT</small><strong>{fmt(g.value)}</strong><span>{sport==="nba"?"Punkte pro Stern":"Analyse-Index"}</span></div><div><small>PROGNOSE</small><strong>{fmt(g.player.weighted)}</strong><span>inkl. Einsatzrisiko</span></div></div>
        <ul className="gem-reasons">{g.reasons.map((reason,i)=><li key={i}>{reason}</li>)}</ul>
        <button type="button" className="gem-add" onClick={()=>onAddPlayer(g.player.id)}>+ In mein Lineup <span aria-hidden="true">↗</span></button>
      </article>)}
    </div>
    {!result.gems.length&&<div className="empty-state">Keine ausreichend belegten Kandidaten für diese Filter. {sport==="nba"?"Prüfe den Sterne-Sync oder deaktiviere den Kartenfilter.":"Wähle eine andere Position oder lade mehr Spieler."} Wir erfinden keine Hidden-Gem-Werte.</div>}
    {result.eligible>result.gems.length&&<button className="gem-more" type="button" onClick={()=>setShowAll(x=>!x)}>{showAll?"Weniger anzeigen":"Bis zu 20 Kandidaten anzeigen"} ↗</button>}
    <p className="gem-disclaimer">Keine Marktpreis-, Seltenheits- oder Besitzbewertung. NBA-Sterne stammen vorrangig direkt aus Sorare; manuell ergänzte Ersatzwerte können enthalten sein. Der Fußball-Analyse-Index ist kein offizieller Sorare-Score; fehlende Daten und mögliche DNPs werden nicht kaschiert.</p>
  </section>;
}

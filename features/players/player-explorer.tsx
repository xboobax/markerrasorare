"use client";
import Link from "next/link";
import {useDeferredValue,useEffect,useMemo,useRef,useState} from "react";
import type {Forecast,Sport} from "@/lib/model";
import {collectionKey,safeCollection,ownedSlugs} from "@/lib/my-collection";
import {sorarePlayerUrl} from "@/lib/sorare-profile";

type Sort="weighted"|"q80"|"l10"|"floor"|"ceiling"|"playProb";
const amount=(n:number|null|undefined,digits=1)=>typeof n==="number"&&Number.isFinite(n)?n.toLocaleString("de-DE",{maximumFractionDigits:digits}):"—";
const tableHeight=600,rowHeight=69,overscan=7;
const cols=9;
export default function PlayerExplorer({players,sport,error,info}:{players:Forecast[];sport:Sport;error:string;info:string}){
  const [search,setSearch]=useState(""),deferredSearch=useDeferredValue(search);
  const [position,setPosition]=useState("all"),[team,setTeam]=useState("all"),[sort,setSort]=useState<Sort>("weighted");
  const [onlyPlaying,setOnlyPlaying]=useState(false),[ownedOnly,setOwnedOnly]=useState(false),[verifiedIds,setVerifiedIds]=useState<Set<string>|null>(null);
  const [selected,setSelected]=useState<Forecast|null>(null),[scrollTop,setScrollTop]=useState(0);
  const list=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{
      try{
        const response=await fetch("/api/auth/sorare/status",{cache:"no-store"});
        const status=await response.json() as {connected?:boolean;slug?:string};
        if(!status.connected||!status.slug)return;
        const saved=safeCollection(JSON.parse(window.localStorage.getItem(collectionKey(status.slug))??"null"),status.slug);
        if(!saved?.complete)return;
        // Current set identity must be reconfirmed, not inferred from a past season.
        const check=await fetch("/api/collection",{cache:"no-store"});
        if(!check.ok)return;
        const current=await check.json() as {activeFootballSet?:{slug?:string}|null};
        if(sport==="football"&&(!current.activeFootballSet?.slug||current.activeFootballSet.slug!==saved.activeFootballSet?.slug))return;
        if(!cancelled)setVerifiedIds(new Set(ownedSlugs(saved,sport)));
      }catch { /* fail closed: unverified ownership is never presented as confirmed */ }
    };
    void load();return ()=>{cancelled=true};
  },[sport]);
  const positions=useMemo(()=>[...new Set(players.map(p=>p.position))].sort(),[players]);
  const teams=useMemo(()=>[...new Set(players.map(p=>p.team))].sort(),[players]);
  const visible=useMemo(()=>{
    const needle=deferredSearch.trim().toLocaleLowerCase("de-DE");
    const metric=(p:Forecast):number=>sort==="l10"?(p.last10Avg??-1):sort==="q80"?p.ceiling*p.playProb:sort==="floor"?p.floor*p.playProb:sort==="ceiling"?p.ceiling*p.playProb:sort==="playProb"?p.playProb:p.weighted;
    return players.filter(p=>(!needle||`${p.name} ${p.team} ${p.position}`.toLocaleLowerCase("de-DE").includes(needle))
      &&(position==="all"||p.position===position)&&(team==="all"||p.team===team)&&(!onlyPlaying||p.hasGame===true)
      &&(!ownedOnly||(verifiedIds!==null&&verifiedIds.has(p.id))))
      .sort((a,b)=>metric(b)-metric(a)||a.name.localeCompare(b.name,"de"));
  },[players,deferredSearch,position,team,sort,onlyPlaying,ownedOnly,verifiedIds]);
  useEffect(()=>{if(list.current)list.current.scrollTop=0;setScrollTop(0)},[sport,search,position,team,sort,onlyPlaying,ownedOnly]);
  const first=Math.max(0,Math.floor(scrollTop/rowHeight)-overscan);
  const count=Math.ceil(tableHeight/rowHeight)+overscan*2;
  const page=visible.slice(first,first+count),top=first*rowHeight,bottom=Math.max(0,(visible.length-first-page.length)*rowHeight);
  return <section className="dream-data-area">
    <div className="dream-filterbar"><label className="dream-search">⌕ <input aria-label="Spieler suchen" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Spieler oder Team suchen …"/></label>
      <label>Position <select aria-label="Position" value={position} onChange={e=>setPosition(e.target.value)}><option value="all">Alle Positionen</option>{positions.map(pos=><option key={pos} value={pos}>{pos}</option>)}</select></label>
      <label>Team <select aria-label="Team" value={team} onChange={e=>setTeam(e.target.value)}><option value="all">Alle Teams</option>{teams.map(name=><option key={name} value={name}>{name}</option>)}</select></label>
      <label>Sortierung <select aria-label="Sortierung" value={sort} onChange={e=>setSort(e.target.value as Sort)}><option value="weighted">Prognose</option><option value="q80">Upside *</option><option value="l10">L10</option><option value="floor">Floor *</option><option value="ceiling">Ceiling *</option><option value="playProb">Einsatzmodell *</option></select></label>
      <label className="dream-checkbox"><input type="checkbox" checked={onlyPlaying} onChange={e=>setOnlyPlaying(e.target.checked)}/>Nur bestätigtes Spiel</label>
      <label className="dream-checkbox" title={verifiedIds===null?"Bestätigter Sorare-Sync fehlt. Bitte Sammlung öffnen.":undefined}><input type="checkbox" disabled={verifiedIds===null} checked={ownedOnly} onChange={e=>setOwnedOnly(e.target.checked)}/>Nur meine Karten {verifiedIds===null?"(Sync nötig)":""}</label>
    </div>
    <div className="dream-table-meta"><strong>{visible.length.toLocaleString("de-DE")} Spieler</strong><span>{info||"Kostenlose Sorare-Daten"}</span>{error&&<span className="dream-error">{error}</span>}</div>
    <div className="dream-roster-scroll" ref={list} onScroll={e=>setScrollTop(e.currentTarget.scrollTop)} role="region" aria-label="Virtuelle Spieler-Tabelle" tabIndex={0}>
      <table className="dream-roster-table"><thead><tr><th>Spieler / Team</th><th>Position</th><th>Gegner</th><th>Form</th><th>Startmodell*</th><th>Prognose</th><th>L10</th><th>Floor*</th><th>Ceiling*</th></tr></thead><tbody>
        {top>0&&<tr className="dream-spacer" style={{height:top}}><td colSpan={cols}/></tr>}
        {page.map(p=><tr key={p.id} className="dream-roster-row"><td><div className="dream-player-cell">
          {sorarePlayerUrl(sport,p.id)?<a className="dream-avatar" href={sorarePlayerUrl(sport,p.id)!} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} bei Sorare öffnen`}>{p.imageUrl?<img src={p.imageUrl} loading="lazy" alt=""/>:p.name.slice(0,2)}</a>:<button type="button" className="dream-avatar" onClick={()=>setSelected(p)}>{p.imageUrl?<img src={p.imageUrl} loading="lazy" alt=""/>:p.name.slice(0,2)}</button>}
          <div>{sorarePlayerUrl(sport,p.id)?<a className="dream-player-details" href={sorarePlayerUrl(sport,p.id)!} target="_blank" rel="noopener noreferrer">{p.name}</a>:<button type="button" className="dream-player-details" onClick={()=>setSelected(p)}>{p.name}</button>}<small>{p.team}</small></div>
          <button type="button" className="dream-external-icon" onClick={()=>setSelected(p)} title="Interne Spieler-Analyse öffnen" aria-label={`Interne Analyse für ${p.name}`}>ⓘ</button>
        </div></td><td>{p.position}</td><td>{p.hasGame===false?"Kein Spiel":p.opponent??"Unbekannt"}</td><td><div className="dream-mini-bars" title="Historische Scores, nicht die nächsten Ergebnisse">{(p.recentScores??[]).slice(0,8).reverse().map((score,i)=><i key={i} style={{height:`${Math.max(4,Math.min(100,score))}%`}}/>)}</div></td><td>{amount(p.playProb*100,0)} %</td><td><span className="dream-score">{p.forecastSources.length?amount(p.weighted):"—"}</span></td><td>{amount(p.last10Avg)}</td><td>{amount(p.floor*p.playProb)}</td><td>{amount(p.ceiling*p.playProb)}</td></tr>)}
        {bottom>0&&<tr className="dream-spacer" style={{height:bottom}}><td colSpan={cols}/></tr>}
        {!visible.length&&<tr><td colSpan={cols} className="dream-empty">Keine Spieler für diese Filter. Entferne einen Filter oder wechsle die Liga.</td></tr>}
      </tbody></table>
    </div>
    <p className="dream-data-footnote">* Modellschätzung, keine bestätigte Startelf oder statistisch kalibrierte Trefferwahrscheinlichkeit. Bei fehlenden Score-Daten keine künstlichen Zahlen. <Link href={`/builder/${sport}`}>Zum Builder ↗</Link></p>
    {selected&&<div className="dream-profile-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setSelected(null)}}><section className="dream-profile" role="dialog" aria-modal="true" aria-label={`${selected.name} Spielerprofil`}>
      <div className="dream-profile-top"><span className="dream-eyebrow">PLAYER INSIGHTS</span><button type="button" onClick={()=>setSelected(null)} aria-label="Schließen">✕</button></div>
      <div className="dream-profile-identity">{selected.imageUrl?<img src={selected.imageUrl} alt=""/>:<span className="dream-avatar">{selected.name.slice(0,2)}</span>}<div><h2>{selected.name}</h2><p>{selected.team} · {selected.position}</p></div></div>
      <div className="dream-profile-metrics">{[{name:"Prognose",value:amount(selected.weighted)},{name:"L5",value:amount(selected.last5Avg)},{name:"L10",value:amount(selected.last10Avg)},{name:"Floor*",value:amount(selected.floor*selected.playProb)},{name:"Ceiling*",value:amount(selected.ceiling*selected.playProb)},{name:"Einsatzmodell*",value:`${amount(selected.playProb*100,0)} %`}].map(m=><div key={m.name}><small>{m.name}</small><strong>{m.value}</strong></div>)}</div>
      <h3>Historische Scores</h3><div className="dream-profile-scores">{selected.recentScores?.length?selected.recentScores.slice(0,10).map((v,i)=><div key={i}><span>{amount(v,0)}</span><i style={{height:`${Math.max(6,Math.min(100,v))}%`}}/></div>):<p>Keine Einzelscores verfügbar.</p>}</div>
      <p className="dream-data-footnote">Einsatz-, Floor- und Ceiling-Werte sind heuristische Modelle, keine Zusage für das nächste Spiel.</p>
      {sorarePlayerUrl(sport,selected.id)?<a className="dream-button-gold" target="_blank" rel="noopener noreferrer" href={sorarePlayerUrl(sport,selected.id)!}>Offizielles Sorare-Profil öffnen ↗</a>:<p>Kein verifizierbarer Spieler-Slug für einen direkten Sorare-Link vorhanden.</p>}
    </section></div>}
  </section>;
}

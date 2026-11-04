"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {collectionKey,safeCollection,type OwnedCollection,type OwnedSorareCard} from "@/lib/my-collection";
import type {Sport} from "@/lib/model";

type Status={configured:boolean;connected:boolean;slug?:string;nickname?:string;error?:string};
type Page={userSlug:string;cards:OwnedSorareCard[];totalCount:number;pageInfo:{hasNextPage:boolean;endCursor:string|null};fetchedAt:string;error?:string};
const fmtTime=(s:string)=>{try{return new Date(s).toLocaleString("de-DE",{dateStyle:"short",timeStyle:"short"});}catch{return "—";}};
export default function MySorareCollection({sport,onCollectionChange}:{sport:Sport;onCollectionChange:(v:OwnedCollection|null)=>void}){
  const [status,setStatus]=useState<Status|null>(null);
  const [collection,setCollection]=useState<OwnedCollection|null>(null);
  const [phase,setPhase]=useState<"idle"|"loading"|"ready">("idle");
  const [notice,setNotice]=useState("");
  const [showCards,setShowCards]=useState(false);
  const syncRef=useRef(false);
  const currentSlug=useRef("");
  const ownerCallback=useRef(onCollectionChange);ownerCallback.current=onCollectionChange;
  const sync=useCallback(async(userSlug:string)=>{
    if(syncRef.current||!userSlug)return;
    syncRef.current=true;setPhase("loading");setNotice("Karten werden seitenweise von Sorare eingelesen …");
    try{
      const cards:OwnedSorareCard[]=[];
      const seenCards=new Set<string>();
      const seenCursors=new Set<string>();
      let cursor:string|null=null;let lastCount=0;let complete=false;
      // Hard limit avoids uncontrolled requests. An incomplete sync never silently replaces proven ownership.
      for(let i=0;i<80;i++){
        const url=new URL("/api/collection",window.location.origin);
        if(cursor)url.searchParams.set("after",cursor);
        const res=await fetch(url.toString(),{cache:"no-store",credentials:"same-origin"});
        const page=await res.json() as Page;
        if(!res.ok)throw new Error(page.error||"Sorare-Karten konnten nicht abgerufen werden.");
        if(page.userSlug!==userSlug)throw new Error("Sorare-Konto hat sich geändert. Bitte erneut verbinden.");
        for(const card of page.cards||[]){if(card.assetId&&!seenCards.has(card.assetId)){cards.push(card);seenCards.add(card.assetId);}}
        lastCount=page.totalCount||cards.length;
        setNotice(`${cards.length} Karten gelesen${lastCount?` · ${lastCount} laut Sorare gesamt`:""} …`);
        if(!page.pageInfo?.hasNextPage){complete=true;break;}
        const next=page.pageInfo.endCursor;
        if(!next||seenCursors.has(next))throw new Error("Die Sorare-Paginierung liefert keinen neuen Cursor.");
        seenCursors.add(next);cursor=next;
        // The authenticated Sorare API is rate-limited: avoid a large burst.
        if(i>=5)await new Promise(resolve=>window.setTimeout(resolve,1200));
      }
      if(!complete)throw new Error("Die Sammlung ist größer als das sichere Abruflimit. Die bisherige Sammlung bleibt erhalten.");
      const fresh:OwnedCollection={slug:userSlug,cards,syncedAt:new Date().toISOString(),complete:true};
      if(currentSlug.current!==userSlug)return;
      try{window.localStorage.setItem(collectionKey(userSlug),JSON.stringify(fresh));}catch{}
      setCollection(fresh);ownerCallback.current(fresh);setNotice(`${cards.length} NBA-/Fußballkarten erfolgreich synchronisiert.`);
    }catch(e){setNotice(e instanceof Error?e.message:"Synchronisierung fehlgeschlagen. Vorheriger Bestand bleibt erhalten.");}
    finally{syncRef.current=false;setPhase("ready");}
  },[]);
  useEffect(()=>{
    let ignore=false;
    fetch("/api/auth/sorare/status",{cache:"no-store"}).then(async r=>r.json() as Promise<Status>).then(data=>{
      if(ignore)return;setStatus(data);
      if(!data.connected||!data.slug){currentSlug.current="";setCollection(null);ownerCallback.current(null);return;}
      currentSlug.current=data.slug;
      let cached:OwnedCollection|null=null;
      try{cached=safeCollection(JSON.parse(window.localStorage.getItem(collectionKey(data.slug))||"null"),data.slug);}catch{}
      if(cached){setCollection(cached);ownerCallback.current(cached);setNotice("Gespeicherte Sammlung geladen. Neue Synchronisierung läuft …");}
      void sync(data.slug);
    }).catch(()=>{if(!ignore)setNotice("Sorare-Login-Status gerade nicht erreichbar.");});
    return ()=>{ignore=true;};
  },[sync]);
  useEffect(()=>{
    if(!status?.connected||!status.slug)return;
    const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void sync(status.slug!);},15*60*1000);
    return ()=>window.clearInterval(timer);
  },[status,sync]);
  const disconnect=async()=>{
    if(!window.confirm("Sorare-Konto trennen und den lokalen Sammlungsindex in diesem Browser löschen?"))return;
    try{await fetch("/api/auth/sorare/disconnect",{method:"POST",credentials:"same-origin"});}finally{
      if(status?.slug){try{window.localStorage.removeItem(collectionKey(status.slug));}catch{}}
      currentSlug.current="";setStatus({configured:true,connected:false});setCollection(null);ownerCallback.current(null);setNotice("Verbindung getrennt. Manuelle Kartenmarkierungen bleiben erhalten.");
    }
  };
  const sportCards=collection?.cards.filter(card=>card.sport===(sport==="nba"?"NBA":"FOOTBALL"))||[];
  const playerCount=new Set(sportCards.map(c=>c.playerSlug)).size;
  const verifiedBonusCount=sportCards.filter(c=>typeof c.bonusPercent==="number").length;
  return <section className="panel v28-collection" id="meine-karten" aria-label="Meine Sorare-Kartensammlung">
    <div className="section-top"><div><span className="section-kicker">MY SORARE COLLECTION / V2.8</span><h2>Meine Karten synchronisieren</h2></div>
      <span className={`v28-pill ${status?.connected?"connected":""}`}>{status?.connected?"● Mit Sorare verbunden":"○ Nicht verbunden"}</span></div>
    {status?.connected?<>
      <p>Angemeldet als <strong>{status.nickname||status.slug}</strong>. Der Zugang bleibt in einem verschlüsselten, HTTP-only-Cookie auf deiner Domain. Dein Sorare-Passwort wird hier nie eingegeben.</p>
      <div className="v28-metrics"><div><small>Meine {sport==="nba"?"NBA":"Fußball"}-Karten</small><strong>{sportCards.length}</strong></div><div><small>Verschiedene Spieler</small><strong>{playerCount}</strong></div><div><small>Letzter vollständiger Sync</small><strong>{collection?.complete?fmtTime(collection.syncedAt):"Noch keiner"}</strong></div></div>
      <div className="v28-buttons"><button type="button" disabled={phase==="loading"} onClick={()=>status.slug&&void sync(status.slug)}>↻ {phase==="loading"?"Synchronisiere …":"Jetzt synchronisieren"}</button><button type="button" onClick={()=>setShowCards(v=>!v)} disabled={!sportCards.length}>{showCards?"Karten verbergen":"Sammlung anzeigen"}</button><button type="button" className="v28-disconnect" onClick={()=>void disconnect()}>Sorare trennen</button></div>
      {collection?.complete&&<p className="v28-note">✓ Nur meine Karten verwendet den synchronisierten Bestand. <strong>{verifiedBonusCount}/{sportCards.length} Karten</strong> mit offiziell auslesbarem Bonus (auch 0 % ist gültig). Bonuswerte werden beim nächsten Sync aktualisiert; keine doppelten Captain-Boni.</p>}
      {showCards&&<div className="v28-card-list">{sportCards.slice(0,120).map(card=><div key={card.assetId} className="v28-card-line"><span>{card.playerName||card.playerSlug}</span><small>{card.rarity} · {card.seasonYear||"—"} · #{card.serialNumber||"—"} · {typeof card.bonusPercent==="number"?`+${card.bonusPercent.toLocaleString("de-DE")} % Bonus (Sorare)`:"Bonus nicht verfügbar"}{card.grade!==undefined&&card.grade!==null?` · Level ${card.grade}`:""}</small></div>)}{sportCards.length>120&&<p>Nur die ersten 120 Karten dargestellt. Alle sind in der Synchronisierung enthalten.</p>}</div>}
    </>:<>
      <p>Verbinde deine eigene NBA- und Fußballkartensammlung sicher über Sorare OAuth. Erst nach einer vollständigen Synchronisierung ersetzt der tatsächliche Bestand die bisherigen manuellen Besitzmarkierungen.</p>
      <div className="v28-buttons">{status===null?<span className="v28-disabled">Verbindung wird geprüft …</span>:status.configured?<a className="v28-login" href="/api/auth/sorare/start">🔐 Mit Sorare verbinden</a>:<span className="v28-disabled">Login muss noch in Vercel eingerichtet werden (siehe UPDATE_V2_8_DE.md).</span>}</div>
    </>}
    {notice&&<p className="v28-status" role="status">{notice}</p>}
    <p className="v28-note">Eine unvollständige oder fehlgeschlagene Synchronisierung löscht keine bisherigen Kartendaten. Die lokalen Aufstellungen und das Prediction Lab bleiben unabhängig davon bestehen.</p>
  </section>;
}

"use client";
import {memo,useCallback,useEffect,useRef,useState} from "react";
import {activeCollectionCards,collectionKey,safeCollection,type OwnedCollection,type OwnedSorareCard} from "@/lib/my-collection";
import {rememberVerifiedCollection,recentVerifiedCollection,forgetVerifiedCollection,shouldRetryCollectionResponse,collectionRetryDelayMs,shareCollectionSync,cancelSharedCollectionSync} from "@/lib/collection-sync-session";
import type {Sport} from "@/lib/model";

type Status={configured:boolean;connected:boolean;slug?:string;nickname?:string;error?:string};
type Page={userSlug:string;cards:OwnedSorareCard[];totalCount:number;pageInfo:{hasNextPage:boolean;endCursor:string|null};fetchedAt:string;activeFootballSet:{slug:string;name:string}|null;error?:string};
export type CollectionSyncStatus={phase:"checking"|"syncing"|"ready"|"error"|"disconnected";message:string};
const fmtTime=(s:string)=>{try{return new Date(s).toLocaleString("de-DE",{dateStyle:"short",timeStyle:"short"});}catch{return "—";}};
const pause=(ms:number)=>new Promise<void>(resolve=>window.setTimeout(resolve,ms));
async function readCollectionPage(url:string,signal:AbortSignal):Promise<Page>{
  for(let attempt=0;attempt<3;attempt++){
    const res=await fetch(url,{cache:"no-store",credentials:"same-origin",signal});
    const payload=await res.json().catch(()=>null) as Page|null;
    const error=payload?.error||`Sorare-Kartenabruf fehlgeschlagen (HTTP ${res.status}).`;
    if(res.ok){
      if(!payload||!Array.isArray(payload.cards)||typeof payload.pageInfo?.hasNextPage!=="boolean")
        throw new Error("Sorare hat eine unvollständige Kartenseite geliefert. Der Sync wurde nicht bestätigt.");
      return payload;
    }
    if(attempt<2&&shouldRetryCollectionResponse(res.status,error)){
      const retryAfter=res.headers.get("Retry-After");
      const retrySeconds=retryAfter&&/^\d+$/.test(retryAfter)?Number(retryAfter):null;
      await pause(collectionRetryDelayMs(attempt,retrySeconds));
      if(signal.aborted)throw new Error("Synchronisierung abgebrochen.");
      continue;
    }
    throw new Error(error);
  }
  throw new Error("Sorare hat auch nach mehreren Versuchen nicht geantwortet.");
}
function MySorareCollection({sport,onCollectionChange,onSyncStatus}:{sport:Sport;onCollectionChange:(v:OwnedCollection|null)=>void;onSyncStatus?:(v:CollectionSyncStatus)=>void}){
  const [status,setStatus]=useState<Status|null>(null);
  const [collection,setCollection]=useState<OwnedCollection|null>(null);
  const [phase,setPhase]=useState<"idle"|"loading"|"ready"|"error">("idle");
  const [notice,setNotice]=useState("");
  const [showCards,setShowCards]=useState(false);
  const syncRef=useRef(false);
  const currentSlug=useRef("");
  const ownerCallback=useRef(onCollectionChange);ownerCallback.current=onCollectionChange;
  const statusCallback=useRef(onSyncStatus);statusCallback.current=onSyncStatus;
  const report=(value:CollectionSyncStatus)=>statusCallback.current?.(value);
  const sync=useCallback(async(userSlug:string,force=false)=>{
    if(syncRef.current||!userSlug)return;
    const recent=recentVerifiedCollection(userSlug);
    if(recent&&!force){
      setCollection(recent);ownerCallback.current(recent);
      setPhase("ready");report({phase:"ready",message:`${recent.cards.length} Karten aus dieser Sitzung bestätigt.`});
      return;
    }
    syncRef.current=true;
    setPhase("loading");setNotice("Karten werden seitenweise von Sorare eingelesen …");
    report({phase:"syncing",message:"Sorare-Kartensammlung wird vollständig geladen …"});
    // A proven, recent sync remains usable while a manual refresh runs.
    // An expired cache is visible but CANNOT verify ownership or current Football Set.
    if(!recent){
      setCollection(previous=>{
        if(previous?.slug!==userSlug||!previous.complete)return previous;
        const unverified={...previous,complete:false};ownerCallback.current(unverified);
        return unverified;
      });
    }
    try{
      const fresh=await shareCollectionSync(userSlug,async(signal)=>{
      const cards:OwnedSorareCard[]=[];
      const seenCards=new Set<string>();
      const seenCursors=new Set<string>();
      let cursor:string|null=null;let lastCount=0;let complete=false;let activeFootballSet:{slug:string;name:string}|null|undefined;
      // 240 pages of 50 cards supports large collections without endless requests.
      for(let i=0;i<240;i++){
        if(signal.aborted)throw new Error("Synchronisierung abgebrochen.");
        const url=new URL("/api/collection",window.location.origin);
        if(cursor)url.searchParams.set("after",cursor);
        const page=await readCollectionPage(url.toString(),signal);
        if(page.userSlug!==userSlug)throw new Error("Sorare-Konto hat sich geändert. Bitte erneut verbinden.");
        if(!Object.prototype.hasOwnProperty.call(page,"activeFootballSet"))throw new Error("Aktuelles Fußball-Set konnte nicht bestätigt werden. Bestand nicht überschrieben.");
        if(activeFootballSet===undefined)activeFootballSet=page.activeFootballSet;
        else if(activeFootballSet?.slug!==page.activeFootballSet?.slug)throw new Error("Sorare hat während der Synchronisierung das aktive Set gewechselt. Bitte erneut synchronisieren.");
        for(const card of page.cards){if(card.assetId&&!seenCards.has(card.assetId)){cards.push(card);seenCards.add(card.assetId);}}
        lastCount=page.totalCount||cards.length;
        if(i===0||i%5===4||!page.pageInfo.hasNextPage)setNotice(`${cards.length} Karten gelesen${lastCount?` · ${lastCount} laut Sorare gesamt`:""} …`);
        if(page.pageInfo.hasNextPage===false){complete=true;break;}
        const next=page.pageInfo.endCursor;
        if(!next||seenCursors.has(next))throw new Error("Die Sorare-Paginierung liefert keinen neuen Cursor.");
        seenCursors.add(next);cursor=next;
        // API limit: authenticated Sorare requests are rate-limited.
        if(i>=4)await pause(1250);
      }
      if(signal.aborted)throw new Error("Synchronisierung abgebrochen.");
      if(!complete)throw new Error("Die Sammlung überschreitet das sichere Abruflimit (12.000 Karten). Alter Bestand bleibt erhalten.");
      return {slug:userSlug,cards,syncedAt:new Date().toISOString(),complete:true,bonusVersion:2,activeFootballSet:activeFootballSet??null} as OwnedCollection;
      });
      if(currentSlug.current!==userSlug)return;
      rememberVerifiedCollection(fresh);
      const cards=fresh.cards;
      try{window.localStorage.setItem(collectionKey(userSlug),JSON.stringify(fresh));}catch{}
      setCollection(fresh);ownerCallback.current(fresh);
      setPhase("ready");
      const message=`${cards.length} Karten synchronisiert. ${activeCollectionCards(fresh,"football").length} Fußballkarten aus ${fresh.activeFootballSet?.name??"keinem aktiven Set"} verwendbar.`;
      setNotice(message);report({phase:"ready",message});
    }catch(e){
      if(currentSlug.current!==userSlug)return;
      const message=e instanceof Error?e.message:"Synchronisierung fehlgeschlagen. Vorheriger Bestand bleibt erhalten.";
      setNotice(`Sync-Fehler: ${message}`);setPhase("error");report({phase:"error",message});
    }finally{
      syncRef.current=false;
    }
  },[]);
  useEffect(()=>{
    let ignore=false;
    const controller=new AbortController();
    report({phase:"checking",message:"Sorare-Verbindung wird geprüft …"});
    fetch("/api/auth/sorare/status",{cache:"no-store",credentials:"same-origin",signal:controller.signal})
      .then(async r=>{
        const data=await r.json() as Status;
        if(!r.ok)throw new Error(data.error||"Sorare-Login-Status nicht erreichbar.");
        return data;
      }).then(data=>{
        if(ignore)return;
        setStatus(data);
        if(!data.connected||!data.slug){
          currentSlug.current="";setCollection(null);ownerCallback.current(null);
          report({phase:data.error?"error":"disconnected",message:data.error||"Nicht mit Sorare verbunden."});
          if(data.error)setNotice(data.error);
          return;
        }
        currentSlug.current=data.slug;
        const recent=recentVerifiedCollection(data.slug);
        if(recent){
          // Only the same authenticated slug can use a full sync done in this tab.
          setCollection(recent);ownerCallback.current(recent);setPhase("ready");
          report({phase:"ready",message:`${recent.cards.length} Karten bestätigt.`});
          return;
        }
        let cached:OwnedCollection|null=null;
        try{cached=safeCollection(JSON.parse(window.localStorage.getItem(collectionKey(data.slug))||"null"),data.slug);}catch{}
        if(cached){
          // A previous browser visit does NOT revalidate the current Football Set.
          const unverified={...cached,complete:false};
          setCollection(unverified);ownerCallback.current(unverified);
          setNotice("Gespeicherter Bestand gefunden. Sorare-Besitz und aktuelles Set werden erneut geprüft …");
        }
        void sync(data.slug);
      }).catch(e=>{
        if(ignore)return;
        const message=e instanceof Error?e.message:"Sorare-Login-Status gerade nicht erreichbar.";
        setNotice(message);setPhase("error");report({phase:"error",message});
      });
    // Do not cancel card pagination merely because the user switches V4 pages.
    // The next page awaits the same in-flight, account-scoped sync.
    return ()=>{ignore=true;controller.abort();};
  },[sync]);
  useEffect(()=>{
    if(!status?.connected||!status.slug)return;
    const timer=window.setInterval(()=>{
      if(document.visibilityState==="visible")void sync(status.slug!);
    },15*60*1000);
    return ()=>window.clearInterval(timer);
  },[status,sync]);
  const disconnect=async()=>{
    if(!window.confirm("Sorare-Konto trennen und den lokalen Sammlungsindex in diesem Browser löschen?"))return;
    try{await fetch("/api/auth/sorare/disconnect",{method:"POST",credentials:"same-origin"});}finally{
      if(status?.slug){
        forgetVerifiedCollection(status.slug);
        try{window.localStorage.removeItem(collectionKey(status.slug));}catch{}
      }
      if(status?.slug)cancelSharedCollectionSync(status.slug);
      currentSlug.current="";setStatus({configured:true,connected:false});setCollection(null);ownerCallback.current(null);
      setNotice("Verbindung getrennt. Manuelle Kartenmarkierungen bleiben erhalten.");setPhase("idle");
      report({phase:"disconnected",message:"Sorare-Verbindung getrennt."});
    }
  };
  const sportCards=activeCollectionCards(collection,sport);
  const hiddenFootballCards=sport==="football"?(collection?.cards.filter(card=>card.sport==="FOOTBALL").length??0)-sportCards.length:0;
  const playerCount=new Set(sportCards.map(c=>c.playerSlug)).size;
  const verifiedBonusCount=sportCards.filter(c=>typeof c.bonusPercent==="number").length;
  return <section className="panel v28-collection" id="meine-karten" aria-label="Meine Sorare-Kartensammlung">
    <div className="section-top"><div><span className="section-kicker">MARKERRAS SORARE DREAM / V4.0.2</span><h2>Meine Karten synchronisieren</h2></div>
      <span className={`v28-pill ${status?.connected?"connected":""}`}>{status?.connected?"● Mit Sorare verbunden":"○ Nicht verbunden"}</span></div>
    {status?.connected?<>
      <p>Angemeldet als <strong>{status.nickname||status.slug}</strong>. Der Zugang bleibt in einem verschlüsselten, HTTP-only-Cookie auf deiner Domain. Dein Sorare-Passwort wird hier nie eingegeben.</p>
      <div className="v28-metrics"><div><small>Meine {sport==="nba"?"NBA":"aktuellen Set"}-Karten</small><strong>{sportCards.length}</strong></div><div><small>Verschiedene Spieler</small><strong>{playerCount}</strong></div><div><small>Letzter vollständiger Sync</small><strong>{collection?.complete?fmtTime(collection.syncedAt):"Noch keiner"}</strong></div></div>
      {sport==="football"&&<p className="v28-note" role="status">⚽ Aktuelles Fußball-Set: <strong>{collection?.activeFootballSet?.name??"noch nicht verifiziert"}</strong>. Nur Karten dieses Sets zählen als eigene Karten im Builder und Daily Mission Picker. {collection?.complete&&hiddenFootballCards>0?`${hiddenFootballCards} Karten aus alten Sets oder Pro-Karten ausgeblendet.`:""}</p>}
      <div className="v28-buttons"><button type="button" disabled={phase==="loading"} onClick={()=>status.slug&&void sync(status.slug,true)}>↻ {phase==="loading"?"Synchronisiere …":"Jetzt synchronisieren"}</button><button type="button" onClick={()=>setShowCards(v=>!v)} disabled={!sportCards.length}>{showCards?"Karten verbergen":"Sammlung anzeigen"}</button><button type="button" className="v28-disconnect" onClick={()=>void disconnect()}>Sorare trennen</button></div>
      {collection?.complete&&(sport==="nba"||!!collection.activeFootballSet?.slug)&&<p className="v28-note">✓ Nur meine Karten verwendet den synchronisierten Bestand des aktuell aktiven Sets (Fußball). <strong>{verifiedBonusCount}/{sportCards.length} Karten</strong> mit auslesbaren Kartenboni. Leere, wettbewerbsabhängige Sorare-Bonuslisten gelten nicht als bestätigte 0 %. Bonusse aus dem Sorare-Power-Breakdown werden beim nächsten Sync aktualisiert; Captain-Boni bleiben separat.</p>}
      {showCards&&<div className="v28-card-list">{sportCards.slice(0,120).map(card=><div key={card.assetId} className="v28-card-line"><span>{card.playerName||card.playerSlug}</span><small>{card.rarity} · {card.seasonYear||"—"} · #{card.serialNumber||"—"} · {typeof card.bonusPercent==="number"?`+${card.bonusPercent.toLocaleString("de-DE")} % Kartenbonus (Sorare)`:"Bonus nicht verfügbar"}{card.grade!==undefined&&card.grade!==null?` · Level ${card.grade}`:""}</small></div>)}{sportCards.length>120&&<p>Nur die ersten 120 Karten dargestellt. Alle sind in der Synchronisierung enthalten.</p>}</div>}
    </>:<>
      <p>Verbinde deine eigene NBA- und Fußballkartensammlung sicher über Sorare OAuth. Erst nach einer vollständigen Synchronisierung ersetzt der tatsächliche Bestand die bisherigen manuellen Besitzmarkierungen.</p>
      <div className="v28-buttons">{status===null?<span className="v28-disabled">Verbindung wird geprüft …</span>:status.configured?<a className="v28-login" href="/api/auth/sorare/start">🔐 Mit Sorare verbinden</a>:<span className="v28-disabled">Login muss noch in Vercel eingerichtet werden (siehe UPDATE_V2_8_DE.md).</span>}</div>
    </>}
    {notice&&<p className={`v28-status${phase==="error"?" v28-status-error":""}`} role={phase==="error"?"alert":"status"}>{notice}</p>}
    {status?.error&&<p className="v28-status v28-status-error" role="alert">{status.error}</p>}
    <p className="v28-note">Eine unvollständige oder fehlgeschlagene Synchronisierung löscht keine bisherigen Kartendaten. Die lokalen Aufstellungen und das Prediction Lab bleiben unabhängig davon bestehen.</p>
  </section>;
}

// Collection remains mounted for automatic sync, but unrelated builder updates
// must not re-render a large verified-card list.
export default memo(MySorareCollection);

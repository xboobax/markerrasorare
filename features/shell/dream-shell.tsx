"use client";
import Link from "next/link";
import {usePathname,useRouter,useSearchParams} from "next/navigation";
import {useEffect,useRef,useState} from "react";

const entries=[
  {href:"/",label:"Übersicht",icon:"▦"},
  {href:"/builder/football",label:"Football Builder",icon:"⚽"},
  {href:"/builder/nba",label:"NBA Builder",icon:"◉"},
  {href:"/daily-missions",label:"Daily Missions",icon:"✦"},
  {href:"/match-center",label:"Match Center",icon:"▤"},
  {href:"/players",label:"Player Database",icon:"⌕"},
  {href:"/collection",label:"Sammlung",icon:"▣"},
  {href:"/analytics",label:"Analytics",icon:"◫"},
  {href:"/guides",label:"Guides",icon:"?"},
] as const;
const routes=(sport:"football"|"nba")=>entries.map(e=>({
  ...e,href:e.href==="/builder/football"||e.href==="/builder/nba"?e.href:
    ["/daily-missions","/match-center","/players","/collection","/analytics"].includes(e.href)?`${e.href}?sport=${sport}`:e.href
}));
export default function DreamShell({children}:{children:React.ReactNode}){
  const pathname=usePathname(),query=useSearchParams(),router=useRouter();
  const sport: "football"|"nba"=pathname.startsWith("/builder/nba")||query.get("sport")==="nba"?"nba":"football";
  const [open,setOpen]=useState(false),[command,setCommand]=useState(false),[commandQuery,setCommandQuery]=useState("");
  const search=useRef<HTMLInputElement|null>(null);
  useEffect(()=>setOpen(false),[pathname]);
  useEffect(()=>{
    const handler=(event:KeyboardEvent)=>{
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){
        event.preventDefault();setCommand(value=>!value);
      }
      if(event.key==="Escape")setCommand(false);
    };
    document.addEventListener("keydown",handler);return ()=>document.removeEventListener("keydown",handler);
  },[]);
  useEffect(()=>{if(command)search.current?.focus();else setCommandQuery("");},[command]);
  const items=routes(sport);
  const active=(href:string)=>href==="/"?pathname==="/":pathname===href.split("?")[0];
  const filtered=items.filter(item=>`${item.label} ${item.href}`.toLowerCase().includes(commandQuery.toLowerCase()));
  return <div className="dream-frame">
    <aside className={`dream-sidebar ${open?"is-open":""}`} aria-label="Hauptnavigation">
      <Link href="/" className="dream-brand" aria-label="MarkErras Sorare Dream Startseite"><span className="dream-monogram">M<span>◆</span></span><span><strong>MarkErras</strong><small>SORARE DREAM <b>4.0.3</b></small></span></Link>
      <span className="dream-sidebar-label">WORKSPACE</span>
      <nav className="dream-nav">{items.map(item=><Link href={item.href} key={item.label} aria-current={active(item.href)?"page":undefined} className={active(item.href)?"active":""}><span className="dream-nav-icon" aria-hidden="true">{item.icon}</span>{item.label}</Link>)}</nav>
      <div className="dream-sidebar-foot"><span className="dream-online-dot"/> Kostenloser Datenmodus<br/><small>Sync über Sorare · kein Upstash nötig</small></div>
    </aside>
    {open&&<button className="dream-mobile-overlay" aria-label="Menü schließen" onClick={()=>setOpen(false)}/>}
    <div className="dream-body">
      <header className="dream-header"><button className="dream-menu" aria-label="Navigation öffnen" onClick={()=>setOpen(v=>!v)}>☰</button>
        <div className="dream-crumb">MARKERRAS <span>/</span> <strong>{items.find(i=>active(i.href))?.label??"Workspace"}</strong></div>
        <div className="dream-header-actions">
          <div className="dream-sport" aria-label="Sportart wählen"><Link className={sport==="football"?"selected":""} href={pathname.startsWith("/builder/")?"/builder/football":`${pathname}?sport=football`}>⚽ Fußball</Link><Link className={sport==="nba"?"selected":""} href={pathname.startsWith("/builder/")?"/builder/nba":`${pathname}?sport=nba`}>◉ NBA</Link></div>
          <button className="dream-command-trigger" type="button" onClick={()=>setCommand(true)} aria-label="Schnellaktionen öffnen">⌕ <span>Aktionen</span> <kbd>Ctrl K</kbd></button>
        </div>
      </header>
      <main className="dream-content" id="main-content">{children}</main>
    </div>
    {command&&<div className="dream-command-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setCommand(false)}}>
      <section className="dream-command-modal" role="dialog" aria-modal="true" aria-label="Schnellaktionen"><div className="dream-command-search">⌕ <input ref={search} value={commandQuery} onChange={e=>setCommandQuery(e.target.value)} placeholder="Seite oder Aktion suchen …"/><button onClick={()=>setCommand(false)}>Esc</button></div>
      <div className="dream-command-results">{filtered.map(item=><button type="button" key={item.label} onClick={()=>{setCommand(false);router.push(item.href)}}><span>{item.icon}</span>{item.label}<span className="dream-result-arrow">↗</span></button>)}{!filtered.length&&<p>Keine Aktion gefunden.</p>}</div>
      </section></div>}
  </div>;
}

import Link from "next/link";
import DreamTitle from "@/features/core/dream-title";
const cards=[
  {url:"/builder/football",icon:"⚽",title:"Football Set Builder",detail:"Positionen, Kartenbonus, Captain, Multi-Team und intelligente Optimierung.",meta:"Fußball"},
  {url:"/builder/nba",icon:"◉",title:"NBA Set Builder",detail:"Fünferteams, 16 Sterne, Value, Risiko und unterschiedliche Strategien.",meta:"NBA"},
  {url:"/daily-missions",icon:"✦",title:"Daily Mission Center",detail:"Fußball-Aktionen und NBA L10 + 7 direkt aus deiner Sammlung.",meta:"Missionen"},
  {url:"/match-center?sport=nba",icon:"▤",title:"NBA Live Match Center",detail:"Live-Spielstand, Play-by-Play, Starting Five und vorläufige Sorare-Wertung.",meta:"Live NBA"},
  {url:"/players",icon:"⌕",title:"Player Database",detail:"Schnelle, filterbare Spielerlisten mit Profilen und Formanalyse.",meta:"Scouting"},
  {url:"/collection",icon:"▣",title:"Meine Sammlung",detail:"Sorare-Sync, gültiges Football Set und Kartenboni.",meta:"Galerie"},
];
export default function Home(){return <>
  <DreamTitle eyebrow="WORKSPACE / V4.0" title="Deine Sorare-Zentrale" description="Builder, Scouting und Daily Missions – alles an einem Ort. Schwarz, Gold und bewusst ohne unnötige Ablenkung."/>
  <section className="dream-welcome"><div><span className="dream-eyebrow">MARKERRAS SORARE DREAM</span><h2>Weniger klicken. Besser aufstellen.</h2><p>Wähle einen Arbeitsbereich. Deine bisherigen lokalen Teams, Filter, Presets und die Sorare-Verbindung bleiben in den übernommenen Modulen erhalten.</p><div className="dream-hero-actions"><Link prefetch={false} className="dream-button-gold" href="/builder/football">Football Builder öffnen <span>↗</span></Link><Link prefetch={false} className="dream-button-quiet" href="/builder/nba">NBA Builder ↗</Link></div></div><div className="dream-welcome-emblem">M<span>◆</span></div></section>
  <div className="dream-dashboard-grid">{cards.map(item=><Link prefetch={false} href={item.url} key={item.title} className="dream-feature-card"><div className="dream-feature-heading"><span>{item.icon}</span><small>{item.meta}</small></div><h3>{item.title}</h3><p>{item.detail}</p><span className="dream-card-cta">Öffnen ↗</span></Link>)}</div>
  <div className="dream-info-line"><span>● <strong>Performance-First:</strong> Jede Arbeitsseite lädt nur die jeweils benötigten Ansichten.</span><span>Bestehende Version: <Link href="/legacy">V3.9.2 als Rückfallansicht ↗</Link></span></div>
</>}

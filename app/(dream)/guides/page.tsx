import Link from "next/link";
import DreamTitle from "@/features/core/dream-title";
const steps=[
  {title:"Spiele prüfen",description:"Im Match Center siehst du die anstehenden Begegnungen und bekannte Gegner. Nicht bestätigte Startformationen werden deutlich gekennzeichnet.",url:"/match-center",action:"Match Center öffnen"},
  {title:"Spieler scoutieren",description:"In der Player Database kannst du nach Team, Position, L10, Prognose und Einsatzmodell filtern. Name und Foto führen zum internen Profil, ↗ zu Sorare.",url:"/players",action:"Player Database öffnen"},
  {title:"Teams bauen",description:"Im Builder links aktive Teams verwalten, rechts Spieler auswählen. Team-Slots, Captain, NBA-Sternebudget und Kartenbonus gelten unverändert.",url:"/builder/football",action:"Football Builder öffnen"},
  {title:"Daily Missions auswählen",description:"Der Football Picker priorisiert entscheidende Aktionen. Der NBA Picker verwendet die Bedingung L10 + 7 und mindestens 20 Punkte.",url:"/daily-missions",action:"Daily Missions öffnen"},
  {title:"Galerie synchronisieren",description:"Unter Sammlung verbindest du Sorare und prüfst den aktiven Set-Bestand. Alte Football Sets bleiben archiviert, aber nicht aktiv.",url:"/collection",action:"Sammlung öffnen"},
];
const terms=[
  ["PS / PP","Prognostizierter Sorare-Score aus den verfügbaren Eingabedaten; keine garantierte Punktzahl."],
  ["Raw","Modell-Prognose ohne Kartenbonus und Captain-Zuschlag."],
  ["Q80 / Upside","Heuristischer hoher Wert des Prognosemodells. Ohne Rücktests keine kalibrierte 80-%-Zusage."],
  ["L5 / L10","Historischer durchschnittlicher Sorare-Score über die jeweils verfügbaren letzten 5 oder 10 Spiele."],
  ["Start / Einsatzmodell","Abgeleitete Wahrscheinlichkeit anhand Sorare-Status und Historie, nicht offiziell bestätigte Startelf."],
  ["Floor / Ceiling","Heuristische Bandbreite; bei Einsatz und Nicht-Einsatz unterschiedlich interpretieren."],
  ["NBA ★","Sorare-Sternebudget je Karte/Spieler. Im bestehenden NBA-Builder gilt maximal 16 Sterne, sofern der Wettbewerb dies verlangt."],
  ["Kartenbonus","Synchronisierter Kartenbonus der aktuell gültigen Karte, sofern von Sorare verfügbar; niemals pauschal auf alte Sets übertragen."],
  ["Mission Safety","Warnhinweise auf Basis vorhandener Meldungen und Datenqualität; fehlende Meldung ist keine Einsatzbestätigung."],
  ["G/A, CS %, DS %","Aktions-/Clean-Sheet-/Decisive-Werte dürfen nur als Prozentchance erscheinen, wenn eine belastbare Daten- und Kalibrierungsgrundlage existiert."],
];
export default function GuidesPage(){return <><DreamTitle eyebrow="DREAM / HANDBOOK" title="Guides & Werte erklärt" description="Die wichtigsten Abläufe und Kennzahlen – kurz, nachvollziehbar und direkt mit dem passenden Tool verknüpft."/>
  <div className="dream-steps">{steps.map((step,i)=><article key={step.title}><div className="dream-step-number">{i+1}</div><div><h3>{step.title}</h3><p>{step.description}</p><Link href={step.url}>{step.action} ↗</Link></div></article>)}</div>
  <section className="dream-guide-glossary"><div className="dream-section-heading"><h2>Werte erklärt</h2><p>Modellwerte sind von offiziellen Daten klar zu unterscheiden.</p></div><table><thead><tr><th>Wert</th><th>Bedeutung</th></tr></thead><tbody>{terms.map(([name,description])=><tr key={name}><th scope="row">{name}</th><td>{description}</td></tr>)}</tbody></table></section>
  <div className="dream-guide-callout"><strong>💛 Kostenfrei und datenehrlich</strong><p>MarkErras Sorare Dream verwendet bestehende kostenlose Quellen. Ohne valide xG-, G/A-, Team- oder Startelfdaten werden keine fiktiven Chancen gezeigt. Die historischen lokalen Daten bleiben auf deinem Browsergerät, solange kein zusätzlicher Speicherdienst verbunden wird.</p></div>
</>}

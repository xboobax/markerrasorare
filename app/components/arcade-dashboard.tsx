"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Forecast, Sport } from "@/lib/model";
import type { Strategy } from "@/lib/arcade";
import { optimizeArcadeLineups, isValidNbaStars, type CardInput } from "@/lib/arcade";
import { ARCADE } from "@/config/divination";
import type { Club } from "@/lib/sorare";

type CardSettings = { owned?: boolean; stars?: number | null; bonusPercent?: number; locked?: boolean; excluded?: boolean };
type CardStore = Record<string, CardSettings>;
type Props = {
  sport: Sport;
  league: string;
  leagues: string[];
  team: string;
  clubs: Club[];
  players: Forecast[];
  info: string;
  error: string;
};

const POS_LABEL: Record<string, string> = {
  GK: "Torwart", DEF: "Verteidiger", MID: "Mittelfeld", FWD: "Stürmer", FLEX: "Extra",
  G: "Guard", F: "Forward", C: "Center", ANY: "Freie Wahl",
};
const POS_SHORT: Record<string, string> = { GK: "TW", DEF: "VER", MID: "MF", FWD: "FWD", FLEX: "EX", ANY: "NBA" };
const fmt = (n: number) => Number.isFinite(n) ? n.toLocaleString("de-DE", {maximumFractionDigits: 1, minimumFractionDigits: 1}) : "—";
const makeLink = (pairs: Record<string, string | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(pairs)) if (v) q.set(k, v);
  return "/?" + q.toString();
};
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join("");
const starOptions = Array.from({length: 9}, (_, i) => i / 2 + 1);
const bonuses = [0, 5, 10, 15, 20, 25, 30];

function PlayerAvatar({player, small = false}: {player: Forecast; small?: boolean}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [player.imageUrl]);
  return <span className={`avatar player-portrait ${small ? "portrait-small" : ""}`} title={player.name}>
    {player.imageUrl && !broken
      ? <img src={player.imageUrl} alt={`Foto: ${player.name}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)}/>
      : <span aria-label={`Kein verfügbares Spielerfoto: ${player.name}`} className="portrait-placeholder">{initials(player.name)}</span>}
  </span>;
}

export default function ArcadeDashboard({sport, league, leagues, team, clubs, players, info, error}: Props) {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("all");
  const [sortBy, setSortBy] = useState("weighted");
  const [showCount, setShowCount] = useState(70);
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const [cardStore, setCardStore] = useState<CardStore>({});
  const [loadedSport, setLoadedSport] = useState<Sport | null>(null);
  const [activeResult, setActiveResult] = useState(0);
  const [strategy, setStrategy] = useState<Strategy>("balanced");
  const [target, setTarget] = useState(sport === "football" ? "180" : "");

  // A player entry is not proof of owning a specific Sorare card.
  // Browser-side settings are a temporary bridge until collection API sync exists.
  useEffect(() => {
    setLoadedSport(null);
    try {
      // Fall back to the old key so existing manually saved cards are retained.
      const value = window.localStorage.getItem(`markerras.sorare.cards.v1.${sport}`)
        ?? window.localStorage.getItem(`divisorare.cards.v2.${sport}`);
      const parsed: unknown = value ? JSON.parse(value) : {};
      setCardStore(parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as CardStore : {});
    } catch { setCardStore({}); }
    setLoadedSport(sport);
  }, [sport]);
  useEffect(() => {
    if (loadedSport === sport) {
      try { window.localStorage.setItem(`markerras.sorare.cards.v1.${sport}`, JSON.stringify(cardStore)); }
      catch { /* private mode or storage limit: UI still works in this session */ }
    }
  }, [sport, cardStore, loadedSport]);
  useEffect(() => {
    setSearch(""); setPosition("all"); setShowCount(70); setActiveResult(0);
    setTarget(sport === "football" ? "180" : "");
  }, [sport]);

  const updateCard = (id: string, patch: CardSettings) =>
    setCardStore(s => ({...s, [id]: {...(s[id] ?? {}), ...patch}}));

  const lockedIds = useMemo(() => players.filter(p => cardStore[p.id]?.locked).map(p => p.id), [players, cardStore]);
  const excludedIds = useMemo(() => players.filter(p => cardStore[p.id]?.excluded).map(p => p.id), [players, cardStore]);
  const eligibleCards: CardInput[] = useMemo(() => players.map((p) => ({
    player: p,
    owned: cardStore[p.id]?.owned === true,
    stars: cardStore[p.id]?.stars ?? null,
    bonusPercent: cardStore[p.id]?.bonusPercent ?? 0,
  })), [players, cardStore]);

  const ownedCount = players.filter(p => cardStore[p.id]?.owned).length;
  const ratedCount = players.filter(p => isValidNbaStars(cardStore[p.id]?.stars)).length;
  const hasGameCount = players.filter(p => p.hasGame !== false && p.weighted > 0).length;
  const imageCount = players.filter(p => Boolean(p.imageUrl)).length;
  const lineups = useMemo(() => optimizeArcadeLineups(eligibleCards, {
    sport, ownedOnly, limit: 3, beamWidth: 320, maxCandidatesPerSlot: 150,
    strategy, lockedPlayerIds: lockedIds, excludedPlayerIds: excludedIds,
  }), [eligibleCards, sport, ownedOnly, strategy, lockedIds, excludedIds]);
  const chosen = lineups[Math.min(activeResult, lineups.length - 1)] ?? null;
  const totalTarget = Number(target);
  const validTarget = target.trim() !== "" && Number.isFinite(totalTarget) && totalTarget > 0;
  const progress = chosen && validTarget ? Math.min(100, chosen.projectedScore / totalTarget * 100) : 0;

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("de-DE");
    const source = players.filter((p) => {
      if (position !== "all" && p.position !== position) return false;
      if (hideUnavailable && (p.hasGame === false || p.playProb < .3)) return false;
      if (ownedOnly && !cardStore[p.id]?.owned) return false;
      if (needle && !`${p.name} ${p.team} ${p.position}`.toLocaleLowerCase("de-DE").includes(needle)) return false;
      return true;
    });
    return source.sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name, "de");
        case "avg": return (b.avg ?? -1) - (a.avg ?? -1);
        case "last5": return (b.last5Avg ?? -1) - (a.last5Avg ?? -1);
        case "upside": return (b.ceiling*b.playProb) - (a.ceiling*a.playProb);
        case "team": return a.team.localeCompare(b.team, "de");
        case "risk": return b.playProb - a.playProb;
        default: return b.weighted - a.weighted;
      }
    });
  }, [players, position, hideUnavailable, ownedOnly, cardStore, search, sortBy]);
  const positions = Array.from(new Set(players.map(p => p.position))).sort();
  const topPicks = players.filter(p => p.hasGame !== false && p.weighted > 0).slice().sort((a,b) => b.weighted - a.weighted).slice(0, 4);
  const title = sport === "football" ? "Football Arcade" : "NBA Arcade";

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link href="/?sport=football" className="brand" aria-label="Markerras Sorare Helper Startseite">
          <span className="brand-logo">M<span>◆</span></span>
          <span className="brand-text"><strong>MARKERRAS SORARE HELPER</strong><small>ARCADE INTELLIGENCE</small></span>
        </Link>
        <nav className="sport-switch" aria-label="Sportart wählen">
          <Link href="/?sport=football" aria-current={sport === "football" ? "page" : undefined}>⚽ Football</Link>
          <Link href="/?sport=nba" aria-current={sport === "nba" ? "page" : undefined}>🏀 NBA</Link>
        </nav>
        <span className="topbar-pill"><span className="status-dot" style={error ? {background: "#d9a06f"} : undefined}/>{error ? "API nicht erreichbar" : players.length ? "Sorare-Daten geladen" : "Sorare Datenadapter"}</span>
      </header>

      <main className="dashboard-main">
        <section className="hero-section">
          <div>
            <div className="eyebrow"><span className="eyebrow-line"/> GAMEWEEK RESEARCH CENTER</div>
            <h1>Das perfekte <em>{title}</em> Lineup.</h1>
            <p>Spieler analysieren. Karten bewerten. Aufstellungen mit nachvollziehbaren Prognosen optimieren.</p>
            {sport === "football" && <p className="league-focus">Nur Bundesliga · LaLiga · Ligue 1 · Premier League</p>}
            <div className="hero-tags"><span>◆ 5 Karten</span><span>{sport === "nba" ? "★ Maximal 16 Sterne" : "◈ TW · VER · MF · FWD · EX"}</span><span>◎ Sorare-Prognosen</span></div>
          </div>
          <div className="hero-orbit" aria-hidden="true"><div className="orbit-inner"><span>MS</span><small>ARCADE</small></div></div>
        </section>

        <div className="metric-grid">
          <div className="metric-card"><span className="metric-label">Spieler im Datensatz</span><strong>{players.length.toLocaleString("de-DE")}</strong><small>Aktuell ausgewählter Datenbereich</small></div>
          <div className="metric-card"><span className="metric-label">Mögliche Einsätze</span><strong>{hasGameCount.toLocaleString("de-DE")}</strong><small>Spielerbilder: {imageCount} von {players.length}</small></div>
          <div className="metric-card"><span className="metric-label">Meine markierten Karten</span><strong>{ownedCount}</strong><small>Manuell erfasst, lokal gespeichert</small></div>
          <div className="metric-card"><span className="metric-label">{sport === "nba" ? "Sterne zugewiesen" : "Aktuelle Zielmarke"}</span><strong>{sport === "nba" ? ratedCount : (validTarget ? totalTarget : "—")}</strong><small>{sport === "nba" ? "NBA-Karten mit gültigen Sternwerten" : "Veränderbar im Builder"}</small></div>
        </div>

        {error && <div className="notice warning"><strong>Datenabruf fehlgeschlagen.</strong> {error}</div>}
        {info && <div className="notice"><span className="status-dot"/> {info}</div>}

        <section className="panel scope-panel">
          <div className="section-top"><div><span className="section-kicker">01 / DATENBEREICH</span><h2>Liga & Team auswählen</h2></div><span className="caption-small">Suche wirkt innerhalb des geladenen Bereichs</span></div>
          {sport === "football" && leagues.length > 0 && (
            <div className="chip-strip" aria-label="Fußball-Ligen">
              <Link className={league === "__all" && !team ? "chip active" : "chip"} href={makeLink({sport, league:"__all"})}>Alle 4 Ligen</Link>
              {leagues.map(l => <Link className={l === league && !team ? "chip active" : "chip"} key={l} href={makeLink({sport,league:l})}>{l}</Link>)}
            </div>
          )}
          {clubs.length > 0 && (
            <div className="chip-strip chip-teams" aria-label="Teams">
              <Link className={!team ? "chip active" : "chip"} href={makeLink({sport, league: sport === "football" ? league : undefined})}>Alle Teams</Link>
              {clubs.map(c => <Link className={c.slug === team ? "chip active" : "chip"} key={c.slug} href={makeLink({sport, league: sport === "football" ? league : undefined, team:c.slug})}>{c.name}</Link>)}
            </div>
          )}
        </section>

        <section className="two-column">
          <div className="panel builder-panel" id="lineup-builder">
            <div className="section-top"><div><span className="section-kicker">02 / LINEUP STUDIO</span><h2>Arcade Lineup Builder</h2></div><span className="live-pill">5 POSITIONEN</span></div>
            <div className="mode-switch" role="group" aria-label="Spielerauswahl">
              <button type="button" className={!ownedOnly ? "active" : ""} onClick={() => {setOwnedOnly(false); setActiveResult(0);}}>Alle Spieler · theoretisch</button>
              <button type="button" className={ownedOnly ? "active" : ""} onClick={() => {setOwnedOnly(true); setActiveResult(0);}}>Nur meine Karten</button>
            </div>
            <div className="strategy-bar">
              <div className="strategy-title"><strong>Optimierung</strong><small>Ausgewogen = Erwartungswert · Sicher = Floor · Offensiv = Ceiling</small></div>
              <div className="strategy-options" role="group" aria-label="Lineup-Strategie">
                {(["balanced","safe","upside"] as Strategy[]).map(value => <button type="button" key={value} className={strategy === value ? "active" : ""} onClick={() => {setStrategy(value);setActiveResult(0);}}>{({balanced:"Ausgewogen",safe:"Sicher",upside:"Offensiv"} as Record<Strategy,string>)[value]}</button>)}
              </div>
            </div>
            <div className="lock-info"><span>🔒 {lockedIds.length} Spieler fixiert · 🚫 {excludedIds.length} ausgeschlossen</span><button type="button" onClick={() => setCardStore(store => Object.fromEntries(Object.entries(store).map(([id,v])=>[id,{...v,locked:false,excluded:false}]))) }>Auswahl zurücksetzen</button></div>
            {sport === "nba" ? (
              <div className="budget-row">
                <div><span className="budget-name">NBA STERNE-LIMIT</span><div className="budget-value">{chosen ? fmt(chosen.starsUsed) : "0,0"}<span> / 16,0 ★</span></div></div>
                <div className="budget-track"><div style={{width:`${chosen ? chosen.starsUsed / 16 * 100 : 0}%`}}/></div>
              </div>
            ) : (
              <div className="target-shortcuts"><span>HOT STREAKS · ZIEL:</span><button className={target === "180" ? "active" : ""} onClick={() => setTarget("180")}>Schritt 2 · 180</button><button className={target === "360" ? "active" : ""} onClick={() => setTarget("360")}>Schritt 3 · 360</button></div>
            )}
            <div className="lineup-board">
              {(sport === "football" ? ARCADE.football.slots : ARCADE.nba.slots).map((slot, index) => {
                const item = chosen?.picks[index];
                return <div className={`lineup-slot ${item ? "is-filled" : ""}`} key={`${slot}-${index}`}>
                  <div className="slot-icon">{item ? <PlayerAvatar player={item.player} small/> : (sport === "nba" ? "★" : ({GK:"◈",DEF:"⬡",MID:"✦",FWD:"◆",FLEX:"✧"} as Record<string,string>)[slot])}</div>
                  <div className="slot-content"><span className="slot-name">{sport === "nba" ? `Karte ${index + 1}` : `${POS_SHORT[slot]} · ${POS_LABEL[slot]}`}</span>
                    <strong>{item ? item.player.name : "Noch kein passender Pick"}</strong>
                    <small>{item ? `${item.player.team} · ${item.player.confidence ?? "mittel"} Datenlage` : sport === "nba" ? "Sterne für Spieler erfassen" : "Spieler aus dem Pool auswählen"}</small>
                  </div>
                  <div className="slot-score">{item ? <><strong>{fmt(item.projectedScore)}</strong><small>{sport === "nba" ? `${fmt(item.stars ?? 0)} ★` : `+${item.bonusPercent}% Bonus`}</small></> : "—"}</div>
                </div>;
              })}
            </div>
            <div className="lineup-footer">
              <div><span>PROGNOSE GESAMT</span><strong>{chosen ? fmt(chosen.projectedScore) : "—"}<small> Pkt.</small></strong></div>
              <div className="target-input"><label htmlFor="target">Score-Ziel (frei einstellbar)</label><input id="target" type="number" min="1" step="1" inputMode="numeric" value={target} placeholder="z. B. 360" onChange={e=>setTarget(e.target.value)} /></div>
            </div>
            {chosen && <div className="lineup-range"><span>Floor (heuristisch): <strong>{fmt(chosen.floorScore)}</strong></span><span>Ceiling (heuristisch): <strong>{fmt(chosen.ceilingScore)}</strong></span></div>}
            {chosen && validTarget && (
              <div className="target-progress"><div className="target-track"><div style={{width: `${progress}%`}}/></div><p>Modellprognose {fmt(chosen.projectedScore)} / {fmt(totalTarget)} · <strong>{chosen.projectedScore >= totalTarget ? "Prognose über Ziel" : `${fmt(Math.max(0,totalTarget - chosen.projectedScore))} Punkte unter Ziel`}</strong></p></div>
            )}
            <p className="model-note">Mit „Fixieren“ zwingst du Spieler ins Lineup, mit „Sperren“ entfernst du sie aus der Auswahl. Verwende nur selbst geprüfte Sterne und Boni. {ownedOnly ? "Aufstellung nur aus markierten Karten." : "Theoretische Bestbesetzung aus dem geladenen Spielerpool – dein Kartenbesitz ist nicht geprüft."} NBA-Sterne und Boni müssen aktuell manuell eingetragen werden. Prognosen sind keine garantierten Ergebnisse.</p>
            {lineups.length > 1 && <div className="variants" role="group" aria-label="Aufstellungen vergleichen">{lineups.map((l, i) => <button key={i} className={Math.min(activeResult,lineups.length-1) === i ? "active" : ""} onClick={()=>setActiveResult(i)}>Lineup {i+1} <strong>{fmt(l.projectedScore)}</strong></button>)}</div>}
            {!chosen && <div className="empty-state"><strong>Für dieses Regelset fehlt eine vollständige gültige Aufstellung.</strong><p>{sport === "nba" ? "Vergib im Spielertableau zunächst echte Sterne (1–5 in 0,5-Schritten) für mindestens fünf geeignete Karten. Zusammen dürfen sie höchstens 16 Sterne haben." : "Es werden je ein TW, VER, MF, FWD sowie ein zusätzlicher Feldspieler benötigt."}{ownedOnly ? " Markiere die Karten zusätzlich als in deinem Besitz." : ""} Fixierungen müssen zum Regelset passen; NBA zusammen höchstens 16 Sterne.</p></div>}
          </div>

          <aside className="insights-column">
            <div className="panel insight-panel"><span className="section-kicker">03 / PLAYER INTELLIGENCE</span><h2>Top-Prognosen</h2><p className="caption-small">Sorare-Projektion, L5/L10 und Einsatzrisiko – keine verifizierte Gegneranalyse.</p>
              <div className="top-picks">{topPicks.map((p,i) => <div className="pick-row" key={p.id}><span className="pick-rank">{String(i+1).padStart(2,"0")}</span><PlayerAvatar player={p}/><span className="pick-name"><strong>{p.name}</strong><small>{p.team}</small></span><span className="pick-score">{fmt(p.weighted)}<small>L5: {p.last5Avg === null ? "—" : fmt(p.last5Avg)}</small></span></div>)}</div>
            </div>
            <div className="panel tip-panel"><span className="section-kicker">WICHTIG ZUM MODELL</span><h3>Was noch fehlt</h3><p>Die aktuellen Sorare-API-Spielerdaten enthalten hier keine verifizierten Arcade-Sterne und keine persönliche Kartensammlung. Deshalb erfassen wir diese vorerst manuell.</p><p>Die neue Floor-/Ceiling-Spanne ist eine heuristische Bandbreite aus Formschwankungen, keine statistisch validierte Garantie. Gegner-Defense und aktuelle Minutenprognosen sind noch nicht angebunden.</p></div>
          </aside>
        </section>

        <section className="panel explorer-panel" id="spieler">
          <div className="section-top"><div><span className="section-kicker">04 / SPIELER EXPLORER</span><h2>Spieler suchen & bewerten</h2></div><span className="record-count">{filtered.length.toLocaleString("de-DE")} Ergebnisse</span></div>
          <div className="search-controls">
            <label className="searchbox"><span>⌕</span><input placeholder="Spieler, Verein oder Position suchen …" value={search} onChange={e=>{setSearch(e.target.value);setShowCount(70);}} aria-label="Spieler suchen"/><kbd>SEARCH</kbd></label>
            <select aria-label="Nach Position filtern" value={position} onChange={e=>{setPosition(e.target.value);setShowCount(70);}}><option value="all">Alle Positionen</option>{positions.map(p=><option key={p} value={p}>{POS_LABEL[p] ?? p}</option>)}</select>
            <select aria-label="Sortierung" value={sortBy} onChange={e=>setSortBy(e.target.value)}><option value="weighted">Beste Prognose</option><option value="avg">Höchster Ø-Score</option><option value="last5">Beste L5-Form</option><option value="upside">Höchstes Ceiling</option><option value="risk">Höchste Einsatzchance</option><option value="name">Name A–Z</option><option value="team">Team A–Z</option></select>
          </div>
          <div className="filter-checkbox"><label><input type="checkbox" checked={hideUnavailable} onChange={e=>setHideUnavailable(e.target.checked)}/> Spieler mit fehlendem Spiel oder geringerer Einsatzchance ausblenden</label></div>
          <div className="table-scroll"><table className="players-table"><thead><tr><th>Spieler / Team</th><th>Pos.</th><th>Ø Score</th><th>L5</th><th>Floor – Ceiling</th><th>Daten</th><th>Einsatz</th><th>Prognose</th><th>Builder</th><th>Mein Bestand</th>{sport === "nba" && <th>Sterne ★</th>}<th>Kartenbonus</th></tr></thead>
            <tbody>{filtered.slice(0,showCount).map(p => {
              const card = cardStore[p.id] ?? {};
              return <tr key={p.id}>
                <td><div className="player-identity"><PlayerAvatar player={p}/><span><strong>{p.name}</strong><small>{p.team}{p.injuries > 0 ? " · ⚠ Verletzung" : ""}{p.hasGame === false ? " · kein Spiel" : ""}</small>{p.nextGame && <small className="game-caption">{p.nextGame}</small>}</span></div></td>
                <td><span className="position-pill">{p.position}</span></td>
                <td className="numeric-cell">{p.avg === null ? "—" : fmt(p.avg)}</td>
                <td className="numeric-cell">{p.last5Avg === null ? "—" : fmt(p.last5Avg)}</td>
                <td className="numeric-cell range-cell">{fmt(p.floor)} – {fmt(p.ceiling)}</td>
                <td><span className={`confidence-tag confidence-${p.confidence}`} title={`${p.sampleSize} Scores; Datenabdeckung, keine statistische Konfidenz`}>{p.confidence}</span></td>
                <td><div className="prob-meter"><div style={{width:`${Math.round(p.playProb * 100)}%`}}/></div><small>{Math.round(p.playProb * 100)} %</small></td>
                <td className="numeric-cell score-cell" title={`Bei Einsatz: ${fmt(p.expected)} · Einsatzchance: ${Math.round(p.playProb*100)} %`}>{fmt(p.weighted)}</td>
                <td><div className="builder-actions">
                  <button type="button" aria-pressed={card.locked === true} className={card.locked ? "active" : ""} title="Spieler fest ins Lineup aufnehmen" onClick={()=>updateCard(p.id,{locked:!card.locked,excluded:false})}>🔒 {card.locked ? "Fixiert" : "Fixieren"}</button>
                  <button type="button" aria-pressed={card.excluded === true} className={card.excluded ? "excluded" : ""} title="Spieler aus Lineups ausschließen" onClick={()=>updateCard(p.id,{excluded:!card.excluded,locked:false})}>🚫</button>
                </div></td>
                <td><label className="owned-checkbox" title="Diese Spielerkarte ist in meinem Bestand"><input type="checkbox" checked={card.owned === true} onChange={e=>updateCard(p.id,{owned:e.target.checked})}/><span>{card.owned ? "Meine Karte" : "Merken"}</span></label></td>
                {sport === "nba" && <td><select className="small-select star-select" value={isValidNbaStars(card.stars) ? String(card.stars) : ""} aria-label={`Sterne für ${p.name}`} onChange={e=>updateCard(p.id,{stars: e.target.value === "" ? null : Number(e.target.value)})}><option value="">—</option>{starOptions.map(s=><option value={String(s)} key={s}>{fmt(s)} ★</option>)}</select></td>}
                <td><select className="small-select" value={card.bonusPercent ?? 0} aria-label={`Kartenbonus für ${p.name}`} onChange={e=>updateCard(p.id,{bonusPercent:Number(e.target.value)})}>{bonuses.map(b=><option value={b} key={b}>+{b} %</option>)}</select></td>
              </tr>;
            })}</tbody></table></div>
          {!filtered.length && <div className="empty-state">Keine passenden Spieler im geladenen Datenbereich.</div>}
          {showCount < filtered.length && <button className="load-more" onClick={()=>setShowCount(n=>n+70)}>Weitere Spieler anzeigen ({Math.min(70,filtered.length-showCount)}) ↓</button>}
          <div className="footnote">Tipp: Mit „Meine Karte“ markierst du deinen Bestand. Sterne und Bonus stammen derzeit aus deinen Eingaben und bleiben nur in diesem Browser gespeichert. Spielerbilder stammen soweit vorhanden aus der Sorare-API; fehlt ein Foto oder lässt es sich nicht laden, werden Initialen gezeigt. Die Spannen sind heuristisch und noch nicht gegen echte Spieltagsergebnisse kalibriert.</div>
        </section>
        <footer className="app-footer"><strong>MARKERRAS SORARE HELPER</strong><span>Independent Sorare companion · Nicht mit Sorare verbunden · Kein automatisches Einreichen von Lineups</span></footer>
      </main>
    </div>
  );
}

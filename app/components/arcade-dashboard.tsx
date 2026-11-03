"use client";

import Link from "next/link";
import ManualLineup from "@/app/components/manual-lineup";
import { useEffect, useMemo, useState } from "react";
import type { Forecast, Sport } from "@/lib/model";
import type { Strategy } from "@/lib/arcade";
import { enrichForecast, matchupLabel, validDefenseRating, type OpponentRatings } from "@/lib/matchups";
import { optimizeArcadeLineups, isValidNbaStars, type CardInput } from "@/lib/arcade";
import { ARCADE } from "@/config/divination";
import type { Club } from "@/lib/sorare";
import { createTrackedPrediction, upsertTracked, setActual, trackingMetrics, type TrackedPrediction } from "@/lib/tracking";
import {alignOpponentNames, type AutomaticMatchupData} from "@/lib/auto-matchups";

type CardSettings = {
  owned?: boolean; stars?: number | null; bonusPercent?: number;
  locked?: boolean; excluded?: boolean;
  expectedMinutes?: number | null; typicalMinutes?: number | null;
  xg?: number | null; xa?: number | null;
};
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
  automaticMatchups: AutomaticMatchupData;
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

export default function ArcadeDashboard({sport, league, leagues, team, clubs, players: basePlayers, info, error, automaticMatchups}: Props) {
  const [search, setSearch] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [profileHistories, setProfileHistories] = useState<Record<string, number[]>>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [tracked, setTracked] = useState<TrackedPrediction[]>([]);
  const [loadedTrackingSport, setLoadedTrackingSport] = useState<Sport | null>(null);
  const [position, setPosition] = useState("all");
  const [sortBy, setSortBy] = useState("weighted");
  const [showCount, setShowCount] = useState(70);
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const [hasForecastOnly, setHasForecastOnly] = useState(false);
  const [cardStore, setCardStore] = useState<CardStore>({});
  const [opponentRatings, setOpponentRatings] = useState<OpponentRatings>({});
  const [loadedRatingSport, setLoadedRatingSport] = useState<Sport | null>(null);
  const [loadedSport, setLoadedSport] = useState<Sport | null>(null);
  const [activeResult, setActiveResult] = useState(0);
  const [builderMode, setBuilderMode] = useState<"automatic" | "manual">("manual");
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
    setLoadedRatingSport(null);
    try {
      const raw = window.localStorage.getItem(`markerras.sorare.opponent-ratings.v1.${sport}`);
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      const clean: OpponentRatings = {};
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [key, value] of Object.entries(parsed)) if (validDefenseRating(value)) clean[key] = value;
      }
      setOpponentRatings(clean);
    } catch { setOpponentRatings({}); }
    setLoadedRatingSport(sport);
  }, [sport]);
  useEffect(() => {
    if (loadedRatingSport === sport) {
      try { window.localStorage.setItem(`markerras.sorare.opponent-ratings.v1.${sport}`, JSON.stringify(opponentRatings)); }
      catch { /* Browser storage disabled */ }
    }
  }, [sport, loadedRatingSport, opponentRatings]);
  useEffect(() => {
    setSearch(""); setPosition("all"); setShowCount(70); setActiveResult(0);
    setTarget(sport === "football" ? "180" : "");
  }, [sport]);

  // Track snapshots in the current browser, never silently claim official results.
  useEffect(() => {
    setLoadedTrackingSport(null);
    try {
      const raw = localStorage.getItem(`markerras.sorare.tracking.v1.${sport}`);
      const parsed = raw ? JSON.parse(raw) : [];
      setTracked(Array.isArray(parsed) ? parsed.filter((v): v is TrackedPrediction =>
        v && typeof v.key === "string" && typeof v.playerName === "string") : []);
    } catch {setTracked([]);}
    setLoadedTrackingSport(sport);
  }, [sport]);
  useEffect(() => {
    if (loadedTrackingSport !== sport) return;
    try {localStorage.setItem(`markerras.sorare.tracking.v1.${sport}`, JSON.stringify(tracked));}
    catch { /* storage disabled */ }
  }, [tracked, sport, loadedTrackingSport]);
  useEffect(() => {
    if (!selectedPlayerId) return;
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedPlayerId(null); };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [selectedPlayerId]);

  // Optional per-player history, fetched only on click. Main list still uses
  // Sorare's inexpensive L5/L10 aggregates and stays fast for thousands of players.
  useEffect(() => {
    if (!selectedPlayerId) return;
    const player = basePlayers.find(p => p.id === selectedPlayerId);
    if (!player || (player.recentScores?.length ?? 0) > 0 ||
        Object.prototype.hasOwnProperty.call(profileHistories, selectedPlayerId)) return;
    let active = true;
    setHistoryLoading(true); setHistoryError(false);
    fetch(`/api/player-scores?slug=${encodeURIComponent(selectedPlayerId)}`)
      .then(async r => {if (!r.ok) throw new Error("History unavailable"); return r.json();})
      .then(data => {if (active) setProfileHistories(state => ({...state,[selectedPlayerId]:
        Array.isArray(data.scores) ? data.scores.filter((v: unknown): v is number => typeof v === "number" && Number.isFinite(v)) : []}));})
      .catch(() => {if (active) {setProfileHistories(state=>({...state,[selectedPlayerId]:[]}));setHistoryError(true);}})
      .finally(() => {if (active) setHistoryLoading(false);});
    return () => {active=false;};
  }, [selectedPlayerId, basePlayers, profileHistories]);

  const updateCard = (id: string, patch: CardSettings) =>
    setCardStore(s => ({...s, [id]: {...(s[id] ?? {}), ...patch}}));

  const opponentNames=useMemo(()=>[...new Set(basePlayers.map(p=>p.opponent).filter((n):n is string=>Boolean(n)))], [basePlayers]);
  const alignedAutoRatings=useMemo(()=>alignOpponentNames(automaticMatchups.ratings,opponentNames),[automaticMatchups,opponentNames]);
  const effectiveRatings=useMemo(()=>({...alignedAutoRatings,...opponentRatings}),[alignedAutoRatings,opponentRatings]);
  // Recalculate on the client when independently entered scouting data changes.
  // Missing ratings remain neutral; no opponent statistics are fabricated.
  const players = useMemo(() => basePlayers.map(p => enrichForecast(p, sport, effectiveRatings, {
    expectedMinutes: cardStore[p.id]?.expectedMinutes,
    typicalMinutes: cardStore[p.id]?.typicalMinutes,
    xg: cardStore[p.id]?.xg,
    xa: cardStore[p.id]?.xa,
  })), [basePlayers, sport, effectiveRatings, cardStore]);
  const opponents = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of players) if (p.opponent && p.hasGame !== false) counts.set(p.opponent, (counts.get(p.opponent) ?? 0) + 1);
    return [...counts.entries()].sort((a,b)=>a[0].localeCompare(b[0], "de"));
  }, [players]);
  const ratedOpponents = opponents.filter(([name]) => validDefenseRating(effectiveRatings[name])).length;
  const matchupPicks = players.filter(p => p.opponentRating !== null && p.hasGame !== false && p.weighted > 0)
    .sort((a,b) => b.matchupAdjustmentPct - a.matchupAdjustmentPct || b.weighted - a.weighted).slice(0, 8);
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
  const totalTarget = Number(target);
  const validTarget = target.trim() !== "" && Number.isFinite(totalTarget) && totalTarget > 0;
  const lineups = useMemo(() => optimizeArcadeLineups(eligibleCards, {
    sport, ownedOnly, limit: 5, beamWidth: 320, maxCandidatesPerSlot: 150,
    strategy, targetScore: validTarget ? totalTarget : null, lockedPlayerIds: lockedIds, excludedPlayerIds: excludedIds,
  }), [eligibleCards, sport, ownedOnly, strategy, validTarget, totalTarget, lockedIds, excludedIds]);
  const chosen = lineups[Math.min(activeResult, lineups.length - 1)] ?? null;
  const selectedPlayer = players.find(p => p.id === selectedPlayerId) ?? null;
  const selectedCard = selectedPlayer ? cardStore[selectedPlayer.id] ?? {} : {};
  const profileScores = selectedPlayer ? ((selectedPlayer.recentScores?.length ?? 0) > 0 ? selectedPlayer.recentScores! : profileHistories[selectedPlayer.id] ?? []) : [];
  const metrics = trackingMetrics(tracked);
  const saveTracked = (p: Forecast) => setTracked(items => upsertTracked(items, createTrackedPrediction(p, sport)));
  const progress = chosen && validTarget ? Math.min(100, chosen.projectedScore / totalTarget * 100) : 0;

  const filtered = useMemo(() => {
    // Accent-insensitive search, e.g. Mbappe matches Mbappé.
    const normalize = (value: string) => value.toLocaleLowerCase("de-DE").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    const needle = normalize(search.trim());
    const source = players.filter((p) => {
      if (position !== "all" && p.position !== position) return false;
      if (hideUnavailable && (p.hasGame === false || p.playProb < .3)) return false;
      if (hasForecastOnly && p.forecastSources.length === 0) return false;
      if (ownedOnly && !cardStore[p.id]?.owned) return false;
      if (needle && !normalize(`${p.name} ${p.team} ${p.position}`).includes(needle)) return false;
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
        case "matchup": return (b.opponentRating ? b.matchupAdjustmentPct : -999) - (a.opponentRating ? a.matchupAdjustmentPct : -999) || b.weighted - a.weighted;
        default: return b.weighted - a.weighted;
      }
    });
  }, [players, position, hideUnavailable, hasForecastOnly, ownedOnly, cardStore, search, sortBy]);
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
          <div className="section-top"><div><span className="section-kicker">01 / DATENBEREICH</span><h2>Liga & Team auswählen</h2></div><span className="caption-small">Suche im geladenen Kader · Alle 4 Ligen für ligaübergreifende Suche auswählen</span></div>
          {sport === "football" && leagues.length > 0 && (
            <div className="chip-strip" aria-label="Fußball-Ligen">
              <Link className={league === "__all" && !team ? "chip active" : "chip"} href={makeLink({sport, league:"__all"})}>Alle 4 Ligen</Link>
              {leagues.map(l => <Link className={l === league && !team ? "chip active" : "chip"} key={l} href={makeLink({sport,league:l})}>{l}</Link>)}
            </div>
          )}
          {sport === "football" && league !== "__all" && <p className="scope-notice">Du suchst gerade nur in {league}. <Link href={makeLink({sport,league:"__all"})+"#spieler"}>Alle Spieler aus den vier Ligen durchsuchen →</Link></p>}
          {clubs.length > 0 && (
            <div className="chip-strip chip-teams" aria-label="Teams">
              <Link className={!team ? "chip active" : "chip"} href={makeLink({sport, league: sport === "football" ? league : undefined})}>Alle Teams</Link>
              {clubs.map(c => <Link className={c.slug === team ? "chip active" : "chip"} key={c.slug} href={makeLink({sport, league: sport === "football" ? league : undefined, team:c.slug})}>{c.name}</Link>)}
            </div>
          )}
        </section>

        <section className="panel matchup-panel" id="matchups">
          <div className="section-top"><div><span className="section-kicker">02 / MATCHUP INTELLIGENCE</span><h2>Gegneranalyse & Top-Matchups</h2></div><span className="record-count">{ratedOpponents} von {opponents.length} Gegnern bewertet</span></div>
          <p className="matchup-disclaimer">Die kommenden Gegner stammen aus Sorare-Fixtures, soweit verfügbar. {automaticMatchups.source && !automaticMatchups.error ? <><strong>Automatische Defensivdaten:</strong> {automaticMatchups.source}, Saison {automaticMatchups.season}. Die 1–5-Einstufung ist eine relative Einteilung nach Gegentoren bzw. Gegenpunkten, keine positionsbezogene Analyse. </> : <><strong>Automatische Defensivdaten nicht eingerichtet.</strong> Hinterlege {sport === "nba" ? "BALLDONTLIE_API_KEY" : "API_FOOTBALL_KEY"} als Vercel-Umgebungsvariable, um verfügbare echte Gegnerstatistiken zu laden. </>}{automaticMatchups.error && <>Feed-Fehler: {automaticMatchups.error}. </>}Du kannst die Bewertung unten jederzeit manuell überschreiben. Ohne zuverlässige Zuordnung bleibt der Gegner neutral.</p>
          <div className="opponent-grid">
            {opponents.map(([name, amount]) => <label className="opponent-rating" key={name}>
              <span><strong>{name}</strong><small>{amount} Spieler · {validDefenseRating(alignedAutoRatings[name]) ? `Automatisch ${alignedAutoRatings[name]}/5` : "kein automatischer Wert"}</small></span>
              <select aria-label={`Gegnerstärke ${name}`} value={opponentRatings[name] ?? ""} onChange={e=>setOpponentRatings(prev=>{
                const next={...prev}; if (!e.target.value) delete next[name]; else next[name]=Number(e.target.value); return next;
              })}>
                <option value="">{validDefenseRating(alignedAutoRatings[name]) ? `Auto (${alignedAutoRatings[name]}/5)` : "Unbewertet"}</option><option value="1">1 · sehr günstig</option><option value="2">2 · günstig</option><option value="3">3 · neutral</option><option value="4">4 · schwierig</option><option value="5">5 · sehr schwierig</option>
              </select>
            </label>)}
          </div>
          {!opponents.length && <div className="empty-state">Keine identifizierbaren Gegner in den geladenen Sorare-Fixtures. Die Spielerprognosen bleiben unverändert.</div>}
          <div className="section-top matchup-subtitle"><div><span className="section-kicker">MATCHUP RANKING</span><h3>Attraktivste {automaticMatchups.coverage ? "automatisch oder manuell" : "manuell"} bewertete Matchups</h3></div></div>
          {matchupPicks.length ? <div className="matchup-ranking">
            {matchupPicks.map((p, index) => <div key={p.id} className="matchup-pick">
              <span className="pick-rank">{String(index + 1).padStart(2,"0")}</span><PlayerAvatar player={p} small/>
              <span className="matchup-player"><button type="button" className="player-open" onClick={() => setSelectedPlayerId(p.id)}>{p.name} ↗</button><small>{p.team} · gegen {p.opponent}</small></span>
              <span className="matchup-tier">{matchupLabel(p.opponentRating)}<small>{p.matchupAdjustmentPct > 0 ? "+" : ""}{fmt(p.matchupAdjustmentPct)} % Modellfaktor</small></span>
              <strong className="matchup-projection">{fmt(p.weighted)} Pkt.</strong>
            </div>)}
          </div> : <p className="matchup-disclaimer">Bewerte mindestens einen Gegner, um ein transparentes Matchup-Ranking zu erhalten. Ohne belastbare Defensivdaten gibt es bewusst keine erfundenen Top-10-Matchups.</p>}
        </section>

        <section className="two-column">
          <div className="panel builder-panel" id="lineup-builder">
            <div className="section-top"><div><span className="section-kicker">03 / LINEUP STUDIO</span><h2>Arcade Lineup Builder</h2></div><span className="live-pill">5 POSITIONEN</span></div>
            <div className="builder-mode-tabs" role="group" aria-label="Lineup Builder Modus">
              <button type="button" className={builderMode === "manual" ? "active" : ""} aria-pressed={builderMode === "manual"} onClick={() => setBuilderMode("manual")}>✋ Selbst aufstellen</button>
              <button type="button" className={builderMode === "automatic" ? "active" : ""} aria-pressed={builderMode === "automatic"} onClick={() => setBuilderMode("automatic")}>✦ Automatisch optimieren</button>
            </div>
            {builderMode === "manual" && <div className="manual-target-controls">
              <label htmlFor="manual-target">Score-Ziel (optional)</label>
              <input id="manual-target" type="number" min="1" step="1" inputMode="numeric" value={target} placeholder="Score-Ziel eingeben" onChange={e=>setTarget(e.target.value)}/>
              {sport === "football" && <><button type="button" onClick={()=>setTarget("180")}>180 Pkt.</button><button type="button" onClick={()=>setTarget("360")}>360 Pkt.</button></>}
            </div>}
            {builderMode === "manual" ? <ManualLineup sport={sport} players={players} cardStore={cardStore}
              updateCard={updateCard} targetScore={validTarget ? totalTarget : null}
              onOpenProfile={setSelectedPlayerId}
              onSavePredictions={items => items.forEach(saveTracked)}/> : <>
            <div className="mode-switch" role="group" aria-label="Spielerauswahl">
              <button type="button" className={!ownedOnly ? "active" : ""} onClick={() => {setOwnedOnly(false); setActiveResult(0);}}>Alle Spieler · theoretisch</button>
              <button type="button" className={ownedOnly ? "active" : ""} onClick={() => {setOwnedOnly(true); setActiveResult(0);}}>Nur meine Karten</button>
            </div>
            <div className="strategy-bar">
              <div className="strategy-title"><strong>Optimierung</strong><small>Ausgewogen = Erwartungswert · Sicher = Floor · Offensiv = Ceiling · Zielchance = geschätzte Zielerreichung</small></div>
              <div className="strategy-options" role="group" aria-label="Lineup-Strategie">
                {(["balanced","safe","upside","target"] as Strategy[]).map(value => <button type="button" key={value} disabled={value === "target" && !validTarget} title={value === "target" && !validTarget ? "Bitte zuerst unten ein Score-Ziel eingeben" : undefined} className={strategy === value ? "active" : ""} onClick={() => {setStrategy(value);setActiveResult(0);}}>{({balanced:"Ausgewogen",safe:"Sicher",upside:"Offensiv",target:"Zielchance"} as Record<Strategy,string>)[value]}</button>)}
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
                    {item ? <button className="player-open" type="button" onClick={() => setSelectedPlayerId(item.player.id)}>{item.player.name} ↗</button> : <strong>Noch kein passender Pick</strong>}
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
            {chosen && validTarget && chosen.targetProbability !== null && <div className="target-chance" role="status"><div><span>GESCHÄTZTE ZIELCHANCE</span><strong>{Math.round(chosen.targetProbability * 100)} %</strong></div><small>Modellschätzung mit Formstreuung, DNP-Risiko und angenommener Team-Korrelation. Nicht kalibriert, keine garantierte Gewinnchance.</small></div>}
            {chosen && validTarget && (
              <div className="target-progress"><div className="target-track"><div style={{width: `${progress}%`}}/></div><p>Modellprognose {fmt(chosen.projectedScore)} / {fmt(totalTarget)} · <strong>{chosen.projectedScore >= totalTarget ? "Prognose über Ziel" : `${fmt(Math.max(0,totalTarget - chosen.projectedScore))} Punkte unter Ziel`}</strong></p></div>
            )}
            <p className="model-note">Mit „Fixieren“ zwingst du Spieler ins Lineup, mit „Sperren“ entfernst du sie aus der Auswahl. Verwende nur selbst geprüfte Sterne und Boni. {ownedOnly ? "Aufstellung nur aus markierten Karten." : "Theoretische Bestbesetzung aus dem geladenen Spielerpool – dein Kartenbesitz ist nicht geprüft."} NBA-Sterne und Boni müssen aktuell manuell eingetragen werden. Prognosen sind keine garantierten Ergebnisse.</p>
            {lineups.length > 1 && <div className="variants" role="group" aria-label="Aufstellungen vergleichen">{lineups.map((l, i) => <button key={i} className={Math.min(activeResult,lineups.length-1) === i ? "active" : ""} onClick={()=>setActiveResult(i)}>Lineup {i+1} <strong>{validTarget && l.targetProbability !== null ? `${Math.round(l.targetProbability * 100)} % Zielchance` : `${fmt(l.projectedScore)} Pkt.`}</strong></button>)}</div>}
            {lineups.length > 1 && <div className="lineup-compare"><h3>Lineups im direkten Vergleich</h3><div className="tracking-scroll"><table className="tracking-table"><thead><tr><th>Lineup</th><th>Prognose</th><th>Floor</th><th>Ceiling</th>{sport === "nba" && <th>Sterne</th>}{validTarget && <th>Zielchance*</th>}</tr></thead><tbody>{lineups.map((l,i) => <tr key={i} className={Math.min(activeResult,lineups.length-1)===i ? "compare-selected" : ""} onClick={() => setActiveResult(i)}><td><button type="button" onClick={() => setActiveResult(i)}>#{i+1} wählen</button></td><td>{fmt(l.projectedScore)}</td><td>{fmt(l.floorScore)}</td><td>{fmt(l.ceilingScore)}</td>{sport === "nba" && <td>{fmt(l.starsUsed)} ★</td>}{validTarget && <td>{l.targetProbability===null ? "—" : `${Math.round(l.targetProbability*100)} %`}</td>}</tr>)}</tbody></table></div><p className="profile-muted">* Zielchance: nicht kalibrierte Modellschätzung. Lineups sind nicht automatisch offiziell spielberechtigt; Kartenbesitz und aktuelle Set-Regeln prüfen.</p></div>}
            {!chosen && <div className="empty-state"><strong>Für dieses Regelset fehlt eine vollständige gültige Aufstellung.</strong><p>{sport === "nba" ? "Vergib im Spielertableau zunächst echte Sterne (1–5 in 0,5-Schritten) für mindestens fünf geeignete Karten. Zusammen dürfen sie höchstens 16 Sterne haben." : "Es werden je ein TW, VER, MF, FWD sowie ein zusätzlicher Feldspieler benötigt."}{ownedOnly ? " Markiere die Karten zusätzlich als in deinem Besitz." : ""} Fixierungen müssen zum Regelset passen; NBA zusammen höchstens 16 Sterne.</p></div>}
            </>}
          </div>

          <aside className="insights-column">
            <div className="panel insight-panel"><span className="section-kicker">04 / PLAYER INTELLIGENCE</span><h2>Top-Prognosen</h2><p className="caption-small">Sorare-Projektion, L5/L10 und Einsatzrisiko; optionale manuelle Matchup- und Minutenanpassungen.</p>
              <div className="top-picks">{topPicks.map((p,i) => <div className="pick-row" key={p.id}><span className="pick-rank">{String(i+1).padStart(2,"0")}</span><PlayerAvatar player={p}/><span className="pick-name"><button type="button" className="player-open" onClick={() => setSelectedPlayerId(p.id)}>{p.name} ↗</button><small>{p.team}</small></span><span className="pick-score">{fmt(p.weighted)}<small>L5: {p.last5Avg === null ? "—" : fmt(p.last5Avg)}</small></span></div>)}</div>
            </div>
            <div className="panel tip-panel"><span className="section-kicker">WICHTIG ZUM MODELL</span><h3>Was noch fehlt</h3><p>Die aktuellen Sorare-API-Spielerdaten enthalten hier keine verifizierten Arcade-Sterne und keine persönliche Kartensammlung. Deshalb erfassen wir diese vorerst manuell.</p><p>Floor, Ceiling und Zielchance sind heuristische Modellwerte, keine statistisch validierte Vorhersage. Gegnerstärke wird bei eingerichteten Datenzugängen aus echten Gegnerergebnissen abgeleitet, sonst aus deinen manuellen Bewertungen. Erwartete Minuten, Verletzungsaktualität und xG/xA sind nicht über einen eigenen Live-Feed abgesichert.</p></div>
          </aside>
        </section>

        <section className="panel explorer-panel" id="spieler">
          <div className="section-top"><div><span className="section-kicker">05 / SPIELER EXPLORER</span><h2>Spieler suchen & Spielerprofile öffnen</h2></div><span className="record-count">{filtered.length.toLocaleString("de-DE")} Ergebnisse</span></div>
          <div className="search-controls">
            <label className="searchbox"><span>⌕</span><input placeholder="Spieler, Verein oder Position suchen …" value={search} onChange={e=>{setSearch(e.target.value);setShowCount(70);}} aria-label="Spieler suchen"/><kbd>{filtered.length} Treffer</kbd></label>
            <select aria-label="Nach Position filtern" value={position} onChange={e=>{setPosition(e.target.value);setShowCount(70);}}><option value="all">Alle Positionen</option>{positions.map(p=><option key={p} value={p}>{POS_LABEL[p] ?? p}</option>)}</select>
            <select aria-label="Sortierung" value={sortBy} onChange={e=>setSortBy(e.target.value)}><option value="weighted">Beste Prognose</option><option value="avg">Höchster Ø-Score</option><option value="last5">Beste L5-Form</option><option value="upside">Höchstes Ceiling</option><option value="risk">Höchste Einsatzchance</option><option value="matchup">Bester bewerteter Gegner</option><option value="name">Name A–Z</option><option value="team">Team A–Z</option></select>
          </div>
          <div className="filter-checkbox"><label><input type="checkbox" checked={hideUnavailable} onChange={e=>setHideUnavailable(e.target.checked)}/> Spieler mit fehlendem Spiel oder geringerer Einsatzchance ausblenden</label><label><input type="checkbox" checked={hasForecastOnly} onChange={e=>setHasForecastOnly(e.target.checked)}/> Nur Spieler mit mindestens einer Score-Datenquelle anzeigen</label></div>
          <div className="table-scroll"><table className="players-table"><thead><tr><th>Spieler / Team</th><th>Pos.</th><th>Ø Score</th><th>L5</th><th>Gegner</th><th>Floor – Ceiling</th><th>Daten</th><th>Einsatz</th><th>Prognose</th><th>Scouting (manuell)</th><th>Builder</th><th>Mein Bestand</th>{sport === "nba" && <th>Sterne ★</th>}<th>Kartenbonus</th></tr></thead>
            <tbody>{filtered.slice(0,showCount).map(p => {
              const card = cardStore[p.id] ?? {};
              return <tr key={p.id}>
                <td><div className="player-identity"><PlayerAvatar player={p}/><span><button type="button" className="player-open" onClick={() => setSelectedPlayerId(p.id)} title={`Profil von ${p.name} öffnen`}>{p.name} ↗</button><small>{p.team}{p.injuries > 0 ? " · ⚠ Verletzung" : ""}{p.hasGame === false ? " · kein Spiel" : ""}</small>{p.nextGame && <small className="game-caption">{p.nextGame}</small>}</span></div></td>
                <td><span className="position-pill">{p.position}</span></td>
                <td className="numeric-cell">{p.avg === null ? "—" : fmt(p.avg)}</td>
                <td className="numeric-cell">{p.last5Avg === null ? "—" : fmt(p.last5Avg)}</td>
                <td><span className="opponent-cell"><strong>{p.opponent ?? "—"}</strong><small>{matchupLabel(p.opponentRating)}{p.opponentRating !== null ? ` (${fmt(p.matchupAdjustmentPct)} %)` : ""}</small></span></td>
                <td className="numeric-cell range-cell">{p.forecastSources.length ? `${fmt(p.floor)} – ${fmt(p.ceiling)}` : "—"}</td>
                <td><span className={`confidence-tag confidence-${p.confidence}`} title={`${p.sampleSize} Scores; Datenabdeckung, keine statistische Konfidenz`}>{p.confidence}</span></td>
                <td><div className="prob-meter"><div style={{width:`${Math.round(p.playProb * 100)}%`}}/></div><small>{Math.round(p.playProb * 100)} %</small></td>
                <td className="numeric-cell score-cell" title={p.forecastSources.length ? `Bei Einsatz: ${fmt(p.expected)} · Modell-Einsatzchance: ${Math.round(p.playProb*100)} %` : "Kein Score-Eingang vorhanden"}>{p.forecastSources.length ? fmt(p.weighted) : "—"}</td>
                <td><div className="scout-inputs">
                  <label>Ø Min.<input type="number" min="1" max={sport === "nba" ? 60 : 130} placeholder="üblich" value={card.typicalMinutes ?? ""} onChange={e=>updateCard(p.id,{typicalMinutes: e.target.value ? Number(e.target.value) : null})}/></label>
                  <label>Erw. Min.<input type="number" min="1" max={sport === "nba" ? 60 : 130} placeholder="erwartet" value={card.expectedMinutes ?? ""} onChange={e=>updateCard(p.id,{expectedMinutes: e.target.value ? Number(e.target.value) : null})}/></label>
                  {sport === "football" && <>
                    <label>xG<input type="number" min="0" max="10" step="0.05" placeholder="—" value={card.xg ?? ""} onChange={e=>updateCard(p.id,{xg:e.target.value ? Number(e.target.value) : null})}/></label>
                    <label>xA<input type="number" min="0" max="10" step="0.05" placeholder="—" value={card.xa ?? ""} onChange={e=>updateCard(p.id,{xa:e.target.value ? Number(e.target.value) : null})}/></label>
                  </>}
                </div></td>
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
          <div className="footnote">Klicke auf einen Spielernamen, um sein Detailprofil zu öffnen. Tipp: Mit „Meine Karte“ markierst du deinen Bestand. Sterne und Bonus stammen derzeit aus deinen Eingaben und bleiben nur in diesem Browser gespeichert. Spielerbilder stammen soweit vorhanden aus der Sorare-API; fehlt ein Foto oder lässt es sich nicht laden, werden Initialen gezeigt. Die Spannen und Zielchancen sind heuristisch und noch nicht gegen echte Spieltagsergebnisse kalibriert. xG/xA sind vorerst nur Informationsfelder (ohne rechnerischen Einfluss); für die Minutenkorrektur musst du übliche UND erwartete Minuten eingeben. Gegnerbewertungen basieren bei aktiviertem Feed auf realen Team-Gegentoren/-punkten oder ansonsten auf deinen manuellen Eingaben; die 1–5-Skala bleibt nur eine grobe Einordnung.</div>
        </section>
        <section className="panel tracking-panel" id="tracking">
          <div className="section-top"><div><span className="section-kicker">06 / PROGNOSE-TRACKING</span><h2>Prognose gegen Ergebnis</h2></div><span className="record-count">{metrics.count} ausgewertete Vorhersagen</span></div>
          <p className="matchup-disclaimer">Speichere Spielerprognosen <strong>vor dem Spiel</strong> und trage danach den tatsächlichen Sorare-Score ein. Prognosen und Ergebnisse bleiben lokal auf deinem Gerät. Die automatische Zuordnung offizieller Scores ist noch nicht vorhanden.</p>
          <div className="tracking-metrics">
            <div><small>MAE · Ø absoluter Fehler</small><strong>{metrics.mae === null ? "—" : `${fmt(metrics.mae)} Pkt.`}</strong></div>
            <div><small>RMSE · größere Fehler stärker gewichtet</small><strong>{metrics.rmse === null ? "—" : `${fmt(metrics.rmse)} Pkt.`}</strong></div>
            <div><small>Bias · Prognose minus Ist</small><strong>{metrics.bias === null ? "—" : `${fmt(metrics.bias)} Pkt.`}</strong></div>
          </div>
          {chosen && <button type="button" className="action-primary" onClick={() => chosen.picks.forEach(pick => saveTracked(pick.player))}>Diese 5 Spielerprognosen speichern</button>}
          <div className="tracking-scroll"><table className="tracking-table"><thead><tr><th>Spieler / gespeicherte Partie</th><th>Prognose</th><th>Ist-Score</th><th>Fehler</th><th></th></tr></thead><tbody>
            {tracked.slice(0, 60).map(row => <tr key={row.key}><td><strong>{row.playerName}</strong><small>{row.fixture ?? row.savedAt.slice(0,10)}</small></td><td>{fmt(row.predicted)}</td><td><input aria-label={`Tatsächlicher Sorare-Score für ${row.playerName}`} type="number" min="0" max="500" step="0.1" value={row.actual ?? ""} placeholder="Eintragen" onChange={e => setTracked(items => setActual(items,row.key,e.target.value === "" ? null : Number(e.target.value)))}/></td><td>{row.actual === null ? "—" : fmt(row.predicted-row.actual)}</td><td><button type="button" className="delete-tracking" aria-label={`Prognose für ${row.playerName} löschen`} onClick={() => setTracked(items=>items.filter(item=>item.key!==row.key))}>Entfernen</button></td></tr>)}
          </tbody></table></div>
          {!tracked.length && <div className="empty-state">Noch keine Prognosen gespeichert. Öffne einen Spieler und klicke auf „Prognose merken“ oder speichere ein vollständiges Lineup.</div>}
        </section>
        {selectedPlayer && <div className="profile-overlay" onMouseDown={e => {if (e.target === e.currentTarget) setSelectedPlayerId(null);}}>
          <div className="profile-dialog" role="dialog" aria-modal="true" aria-label={`Spielerprofil ${selectedPlayer.name}`}>
            <button className="profile-close" type="button" autoFocus onClick={() => setSelectedPlayerId(null)} aria-label="Profil schließen">×</button>
            <div className="profile-head"><PlayerAvatar player={selectedPlayer}/><div><span className="section-kicker">SPIELERPROFIL · {sport === "nba" ? "NBA" : league === "__all" ? "FUẞBALL" : league}</span><h2>{selectedPlayer.name}</h2><p>{selectedPlayer.team} · {POS_LABEL[selectedPlayer.position] ?? selectedPlayer.position}</p></div></div>
            <div className="profile-stats">
              <div><small>Erwarteter Score inkl. Einsatzrisiko</small><strong>{((selectedPlayer.sampleSize > 0 || selectedPlayer.proj !== null || selectedPlayer.avg !== null) ? fmt(selectedPlayer.weighted) : "—")}</strong></div>
              <div><small>Bei Einsatz</small><strong>{((selectedPlayer.sampleSize > 0 || selectedPlayer.proj !== null || selectedPlayer.avg !== null) ? fmt(selectedPlayer.expected) : "—")}</strong></div>
              <div><small>Einsatzwahrscheinlichkeit (Modell)</small><strong>{Math.round(selectedPlayer.playProb*100)} %</strong></div>
              <div><small>Floor / Ceiling (heuristisch)</small><strong>{(selectedPlayer.sampleSize > 0 || selectedPlayer.proj !== null || selectedPlayer.avg !== null) ? `${fmt(selectedPlayer.floor)} – ${fmt(selectedPlayer.ceiling)}` : "—"}</strong></div>
            </div>
            <section className="profile-forecast-explain" aria-label="Prognose transparent erklärt">
              <div className="profile-forecast-title"><h3>Wie entsteht die Prognose?</h3><span>{selectedPlayer.forecastSources.length ? `${selectedPlayer.forecastSources.length} Datenquellen` : "Keine Score-Datenquelle"}</span></div>
              {selectedPlayer.forecastSources.length ? <>
                <p>Die Grundlage ist ein nach Datenabdeckung gewichteter Mittelwert. Wenige historische Einzelscores bekommen bewusst weniger Gewicht.</p>
                <div className="profile-forecast-sources">{selectedPlayer.forecastSources.map((source,index)=><div className="forecast-source-row" key={`${source.label}-${index}`}>
                  <span><strong>{source.label}</strong><small>{source.origin}</small></span>
                  <span><strong>{fmt(source.value)} Pkt.</strong><small>{Math.round(source.share*100)} % Gewicht</small></span>
                  <div className="forecast-source-track"><span style={{width:`${Math.round(source.share*100)}%`}}/></div>
                </div>)}</div>
                <p className="forecast-calc-note">Danach werden die vorhandene Gegnerbewertung ({fmt(selectedPlayer.matchupAdjustmentPct)} %) und eine optionale Minutenkorrektur ({fmt(selectedPlayer.minutesAdjustmentPct)} %) berücksichtigt. Für den risikoangepassten Wert wird anschließend die modellierte Einsatzchance einbezogen.</p>
              </> : <p>Für diesen Spieler liegen keine verwertbaren Score-Eingaben vor. Es wird bewusst keine erfundene Punkteprognose gezeigt.</p>}
              <div className="forecast-form-status"><strong>Formtrend:</strong> {selectedPlayer.formDirection === "unbekannt" ? "Nicht genügend getrennte historische Spielwerte" : `${selectedPlayer.formDirection} (${selectedPlayer.formChangePct !== null && selectedPlayer.formChangePct>0?"+":""}${fmt(selectedPlayer.formChangePct ?? 0)} % letzte fünf vs. ältere Spiele)`} <small>Der Trend ist nur eine Information und kein zusätzlicher Punktemultiplikator.</small></div>
            </section>
            <h3>Formkurve · letzte {profileScores.length} Scores</h3>
            {profileScores.length ? <div className="score-bars">{[...profileScores].reverse().map((score,i) => <div key={i} title={`${fmt(score)} Punkte`}><span style={{height:`${Math.min(100, Math.max(4, score / Math.max(1,...profileScores) * 100))}%`}}/><small>{fmt(score)}</small></div>)}</div> : <p className="profile-muted">{historyLoading ? "Historische Scores werden geladen …" : historyError ? "Einzelscores konnten aktuell nicht geladen werden. L5/L10-Durchschnittswerte bleiben nutzbar, sofern Sorare sie liefert." : "Keine historischen Einzelscores von Sorare verfügbar."}</p>}
            <div className="profile-detail-grid"><p><strong>Nächstes Spiel:</strong> {selectedPlayer.nextGame ?? "Nicht verfügbar"}</p><p><strong>Gegner:</strong> {selectedPlayer.opponent ?? "Nicht verfügbar"}</p><p><strong>Form L5 / L10:</strong> {selectedPlayer.last5Avg === null ? "—" : fmt(selectedPlayer.last5Avg)} / {selectedPlayer.last10Avg === null ? "—" : fmt(selectedPlayer.last10Avg)}</p><p><strong>Datenabdeckung:</strong> {selectedPlayer.confidence} ({profileScores.length} Einzelscores; ggf. separate L5/L10-Mittelwerte)</p><p><strong>Bewertung Gegner:</strong> {matchupLabel(selectedPlayer.opponentRating)} {selectedPlayer.opponentRating !== null ? (opponentRatings[selectedPlayer.opponent ?? ""] ? "· manuell" : "· automatisch") : ""}</p><p><strong>Verletzungseinträge:</strong> {selectedPlayer.injuries}</p></div>
            <div className="profile-actions"><button className="action-primary" type="button" onClick={() => saveTracked(selectedPlayer)}>{tracked.some(t=>t.key===createTrackedPrediction(selectedPlayer,sport).key) ? "Prognose gespeichert ✓" : "Prognose merken"}</button><button type="button" onClick={() => updateCard(selectedPlayer.id,{locked:!selectedCard.locked, excluded:false})}>{selectedCard.locked ? "Fixierung lösen" : "Für Lineup fixieren"}</button><button type="button" onClick={() => updateCard(selectedPlayer.id,{owned:!selectedCard.owned})}>{selectedCard.owned ? "Aus Kartenbestand entfernen" : "Als eigene Karte markieren"}</button></div>
            <p className="profile-muted">Für den Lineup Builder zählen weiterhin die eingetragenen NBA-Sterne und Kartenboni. Für Spieler ohne aktuelle Sorare-Projektion sind Prognosen nicht belastbar.</p>
          </div>
        </div>}
        <footer className="app-footer"><strong>MARKERRAS SORARE HELPER</strong><span>Independent Sorare companion · Nicht mit Sorare verbunden · Kein automatisches Einreichen von Lineups</span></footer>
      </main>
    </div>
  );
}

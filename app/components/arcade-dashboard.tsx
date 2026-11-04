"use client";

import MySorareCollection from "@/app/components/my-sorare-collection";
import {ownedSlugs,mergeVerifiedOwned,ownedViewKey,isInSelectedCollection,bestOwnedBonusByPlayer,activeFootballSetReady,type OwnedCollection} from "@/lib/my-collection";

import Link from "next/link";
import BuilderWorkspace from "@/app/components/builder-workspace";
import DailyMissionPicker from "@/app/components/daily-mission-picker";
import {automaticCaptainLineup} from "@/lib/lineup-v29";
import GameweekCenter from "@/app/components/gameweek-center";
import HiddenGems from "@/app/components/hidden-gems";
import DataHealthCenter from "@/app/components/data-health-center";
import ArcadeIntelligenceLab from "@/app/components/arcade-intelligence-lab";
import PredictionLabPro from "@/app/components/prediction-lab-pro";
import PredictionLearningCloud from "@/app/components/prediction-learning-cloud";
import AutoBuilderSettings from "@/app/components/auto-builder-settings";
import {initialV30State,restoreV30State,v30Key,v30ForTeam,limitLineupReuse,type BuilderV30State,type BuilderV30Settings} from "@/lib/builder-v30";
import {buildArcadeIntelligence} from "@/lib/arcade-intelligence";
import {buildNbaStarsOptimizer,assessNbaStarsLineup,lineupChanges,NBA_STARS_MODES,type NbaStarsMode,type NbaLineupDiversity} from "@/lib/nba-stars-optimizer";
import type {FetchSummary} from "@/lib/data-health";
import type {ScheduleData} from "@/lib/gameweek-center";
import {canonicalNbaTeam} from "@/lib/nba-fixture-mapping";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {presetStorageKey,readOptimizerPresets,saveOptimizerPreset,deleteOptimizerPreset,type OptimizationPreset} from "@/lib/qol-presets";
import {compareOptimizedLineups} from "@/lib/lineup-compare-v35";
import {gamedayPulse,neonSmartAdvisor,portfolioPulse,diversifyPortfolio,predictionRealityCheck} from "@/lib/neon-v39";
import type { Forecast, Sport } from "@/lib/model";
import {availabilityForPlayers,isConfirmedOut} from "@/lib/availability";
import {useAvailability} from "@/app/hooks/use-availability";
import type { Strategy } from "@/lib/arcade";
import { enrichForecast, matchupLabel, validDefenseRating, type OpponentRatings } from "@/lib/matchups";
import { optimizeArcadeLineups, isValidNbaStars, type CardInput } from "@/lib/arcade";
import { ARCADE } from "@/config/divination";
import type { Club } from "@/lib/sorare";
import {nbaStarValue,officialStarValue,validatedRatings,type NbaStarRatings,type NbaStarSync} from "@/lib/nba-stars";
import { createTrackedPrediction, upsertTracked, setActual, trackingMetrics, applyOfficialResults, parseTrackingBackup, calibrationSuggestion, type TrackedPrediction } from "@/lib/tracking";
import { pendingForAutoCheck, type AutomaticResult } from "@/lib/tracking-auto";
import {alignOpponentNames, type AutomaticMatchupData} from "@/lib/auto-matchups";
import {buildForecastV18, pointsAtLeast, type ForecastV18} from "@/lib/forecast-v18";
import {buildPredictionV2,backtestPredictionV2,type PredictionV2} from "@/lib/prediction-engine-v2";
import {backtestForecasts} from "@/lib/backtesting";
import {loadArchive, persistArchive} from "@/lib/prediction-db";
import {parseWatchlist, toggleWatchlist, watchlistKey} from "@/lib/watchlist";
import {automaticSnapshotCandidates} from "@/lib/snapshot-policy";
import type {TrackingModelSnapshot} from "@/lib/tracking";

type CardSettings = {
  owned?: boolean; stars?: number | null; bonusPercent?: number; starSource?: "sorare";bonusSource?:"sorare";
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
  nbaSchedule: ScheduleData;
  fetchSummary: FetchSummary;
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

export default function ArcadeDashboard({sport, league, leagues, team, clubs, players: basePlayers, info, error, automaticMatchups, nbaSchedule, fetchSummary}: Props) {
  const injuryTipoffs=useMemo(()=>basePlayers.map(p=>p.nextGameTipoff),[basePlayers]);
  const availability=useAvailability(sport,league,injuryTipoffs);
  // Stable props keep the manual editor from re-rendering on unrelated tab/search changes.
  const builderAvailability=useMemo(()=>availability,[availability.data,availability.loading,availability.error,availability.changes,availability.refresh,availability.intervalMs]);
  const injuryById=useMemo(()=>availability.data?availabilityForPlayers(basePlayers,availability.data.reports,sport):{},[availability.data,basePlayers,sport]);
  const [activeTab,setActiveTab]=useState<"builder"|"players"|"analytics"|"collection"|"missions">("builder");
  // Preserve the Mission workspace when users switch a league/team or sport via a URL.
  useEffect(()=>{
    try {if(new URLSearchParams(window.location.search).get("tab")==="missions")setActiveTab("missions");}
    catch { /* URL access is optional; the default Builder tab still works. */ }
  },[]);
  const [compactExplorer,setCompactExplorer]=useState(true);
  const [showCloudLearning,setShowCloudLearning]=useState(false);
  const [gameweekOpen,setGameweekOpen]=useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch=useDeferredValue(search);
  const searchRef = useRef<HTMLInputElement|null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loadedWatchSport, setLoadedWatchSport] = useState<Sport|null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [manualRequest, setManualRequest] = useState<{id:string;seq:number}|null>(null);
  const [quickNotice, setQuickNotice] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [profileHistories, setProfileHistories] = useState<Record<string, number[]>>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [tracked, setTracked] = useState<TrackedPrediction[]>([]);
  const [modelMode, setModelMode] = useState<"v18"|"classic"|"v2">("v2");
  const [autoArchiveEnabled, setAutoArchiveEnabled] = useState(false);
  const [archiveBackend, setArchiveBackend] = useState<"indexeddb"|"localStorage">("localStorage");
  const writeQueue = useRef<Promise<unknown>>(Promise.resolve());
  const [loadedTrackingSport, setLoadedTrackingSport] = useState<Sport | null>(null);
  const [trackingCheck, setTrackingCheck] = useState<{running:boolean;message:string}>({running:false,message:""});
  const autoCheckAttempt = useRef<Sport|null>(null);
  const checkingRef = useRef(false);
  const sportRef = useRef(sport);
  sportRef.current = sport;
  const [position, setPosition] = useState("all");
  const [sortBy, setSortBy] = useState("weighted");
  const [showCount, setShowCount] = useState(40);
  const [ownedOnly, setOwnedOnly] = useState(false);
  // One clear choice for manual and automatic builders; stored separately per sport.
  useEffect(()=>{
    try{setOwnedOnly(window.localStorage.getItem(ownedViewKey(sport))==="true");}
    catch{setOwnedOnly(false);}
  },[sport]);
  const setCollectionOnly=(enabled:boolean)=>{
    setOwnedOnly(enabled);setActiveResult(0);setIntelligencePickKey(null);
    try{window.localStorage.setItem(ownedViewKey(sport),String(enabled));}catch{}
  };
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const [hasForecastOnly, setHasForecastOnly] = useState(false);
  const [cardStore, setCardStore] = useState<CardStore>({});
  const [verifiedCollection,setVerifiedCollection]=useState<OwnedCollection|null>(null);
  const verifiedOwnedReady=verifiedCollection?.complete===true&&(sport==="nba"||activeFootballSetReady(verifiedCollection));
  const [officialStars,setOfficialStars] = useState<NbaStarRatings>({});
  const [starSync,setStarSync] = useState<{phase:"idle"|"loading"|"ready"|"error";snapshot:NbaStarSync|null;message:string}>({phase:"idle",snapshot:null,message:""});
  const starRequestSeq=useRef(0);
  const playerStarSlugs=useMemo(()=>sport==="nba"?basePlayers.map(p=>p.id):[],[sport,basePlayers]);
  const starScopeKey=playerStarSlugs.join("|");
  const fetchOfficialStars=async (refresh=false,slugs=playerStarSlugs,scope=starScopeKey)=>{
    const requestId=++starRequestSeq.current;
    setStarSync(prev=>({phase:"loading",snapshot:prev.snapshot,message:""}));
    try{
      const response=await fetch("/api/nba-stars",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({slugs,refresh}),cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(typeof data?.error==="string"?data.error:"Sterneabruf nicht erreichbar");
      if(requestId!==starRequestSeq.current||scope!==starScopeKey)return;
      const ratings=validatedRatings(data?.ratings,new Set(slugs));
      setOfficialStars(ratings);
      setStarSync({phase:"ready",snapshot:{...data,ratings},message:data?.failedChunks?"Ein Teil des Sorare-Sterneabrufs ist fehlgeschlagen.":""});
    }catch(e){
      if(requestId!==starRequestSeq.current||scope!==starScopeKey)return;
      // Keep earlier official values on a failed manual refresh; stored manual
      // card settings remain untouched in either case.
      setStarSync(prev=>({phase:"error",snapshot:prev.snapshot,message:e instanceof Error?e.message:"Sterneabruf nicht möglich."}));
    }
  };
  useEffect(()=>{
    if(sport!=="nba"||!playerStarSlugs.length){++starRequestSeq.current;setOfficialStars({});setStarSync({phase:"idle",snapshot:null,message:""});return;}
    setOfficialStars({});setStarSync({phase:"loading",snapshot:null,message:""});
    void fetchOfficialStars(false,playerStarSlugs,starScopeKey);
    return ()=>{++starRequestSeq.current;};
    // Scope key is stable across renders; a changed NBA roster starts a fresh sync.
  },[sport,starScopeKey]);
  const effectiveCardStore:CardStore=useMemo(()=>{
    const verified=verifiedOwnedReady&&verifiedCollection?ownedSlugs(verifiedCollection,sport):[];
    const base=mergeVerifiedOwned(cardStore,verified,verifiedOwnedReady);
    const merged:CardStore={...base};
    const activeBonuses=bestOwnedBonusByPlayer(verifiedCollection,sport);
    // A saved Sorare bonus may belong to an expired Set; it must not leak into
    // a new Set's lineup, including for a player also present in both Sets.
    if(sport==="football"&&verifiedOwnedReady){
      for(const [id,card] of Object.entries(merged)){
        if(card.bonusSource!=="sorare"||Object.prototype.hasOwnProperty.call(activeBonuses,id))continue;
        const {bonusPercent:_oldBonus,bonusSource:_oldSource,...rest}=card;
        merged[id]=rest;
      }
    }
    for(const [id,bonus] of Object.entries(activeBonuses)){
      merged[id]={...merged[id],bonusPercent:bonus,bonusSource:"sorare"};
    }
    if(sport!=="nba"||!Object.keys(officialStars).length)return merged;
    for(const [id,stars] of Object.entries(officialStars)){
      if(officialStarValue(stars)!==null)merged[id]={...merged[id],stars,starSource:"sorare"};
    }
    return merged;
  },[sport,cardStore,officialStars,verifiedCollection,verifiedOwnedReady]);
  const [opponentRatings, setOpponentRatings] = useState<OpponentRatings>({});
  const [loadedRatingSport, setLoadedRatingSport] = useState<Sport | null>(null);
  const [loadedSport, setLoadedSport] = useState<Sport | null>(null);
  const [activeResult, setActiveResult] = useState(0);
  const [portfolioDiversity,setPortfolioDiversity]=useState(false);
  const [showQuickActions,setShowQuickActions]=useState(false);
  const [builderMode, setBuilderMode] = useState<"automatic" | "manual">("manual");
  const [strategy, setStrategy] = useState<Strategy>("balanced");
  const [nbaStarsMode,setNbaStarsMode]=useState<NbaStarsMode>("max");
  const [nbaVariantKey,setNbaVariantKey]=useState<string|null>(null);
  const [nbaDiversity,setNbaDiversity]=useState<NbaLineupDiversity>(2);
  const [nbaDiversityLoaded,setNbaDiversityLoaded]=useState(false);
  useEffect(()=>{
    try{const stored=Number(window.localStorage.getItem("neon:nba-diversity-v32"));if(stored===1||stored===2||stored===3)setNbaDiversity(stored);}
    catch{}setNbaDiversityLoaded(true);
  },[]);
  useEffect(()=>{if(!nbaDiversityLoaded)return;try{window.localStorage.setItem("neon:nba-diversity-v32",String(nbaDiversity));}catch{}},[nbaDiversity,nbaDiversityLoaded]);
  const updateNbaDiversity=(value:NbaLineupDiversity)=>{
    setNbaDiversity(value);setNbaVariantKey(null);setActiveResult(0);setIntelligencePickKey(null);
  };
  const [v30State,setV30State]=useState<BuilderV30State>(initialV30State);
  const [presetName,setPresetName]=useState("");
  const [optimizerPresets,setOptimizerPresets]=useState<OptimizationPreset[]>([]);
  const [presetSelected,setPresetSelected]=useState("");
  const [presetLoadedFor,setPresetLoadedFor]=useState<Sport|null>(null);
  const [presetNotice,setPresetNotice]=useState("");
  useEffect(()=>{
    setPresetLoadedFor(null);setPresetSelected("");setPresetNotice("");
    try{setOptimizerPresets(readOptimizerPresets(JSON.parse(window.localStorage.getItem(presetStorageKey(sport))??"[]"),sport));}
    catch{setOptimizerPresets([]);}
    setPresetLoadedFor(sport);
  },[sport]);
  useEffect(()=>{if(presetLoadedFor!==sport)return;
    try{window.localStorage.setItem(presetStorageKey(sport),JSON.stringify(optimizerPresets));}catch{}
  },[optimizerPresets,sport,presetLoadedFor]);
  const [v30Loaded,setV30Loaded]=useState<Sport|null>(null);
  const [v30EditTeam,setV30EditTeam]=useState("team-1");
  useEffect(()=>{
    setV30Loaded(null);setV30EditTeam("team-1");
    try{setV30State(restoreV30State(JSON.parse(window.localStorage.getItem(v30Key(sport))??"null")));}
    catch{setV30State(initialV30State());}
    setV30Loaded(sport);
  },[sport]);
  useEffect(()=>{if(v30Loaded!==sport)return;try{window.localStorage.setItem(v30Key(sport),JSON.stringify(v30State));}catch{}},[v30State,sport,v30Loaded]);
  const [intelligencePickKey,setIntelligencePickKey]=useState<string|null>(null);
  const [autoCaptainChoice,setAutoCaptainChoice]=useState<{key:string;playerId:string}|null>(null);
  const [target, setTarget] = useState(sport === "football" ? "180" : "");

  // Personal watchlist is kept apart from "owned cards" (favorite != owned).
  useEffect(() => {
    setLoadedWatchSport(null);
    try {setWatchlist(parseWatchlist(JSON.parse(window.localStorage.getItem(watchlistKey(sport)) ?? "[]")));}
    catch {setWatchlist([]);}
    setLoadedWatchSport(sport);
  }, [sport]);
  useEffect(() => {
    if (loadedWatchSport !== sport) return;
    try {window.localStorage.setItem(watchlistKey(sport),JSON.stringify(watchlist));} catch {}
  }, [sport,loadedWatchSport,watchlist]);
  const navigate=(tab:typeof activeTab,anchor?:string)=>{
    setActiveTab(tab);setShowQuickActions(false);
    window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{
      if(anchor)document.getElementById(anchor)?.scrollIntoView({behavior:"smooth",block:"start"});
      else window.scrollTo({top:0,behavior:"auto"});
    }));
  };
  useEffect(() => {
    const handler=(e:KeyboardEvent)=>{
      const target=e.target as HTMLElement|null;
      if((e.key.toLowerCase()==='k')&&(e.ctrlKey||e.metaKey)) {e.preventDefault();setShowQuickActions(open=>!open);return;}
      if(e.key==='Escape')setShowQuickActions(false);
      if(e.key==="/" && !e.altKey && !e.ctrlKey && !e.metaKey && target?.tagName!=="INPUT" && target?.tagName!=="TEXTAREA" && target?.tagName!=="SELECT" && !target?.isContentEditable){
        e.preventDefault();setActiveTab("players");window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{searchRef.current?.focus();document.getElementById("spieler")?.scrollIntoView({behavior:"smooth",block:"start"});}));
      }
      if(e.key==="Escape" && document.activeElement===searchRef.current)searchRef.current?.blur();
    };
    document.addEventListener("keydown",handler);
    return ()=>document.removeEventListener("keydown",handler);
  },[]);
  const queueManualPlayer=(id:string)=>{
    setBuilderMode("manual");
    setManualRequest(old=>({id,seq:(old?.seq??0)+1}));
    setSelectedPlayerId(null);
    setQuickNotice("Spieler wird dem ersten passenden freien Slot zugeordnet. Kartenregeln werden im Builder geprüft.");
    navigate("builder","lineup-builder");
  };
  const toggleFavorite=useCallback((id:string)=>setWatchlist(prev=>toggleWatchlist(prev,id)),[]);
  const exploreGameweekTeam=(name:string)=>{
    const match=sport==="nba"?clubs.find(c=>canonicalNbaTeam(c.name)!==null&&canonicalNbaTeam(c.name)===canonicalNbaTeam(name)):null;
    setSearch(match?.name??name);setPosition("all");setShowCount(40);
    navigate("players","spieler");
  };
  const applyArcadeGoal=(goal:number)=>{
    setTarget(String(goal));setStrategy("target");setBuilderMode("manual");
    navigate("builder","lineup-builder");
  };

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
    setSearch(""); setPosition("all"); setShowCount(40); setActiveResult(0); setFavoritesOnly(false); setQuickNotice(""); setManualRequest(null);
    setTarget(sport === "football" ? "180" : "");
  }, [sport]);

  // The browser-local IndexedDB is the durable archive. Existing V1.7 localStorage
  // snapshots are migrated without altering saved forecasts or actual scores.
  useEffect(() => {
    let active = true;
    setLoadedTrackingSport(null);
    setAutoArchiveEnabled(false);
    try {
      setAutoArchiveEnabled(window.localStorage.getItem(`markerras.sorare.auto-archive.v18.${sport}`) !== "off");
      const current=window.localStorage.getItem(`neon:prediction-engine-v33.${sport}`);
      const legacy=window.localStorage.getItem(`markerras.sorare.model.v18.${sport}`);
      setModelMode(current==="v2"||current==="v18"||current==="classic"?current:
        legacy==="v18"||legacy==="classic"?legacy:"v2");
    } catch {setModelMode("v2");}
    void loadArchive(sport).then(({rows,backend})=>{
      if(!active)return;
      setTracked(rows);setArchiveBackend(backend);setLoadedTrackingSport(sport);
    }).catch(()=>{if(active){setTracked([]);setArchiveBackend("localStorage");setLoadedTrackingSport(sport);}});
    return()=>{active=false;};
  }, [sport]);
  useEffect(() => {
    if (loadedTrackingSport !== sport) return;
    writeQueue.current=writeQueue.current.catch(()=>undefined).then(()=>persistArchive(sport,tracked)).then(backend=>{
      if(sportRef.current===sport)setArchiveBackend(backend);
    }).catch(()=>undefined);
  }, [tracked, sport, loadedTrackingSport]);
  useEffect(()=>{
    if(loadedTrackingSport!==sport)return;
    try{
      localStorage.setItem(`markerras.sorare.auto-archive.v18.${sport}`,autoArchiveEnabled?"on":"off");
      localStorage.setItem(`neon:prediction-engine-v33.${sport}`,modelMode);
      if(modelMode==="v18"||modelMode==="classic")localStorage.setItem(`markerras.sorare.model.v18.${sport}`,modelMode);
    }catch{}
  },[sport,autoArchiveEnabled,modelMode,loadedTrackingSport]);
  // Each browser visit checks a small set of prior saved fixtures once.
  // No scores are inferred from L5/L10 or the latest player's score.
  const checkSavedResults = async (quiet = false) => {
    if (checkingRef.current || loadedTrackingSport !== sport) return;
    const pending = pendingForAutoCheck(tracked).slice(0,12);
    if (!pending.length) {
      if (!quiet) setTrackingCheck({running:false,message:"Keine prüfbaren, offenen Spiele. Fehlende Spieltermine benötigen eine manuelle Eingabe."});
      return;
    }
    checkingRef.current = true;
    setTrackingCheck({running:true,message:`Prüfe ${pending.length} gespeicherte Prognosen bei Sorare …`});
    try {
      const response = await fetch("/api/tracking-results",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({items:pending}),cache:"no-store",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: unknown = await response.json();
      const payload = data as {matched?:AutomaticResult[];checked?:number;failures?:number};
      if (!Array.isArray(payload.matched)) throw new Error("Ungültige Antwort");
      if (sportRef.current === sport) {
        const valid = payload.matched.filter(r => r && typeof r.key === "string" && typeof r.score === "number" &&
          Number.isFinite(r.score) && r.score >= 0 && r.score <= 500 && typeof r.gameDate === "string");
        setTracked(old => applyOfficialResults(old,valid));
        const failures = Number(payload.failures ?? 0);
        setTrackingCheck({running:false,message:`${valid.length} offizielle Ergebnisse zugeordnet · ${pending.length} Prognosen geprüft${failures ? ` · ${failures} API-Fehler (erneut versuchen)` : ""}. Nicht eindeutig zuordenbare Ergebnisse bleiben offen.`});
      }
    } catch {
      if (sportRef.current === sport) setTrackingCheck({running:false,message:"Sorare-Ergebnisse aktuell nicht erreichbar. Deine gespeicherten Prognosen sind unverändert; später erneut versuchen."});
    } finally {checkingRef.current = false;}
  };
  useEffect(() => {
    if (loadedTrackingSport !== sport || autoCheckAttempt.current === sport) return;
    autoCheckAttempt.current = sport;
    void checkSavedResults(true);
  }, [loadedTrackingSport,sport,tracked]);

  const exportTracking = () => {
    const json = JSON.stringify({version:2,model:"V1.8",sport,exportedAt:new Date().toISOString(),items:tracked},null,2);
    const url = URL.createObjectURL(new Blob([json],{type:"application/json"}));
    const a = document.createElement("a");
    a.href=url; a.download=`markerras-prognosen-${sport}.json`;a.click();
    URL.revokeObjectURL(url);
  };
  const importTracking = async (file: File | undefined) => {
    if (!file || file.size > 1_600_000) {setTrackingCheck({running:false,message:"Datei fehlt oder ist zu groß (maximal 1,6 MB)."});return;}
    try {
      const json:unknown = JSON.parse(await file.text());
      const rows = parseTrackingBackup(json,sport);
      if (!rows.length) throw new Error("Keine gültigen Prognosen für diese Sportart");
      setTracked(old=>rows.reduce((items,row)=>upsertTracked(items,row),old));
      setTrackingCheck({running:false,message:`${rows.length} Prognosen aus der Sicherung eingelesen (bestehende Einträge bleiben erhalten).`});
    } catch {setTrackingCheck({running:false,message:"Import fehlgeschlagen: Bitte eine gültige Prognose-JSON dieser Sportart wählen."});}
  };

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

  const updateCard = useCallback((id: string, patch: CardSettings) =>
    setCardStore(s => ({...s, [id]: {...(s[id] ?? {}), ...patch}})),[]);

  const opponentNames=useMemo(()=>[...new Set([...basePlayers.map(p=>p.opponent).filter((n):n is string=>Boolean(n)),...(sport==="nba"?nbaSchedule.fixtures.flatMap(f=>[f.home,f.away]):[])])], [basePlayers,nbaSchedule,sport]);
  const alignedAutoRatings=useMemo(()=>alignOpponentNames(automaticMatchups.ratings,opponentNames),[automaticMatchups,opponentNames]);
  const effectiveRatings=useMemo(()=>({...alignedAutoRatings,...opponentRatings}),[alignedAutoRatings,opponentRatings]);
  // Card ownership, bonus, stars and lock changes must NOT recalculate every
  // player's expensive v1.8/v2 prediction. Cache per-player input signatures;
  // genuine scouting, opponent, roster or model changes still recompute as needed.
  type CachedPrediction=Forecast & {modelV18:ForecastV18;modelV2:PredictionV2};
  type PredictionEntry={base:Forecast;ratings:OpponentRatings;sport:Sport;mode:typeof modelMode;
    expectedMinutes?:number|null;typicalMinutes?:number|null;xg?:number|null;xa?:number|null;value:CachedPrediction};
  const predictionCache=useRef(new Map<string,PredictionEntry>());
  const players = useMemo(() => {
    const next=new Map<string,PredictionEntry>();
    const result=basePlayers.map(p => {
      const scouting=cardStore[p.id];
      const prior=predictionCache.current.get(p.id);
      if(prior&&prior.base===p&&prior.ratings===effectiveRatings&&prior.sport===sport&&prior.mode===modelMode&&
        prior.expectedMinutes===scouting?.expectedMinutes&&prior.typicalMinutes===scouting?.typicalMinutes&&
        prior.xg===scouting?.xg&&prior.xa===scouting?.xa){
        next.set(p.id,prior);
        return prior.value;
      }

    const scouted=enrichForecast(p, sport, effectiveRatings, {
      expectedMinutes: cardStore[p.id]?.expectedMinutes,
      typicalMinutes: cardStore[p.id]?.typicalMinutes,
      xg: cardStore[p.id]?.xg,
      xa: cardStore[p.id]?.xa,
    });
    const modelV18=buildForecastV18(scouted,sport);
    const modelV2=buildPredictionV2(scouted,sport);
    const value={...scouted,modelV18,modelV2,
      ...(modelMode === "v18" && modelV18.applicable ? {
        expected:modelV18.advancedExpected,weighted:modelV18.advancedWeighted,
        floor:modelV18.conditionalLow,ceiling:modelV18.conditionalHigh,
        variability:modelV18.conditionalSd,
      } : modelMode === "v2" && modelV2.applicable ? {
        expected:modelV2.expected,weighted:modelV2.weighted,
        floor:modelV2.floor,ceiling:modelV2.ceiling,
        variability:modelV2.conditionalSd,confidence:modelV2.quality,
      } : {})};
    next.set(p.id,{base:p,ratings:effectiveRatings,sport,mode:modelMode,
      expectedMinutes:scouting?.expectedMinutes,typicalMinutes:scouting?.typicalMinutes,
      xg:scouting?.xg,xa:scouting?.xa,value});
    return value;
    });
    predictionCache.current=next;
    return result;
  }, [basePlayers, sport, effectiveRatings, cardStore,modelMode]);
  // Automatic snapshots are only taken for known fixture dates strictly in the
  // future; today's fixture lacks a trusted kickoff time and is not auto-saved.
  useEffect(()=>{
    if(loadedTrackingSport!==sport||!autoArchiveEnabled||basePlayers.length===0)return;
    const candidates=automaticSnapshotCandidates(players,sport,new Date(),20);
    if(!candidates.length)return;
    setTracked(old=>{
      const existing=new Set(old.map(row=>row.key));
      const additions=candidates.map(p=>createTrackedPrediction(p,sport,new Date(),{
        baselinePredicted:p.modelV18.baselineWeighted,
        advancedPredicted:p.modelV18.advancedWeighted,
        intervalP10:p.modelV18.unconditionalP10,
        intervalP90:p.modelV18.unconditionalP90,
        modelVersion:"1.8.0",selectedMode:modelMode,
        engineV2Predicted:p.modelV2.weighted,engineV2P10:p.modelV2.unconditionalP10,engineV2P90:p.modelV2.unconditionalP90,
      })).filter(row=>!existing.has(row.key));
      if(!additions.length)return old;
      return [...additions,...old].slice(0,1500);
    });
  },[players,sport,loadedTrackingSport,autoArchiveEnabled,basePlayers.length,modelMode]);
  const opponents = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of players) if (p.opponent && p.hasGame !== false) counts.set(p.opponent, (counts.get(p.opponent) ?? 0) + 1);
    return [...counts.entries()].sort((a,b)=>a[0].localeCompare(b[0], "de"));
  }, [players]);
  const ratedOpponents = opponents.filter(([name]) => validDefenseRating(effectiveRatings[name])).length;
  const matchupPicks = useMemo(()=>activeTab==="analytics"?players.filter(p => p.opponentRating !== null && p.hasGame !== false && p.weighted > 0)
    .sort((a,b) => b.matchupAdjustmentPct - a.matchupAdjustmentPct || b.weighted - a.weighted).slice(0, 8):[],[players,activeTab]);
  const lockedIds = useMemo(() => players.filter(p => cardStore[p.id]?.locked&&!isConfirmedOut(injuryById[p.id])&&
    isInSelectedCollection(p.id,effectiveCardStore,ownedOnly,verifiedOwnedReady)).map(p => p.id), [players,cardStore,injuryById,effectiveCardStore,ownedOnly,verifiedOwnedReady]);
  const excludedIds = useMemo(() => players.filter(p => cardStore[p.id]?.excluded||isConfirmedOut(injuryById[p.id])).map(p => p.id), [players, cardStore,injuryById]);
  const eligibleCards: CardInput[] = useMemo(() => players.map((p) => ({
    player: p,
    // No manual fallback while the synced-collection-only filter is active.
    owned: effectiveCardStore[p.id]?.owned === true && (!ownedOnly || verifiedOwnedReady),
    stars: effectiveCardStore[p.id]?.stars ?? null,
    bonusPercent: effectiveCardStore[p.id]?.bonusPercent ?? 0,
  })), [players, effectiveCardStore, ownedOnly, verifiedOwnedReady]);

  const dailyMissionOwnedIds=useMemo(()=>{
    // With no verified current Football Set, never substitute old browser flags
    // for confirmed ownership in the Daily Mission Picker.
    if(sport==="football"&&!verifiedOwnedReady)return new Set<string>();
    return new Set(Object.entries(effectiveCardStore).filter(([,card])=>card.owned===true).map(([id])=>id));
  },[effectiveCardStore,sport,verifiedOwnedReady]);
  const dailyMissionExcludedIds=useMemo(()=>new Set(excludedIds),[excludedIds]);
  const gameday=useMemo(()=>gamedayPulse(players,sport,nbaSchedule,dailyMissionOwnedIds,new Date()),[players,sport,nbaSchedule,dailyMissionOwnedIds]);
  const smartAdvice=useMemo(()=>neonSmartAdvisor(players,dailyMissionOwnedIds,sport),[players,dailyMissionOwnedIds,sport]);
  const favoriteSet=useMemo(()=>new Set(watchlist),[watchlist]);
  const ownedCount = players.filter(p => effectiveCardStore[p.id]?.owned).length;
  const ratedCount = players.filter(p => isValidNbaStars(effectiveCardStore[p.id]?.stars)).length;
  const automaticStarCount=players.filter(p=>officialStarValue(officialStars[p.id])!==null).length;
  const manualStarCount=ratedCount-automaticStarCount;
  const hasGameCount = players.filter(p => p.hasGame !== false && p.weighted > 0).length;
  const imageCount = players.filter(p => Boolean(p.imageUrl)).length;
  const totalTarget = Number(target);
  const validTarget = target.trim() !== "" && Number.isFinite(totalTarget) && totalTarget > 0;
  const v30ActiveSettings=v30ForTeam(v30State,v30EditTeam);
  const saveCurrentPreset=()=>{
    const name=presetName.trim().slice(0,45);
    if(!name){setPresetNotice("Bitte zuerst einen Namen eingeben.");return;}
    const row:OptimizationPreset={id:`preset-${Date.now().toString(36)}`,name,sport,
      settings:v30State,strategy,nbaMode:nbaStarsMode,diversity:nbaDiversity,modelMode,ownedOnly,
      createdAt:new Date().toISOString()};
    setOptimizerPresets(prev=>saveOptimizerPreset(prev,row));setPresetSelected(row.id);setPresetName("");
    setPresetNotice(`Preset „${name}“ lokal gespeichert.`);
  };
  const loadCurrentPreset=()=>{
    const preset=optimizerPresets.find(x=>x.id===presetSelected);if(!preset)return;
    setV30State(preset.settings);setStrategy(preset.strategy);setNbaStarsMode(preset.nbaMode);
    updateNbaDiversity(preset.diversity);setModelMode(preset.modelMode);setCollectionOnly(preset.ownedOnly);
    setNbaVariantKey(null);setActiveResult(0);setIntelligencePickKey(null);
    setPresetNotice(`Preset „${preset.name}“ aktiviert. Sorare-Karten bleiben unverändert.`);
  };
  const selectNbaOptimizerMode=(mode:NbaStarsMode,variantKey:string|null=null)=>{
    setNbaStarsMode(mode);setNbaVariantKey(variantKey);setStrategy("balanced");setActiveResult(0);setIntelligencePickKey(null);
    // A deliberate NBA profile selection changes only the optimization preset.
    // All other saved V3.0 settings, manual teams and collection data remain.
    if(v30ActiveSettings.preset==="safe"||v30ActiveSettings.preset==="ceiling"){
      const settings={...v30ActiveSettings,preset:"custom" as const};
      setV30State(prev=>prev.scope==="all"?{...prev,global:settings}:{...prev,teams:{...prev.teams,[v30EditTeam]:settings}});
    }
  };

  const v30AnyChanged=v30State.scope==="team"||JSON.stringify(v30State.global)!==JSON.stringify(initialV30State().global);
  const v30Strategy=(settings:BuilderV30Settings):Strategy=>settings.preset==="safe"?"safe":settings.preset==="ceiling"||settings.preset==="balanced"?"balanced":strategy;
  const v30Options=(settings:BuilderV30Settings)=>({sport,ownedOnly,limit:20,beamWidth:300,maxCandidatesPerSlot:120,
    strategy:v30Strategy(settings),targetScore:validTarget?totalTarget:null,lockedPlayerIds:lockedIds,excludedPlayerIds:excludedIds,
    advancedSettings:settings});
  // V3.1 uses a separate multi-objective star-budget search only for NBA.
  // V3.0 team scope, locked picks, injury exclusions, bonuses, projections,
  // minimum scores and max-reuse rules continue to apply unchanged.
  const nbaStarBoard=useMemo(()=>activeTab==="builder"&&sport==="nba"&&builderMode==="automatic"&&!v30ActiveSettings.excludedLeagues.includes(league)?
    buildNbaStarsOptimizer(eligibleCards,v30Options(v30ActiveSettings),nbaDiversity):null,
    [activeTab,sport,builderMode,eligibleCards,ownedOnly,lockedIds,excludedIds,v30ActiveSettings,league,validTarget,totalTarget,nbaDiversity]);
  const nbaProfileLines=(board:NonNullable<typeof nbaStarBoard>,settings:BuilderV30Settings)=>{
    const effectiveMode=settings.preset==="safe"?"safe":settings.preset==="ceiling"?"upside":nbaStarsMode;
    const candidates=board.pools[effectiveMode];
    const recommended=board.variants.find(v=>v.mode===effectiveMode)?.lineup??null;
    const prioritized=nbaVariantKey&&nbaStarsMode===effectiveMode?
      candidates.find(l=>l.picks.map(p=>p.player.id).sort().join("|")===nbaVariantKey)??recommended:recommended;
    const prioritizedKey=prioritized?.picks.map(p=>p.player.id).sort().join("|");
    const ordered=prioritized?[prioritized,...candidates.filter(l=>l.picks.map(p=>p.player.id).sort().join("|")!==prioritizedKey)]:candidates;
    // The existing Custom "Zielchance" strategy remains available for NBA.
    if(settings.preset==="custom"&&strategy==="target"&&validTarget)
      return [...new Map(Object.values(board.pools).flat().map(l=>[l.picks.map(p=>p.player.id).sort().join("|"),l])).values()].sort((a,b)=>(b.targetProbability??-1)-(a.targetProbability??-1));
    if(settings.preset==="custom"&&strategy==="safe")return board.pools.safe;
    if(settings.preset==="custom"&&strategy==="upside")return board.pools.upside;
    return ordered;
  };
  const lineups = useMemo(() => {
    // Never search lineups when only the manual editor or another workspace is shown.
    if(activeTab!=="builder"||builderMode!=="automatic")return [];
    const poolFor=(settings:BuilderV30Settings)=>settings.excludedLeagues.includes(league)?[]:eligibleCards;
    const makeCandidates=(settings:BuilderV30Settings)=>sport==="nba"?
      nbaProfileLines(buildNbaStarsOptimizer(poolFor(settings),v30Options(settings),nbaDiversity),settings):
      optimizeArcadeLineups(poolFor(settings),v30Options(settings));
    if(v30State.scope==="all"){
      const settings=v30State.global;
      const lines=sport==="nba"&&nbaStarBoard?nbaProfileLines(nbaStarBoard,settings):
        sport==="nba"?[]:optimizeArcadeLineups(poolFor(settings),v30Options(settings));
      return portfolioDiversity?diversifyPortfolio(lines,settings.maxUses,5,.9):limitLineupReuse(lines,settings.maxUses,5);
    }
    const picked:ReturnType<typeof optimizeArcadeLineups>=[],usage=new Map<string,number>();
    const cache=new Map<string,ReturnType<typeof optimizeArcadeLineups>>();
    for(let i=1;i<=5;i++){
      const settings=v30ForTeam(v30State,`team-${i}`);
      const cacheKey=JSON.stringify(settings);
      if(!cache.has(cacheKey))cache.set(cacheKey,makeCandidates(settings));
      const candidates=cache.get(cacheKey)!;
      const chosen=candidates.find(candidate=>candidate.picks.every(p=>(usage.get(p.player.id)??0)<settings.maxUses)&&
        !picked.some(already=>already.picks.map(p=>p.player.id).sort().join("|")===candidate.picks.map(p=>p.player.id).sort().join("|")));
      if(!chosen)continue;
      picked.push(chosen);for(const pick of chosen.picks)usage.set(pick.player.id,(usage.get(pick.player.id)??0)+1);
    }
    return picked;
  }, [activeTab,eligibleCards,sport,ownedOnly,strategy,validTarget,totalTarget,lockedIds,excludedIds,v30State,league,nbaStarsMode,nbaVariantKey,nbaStarBoard,builderMode,nbaDiversity,portfolioDiversity]);
  // The older Intelligence Lab builds independent candidates without V3 rules.
  // Hide it when any advanced constraints are active rather than bypassing them.
  const intelligence=useMemo(()=>activeTab==="builder"&&builderMode==="automatic"&&sport==="football"&&!v30AnyChanged ? buildArcadeIntelligence(eligibleCards,{
    sport,ownedOnly,limit:8,beamWidth:260,maxCandidatesPerSlot:115,
    targetScore:validTarget?totalTarget:null,lockedPlayerIds:lockedIds,excludedPlayerIds:excludedIds,
  }):null,[activeTab,builderMode,eligibleCards,sport,ownedOnly,validTarget,totalTarget,lockedIds,excludedIds,v30AnyChanged]);
  const intelligenceView=useMemo(()=>intelligence&&sport==="football"?{...intelligence,variants:intelligence.variants.map(v=>{
    const lineup=automaticCaptainLineup(v.lineup,sport,injuryById,validTarget?totalTarget:null).lineup!;
    return {...v,lineup,targetGap:intelligence.target===null?null:lineup.projectedScore-intelligence.target};
  })}:intelligence,[intelligence,sport,injuryById,validTarget,totalTarget]);
  const activeIntelligence=intelligence?.variants.find(v=>v.key===intelligencePickKey)??null;
  const chosenBase = activeIntelligence?.lineup??lineups[Math.min(activeResult, lineups.length - 1)] ?? null;
  const autoCaptainKey=chosenBase?.picks.map(p=>p.player.id).join("|")??"";
  const chosenAuto=automaticCaptainLineup(chosenBase,sport,injuryById,validTarget?totalTarget:null,autoCaptainChoice?.key===autoCaptainKey?autoCaptainChoice.playerId:null);
  const chosen=chosenAuto.lineup;
  const nbaChosenAssessment=sport==="nba"&&chosen?assessNbaStarsLineup(chosen):null;
  const nbaMaxLine=nbaStarBoard?.variants.find(v=>v.mode==="max")?.lineup;
  const nbaChosenChanges=nbaMaxLine&&chosen?lineupChanges(nbaMaxLine,chosen):null;
  const nbaChosenLoss=nbaStarBoard&&chosen?nbaStarBoard.referenceScore-chosen.projectedScore:null;
  const shownLineups=useMemo(()=>lineups.map(l=>automaticCaptainLineup(l,sport,injuryById,validTarget?totalTarget:null).lineup!),[lineups,sport,injuryById,validTarget,totalTarget]);
  const autoLineupDiff=shownLineups.length>1&&chosen?compareOptimizedLineups(shownLineups[0],chosen):null;
  const portfolioReport=useMemo(()=>portfolioPulse(shownLineups),[shownLineups]);
  const selectedPlayer = players.find(p => p.id === selectedPlayerId) ?? null;
  const selectedCard = selectedPlayer ? cardStore[selectedPlayer.id] ?? {} : {};
  const profileScores = selectedPlayer ? ((selectedPlayer.recentScores?.length ?? 0) > 0 ? selectedPlayer.recentScores! : profileHistories[selectedPlayer.id] ?? []) : [];
  const metrics = useMemo(() => trackingMetrics(tracked),[tracked]);
  const realityCheck=useMemo(()=>predictionRealityCheck(tracked),[tracked]);
  const backtest = useMemo(() => backtestForecasts(tracked),[tracked]);
  const v2Backtest = useMemo(() => backtestPredictionV2(tracked),[tracked]);
  const withV2 = players.filter(p=>p.modelV2.applicable).length;
  const avgV2Change=withV2?players.filter(p=>p.modelV2.applicable)
    .reduce((sum,p)=>sum+p.modelV2.changePercent,0)/withV2:0;
  const advice = useMemo(() => calibrationSuggestion(tracked),[tracked]);
  const autoPending = pendingForAutoCheck(tracked).length;
  const saveTracked = useCallback((p: Forecast) => {
    const comparison=(p as Forecast & {modelV18?:ForecastV18}).modelV18;
    const v2=(p as Forecast & {modelV2?:PredictionV2}).modelV2;
    const details:TrackingModelSnapshot|undefined=comparison?{
      baselinePredicted:comparison.baselineWeighted,
      advancedPredicted:comparison.advancedWeighted,
      intervalP10:comparison.unconditionalP10,
      intervalP90:comparison.unconditionalP90,
      modelVersion:"1.8.0",selectedMode:modelMode,
      ...(v2?{engineV2Predicted:v2.weighted,engineV2P10:v2.unconditionalP10,engineV2P90:v2.unconditionalP90}:{}),
    }:undefined;
    setTracked(items=>upsertTracked(items,createTrackedPrediction(p,sport,new Date(),details)));
  },[sport,modelMode]);
  const saveLineupForecasts=useCallback((items:Forecast[])=>items.forEach(saveTracked),[saveTracked]);
  const progress = chosen && validTarget ? Math.min(100, chosen.projectedScore / totalTarget * 100) : 0;

  const filtered = useMemo(() => {
    if(activeTab!=="players")return [];
    // Accent-insensitive search, e.g. Mbappe matches Mbappé.
    const normalize = (value: string) => value.toLocaleLowerCase("de-DE").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    const needle = normalize(deferredSearch.trim());
    const source = players.filter((p) => {
      if (position !== "all" && p.position !== position) return false;
      if (hideUnavailable && (p.hasGame === false || p.playProb < .3)) return false;
      if (hasForecastOnly && p.forecastSources.length === 0) return false;
      if (!isInSelectedCollection(p.id,effectiveCardStore,ownedOnly,verifiedOwnedReady)) return false;
      if (favoritesOnly && !favoriteSet.has(p.id)) return false;
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
  }, [activeTab, players, position, hideUnavailable, hasForecastOnly, ownedOnly, verifiedOwnedReady, favoritesOnly, favoriteSet, effectiveCardStore, deferredSearch, sortBy]);
  const positions = Array.from(new Set(players.map(p => p.position))).sort();
  const topPicks = useMemo(()=>activeTab==="players"?players.filter(p => p.hasGame !== false && p.weighted > 0).sort((a,b) => b.weighted - a.weighted).slice(0, 4):[],[players,activeTab]);
  const title = sport === "football" ? "Football Arcade" : "NBA Arcade";
  const favorites=useMemo(()=>{const index=new Map(players.map(p=>[p.id,p]));return watchlist.map(id=>index.get(id)).filter((p):p is typeof players[number]=>Boolean(p));},[watchlist,players]);

  return (
    <div className="app-shell">
      <header className="app-topbar v35-topbar">
        <Link href={activeTab==="missions"?"/?sport=football&tab=missions":"/?sport=football"} className="brand" aria-label="Neon Builder Pro Startseite"><span className="brand-logo">N<span>◆</span></span><span className="brand-text"><strong>NEON BUILDER PRO</strong><small>V3.9.1 · PERFORMANCE</small></span></Link>
        <nav className="sport-switch" aria-label="Sportart wählen"><Link href={activeTab==="missions"?"/?sport=football&tab=missions":"/?sport=football"} aria-current={sport==="football"?"page":undefined}>⚽ Fußball</Link><Link href={activeTab==="missions"?"/?sport=nba&tab=missions":"/?sport=nba"} aria-current={sport==="nba"?"page":undefined}>🏀 NBA</Link></nav>
        <span className="topbar-pill"><span className="status-dot" style={error?{background:"#d9a06f"}:undefined}/>{error?"API prüfen":players.length?`${players.length} Spieler geladen`:"Sorare verbindet"}</span>
      </header>

      <nav className="v35-tabs" aria-label="Arbeitsbereiche" role="tablist">
        {([ ["builder","◈","Builder"], ["players","⌕","Spieler"], ["analytics","▥","Analyse"], ["collection","▣","Sammlung"], ["missions","⚡","Daily Missions"] ] as const).map(([id,icon,label])=><button type="button" role="tab" key={id} aria-selected={activeTab===id} className={activeTab===id?"is-active":""} onClick={()=>navigate(id)}><span aria-hidden="true">{icon}</span> {label}</button>)}
      </nav>
      <div className="v39-quick-actions">
        <button type="button" aria-expanded={showQuickActions} aria-controls="neon-command-panel" onClick={()=>setShowQuickActions(v=>!v)}>⌘ NEON Quick Actions <small>Ctrl+K</small></button>
        <span>5 Arbeitsbereiche · Profi-Funktionen bleiben einklappbar</span>
        {showQuickActions&&<div id="neon-command-panel" className="v39-command-panel" role="group" aria-label="NEON Schnellaktionen">
          <button type="button" onClick={()=>navigate('missions')}>⚡ Daily Mission</button>
          <button type="button" onClick={()=>navigate('builder','lineup-builder')}>◈ Lineup Studio</button>
          <button type="button" onClick={()=>navigate('players','hidden-gems')}>◆ Hidden Gems</button>
          <button type="button" onClick={()=>{navigate('players','spieler');window.requestAnimationFrame(()=>searchRef.current?.focus());}}>⌕ Spieler suchen</button>
          <button type="button" onClick={()=>navigate('analytics','tracking')}>▥ Reality Check</button>
          <button type="button" onClick={()=>navigate('collection','meine-karten')}>▣ Karten-Sync</button>
        </div>}
      </div>
      <main className="dashboard-main v35-main" data-workspace={activeTab}>
        <div className="v35-workspace-title" data-tab="builder"><div><span className="section-kicker">NEON STUDIO / V3.9.1</span><h1>{sport==="nba"?"NBA":"Fußball"} Lineup Studio</h1></div><div className="v36-title-actions"><button type="button" className="v37-mission-link" onClick={()=>navigate("missions")}>⚡ Daily Missions öffnen</button><span className="v35-title-hint">{sport==="nba"?"5 Karten · max. 16 ★":"5 Karten · Captain +50 %"}</span></div></div>
        <div className="metric-grid v35-metrics" data-tab="builder">
          <div className="metric-card"><span className="metric-label">Spieler im Datensatz</span><strong>{players.length.toLocaleString("de-DE")}</strong><small>Aktuell ausgewählter Datenbereich</small></div>
          <div className="metric-card"><span className="metric-label">Mögliche Einsätze</span><strong>{hasGameCount.toLocaleString("de-DE")}</strong><small>Spielerbilder: {imageCount} von {players.length}</small></div>
          <div className="metric-card"><span className="metric-label">Meine Karten im Spielerpool</span><strong>{ownedCount}</strong><small>{verifiedOwnedReady?"Aus Sorare synchronisiert":"Manuell erfasst, lokal gespeichert"}</small></div>
          <div className="metric-card"><span className="metric-label">{sport === "nba" ? "Sterne zugewiesen" : "Aktuelle Zielmarke"}</span><strong>{sport === "nba" ? ratedCount : (validTarget ? totalTarget : "—")}</strong><small>{sport === "nba" ? `${automaticStarCount} offiziell · ${manualStarCount} manuell` : "Veränderbar im Builder"}</small></div>
        </div>

        <div className="v35-tab-section" data-tab="collection"><MySorareCollection sport={sport} onCollectionChange={setVerifiedCollection}/></div>

        {error && <div className="notice warning"><strong>Datenabruf fehlgeschlagen.</strong> {error}</div>}
        {info && <div className="notice"><span className="status-dot"/> {info}</div>}

        <div className="v39-intelligence-strip" data-tab="builder" aria-label="Smart Gameday Center">
          <div><strong>◷ Gameday Center</strong><span>{gameday.playing} Spieler heute · {verifiedOwnedReady?`${gameday.ownedPlaying} aus meiner Sammlung`:'Besitz nicht verifiziert'} · {gameday.nextKickoff?`Nächster Start ${new Date(gameday.nextKickoff).toLocaleTimeString('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit'})}`:'Anstoßzeit offen'}</span></div>
          <details><summary>◈ Smart Advisor</summary><p><strong>{smartAdvice.headline}</strong> – {smartAdvice.detail}</p><p>Hinweis: Kein bestätigter Start, keine offiziellen Missions-Lock-Zeiten.</p></details>
        </div>
        <section className="panel scope-panel" data-tab="builder">
          <div className="section-top"><div><span className="section-kicker">01 / DATENBEREICH</span><h2>Liga & Team auswählen</h2></div><span className="caption-small">Suche im geladenen Kader · Alle 4 Ligen für ligaübergreifende Suche auswählen</span></div>
          {sport === "football" && leagues.length > 0 && (
            <div className="chip-strip" aria-label="Fußball-Ligen">
              <Link className={league === "__all" && !team ? "chip active" : "chip"} href={makeLink({sport, league:"__all"})}>Alle 4 Ligen</Link>
              {leagues.map(l => <Link className={l === league && !team ? "chip active" : "chip"} key={l} href={makeLink({sport,league:l})}>{l}</Link>)}
            </div>
          )}
          {sport === "football" && league !== "__all" && <p className="scope-notice">Du suchst gerade nur in {league}. <Link href={makeLink({sport,league:"__all"})+"#spieler"}>Alle Spieler aus den vier Ligen durchsuchen →</Link></p>}
          {clubs.length > 0 && (
            <details className="v35-scope-more"><summary>Vereine auswählen · {team?clubs.find(c=>c.slug===team)?.name??team:"Alle Teams"} ▾</summary><div className="chip-strip chip-teams" aria-label="Teams">
              <Link className={!team ? "chip active" : "chip"} href={makeLink({sport, league: sport === "football" ? league : undefined})}>Alle Teams</Link>
              {clubs.map(c => <Link className={c.slug === team ? "chip active" : "chip"} key={c.slug} href={makeLink({sport, league: sport === "football" ? league : undefined, team:c.slug})}>{c.name}</Link>)}
            </div></details>
          )}
        </section>

        {activeTab==="missions"&&(<section className="v35-tab-section v37-mission-workspace" data-tab="missions" id="daily-mission">
          <div className="v37-mission-title">
            <div><span className="section-kicker">NEON / DAILY MISSIONS · V3.9.1</span><h1>⚡ Daily Missions</h1><p>Die besten verfügbaren Picks für deine tägliche Sorare-Mission – kostenlos, ohne Zusatz-API oder Datenbank.</p></div>
            <span className="v37-mission-coverage">{players.length.toLocaleString("de-DE")} Spieler geladen · {sport==="nba"?"NBA":"Fußball"}</span>
          </div>
          <div className="v37-mission-scope">
            <div className="v37-mission-scope-head"><strong>Spielerpool wählen</strong><span>{team?clubs.find(c=>c.slug===team)?.name??team:league==='__all'?"Vier Fußballligen":sport==="nba"?"Alle NBA-Teams":league}</span></div>
            {sport==="football"&&<div className="v37-mission-leagues" aria-label="Daily Mission Fußball-Ligen">
              <Link className={league==="__all"&&!team?"chip active":"chip"} href={makeLink({sport,league:"__all",tab:"missions"})}>Alle 4 Ligen</Link>
              {leagues.map(l=><Link className={league===l&&!team?"chip active":"chip"} key={l} href={makeLink({sport,league:l,tab:"missions"})}>{l}</Link>)}
            </div>}
            {clubs.length>0&&<details className="v37-mission-team-filter"><summary>Teamfilter · {team?clubs.find(c=>c.slug===team)?.name??team:"Alle Teams"}</summary><div className="chip-strip chip-teams" aria-label="Daily Mission Teams">
              <Link className={!team?"chip active":"chip"} href={makeLink({sport,league:sport==="football"?league:undefined,tab:"missions"})}>Alle Teams</Link>
              {clubs.map(c=><Link className={team===c.slug?"chip active":"chip"} key={c.slug} href={makeLink({sport,league:sport==="football"?league:undefined,team:c.slug,tab:"missions"})}>{c.name}</Link>)}
            </div></details>}
          </div>
          {activeTab==="missions"&&<DailyMissionPicker active={true} sport={sport} players={players} nbaSchedule={nbaSchedule} ownedIds={dailyMissionOwnedIds} excludedIds={dailyMissionExcludedIds} onOpenPlayer={setSelectedPlayerId} onSendToBuilder={queueManualPlayer} onGoCollection={()=>navigate("collection","meine-karten")} availabilityById={injuryById} availabilitySnapshot={availability.data} scope={team?clubs.find(c=>c.slug===team)?.name??team:league==='__all'?'Alle vier Fußballligen':sport==='nba'?'NBA · geladene Teams':league} verifiedOwned={verifiedOwnedReady}/>}
        </section>)} 
        <div className="v35-tab-section" data-tab="builder"><details className="v35-advanced" onToggle={event=>setGameweekOpen(event.currentTarget.open)}><summary>◷ Gameweek Center · Spielplan, Ziele und Details anzeigen</summary>{activeTab==="builder"&&gameweekOpen&&<GameweekCenter sport={sport} players={players} cardStore={effectiveCardStore} nbaSchedule={nbaSchedule}
          currentTarget={validTarget?totalTarget:null} onApplyTarget={applyArcadeGoal}
          onOpenPlayer={setSelectedPlayerId} onAddPlayer={queueManualPlayer} onExploreTeam={exploreGameweekTeam}/>}</details></div>

        {sport==="nba"&&<section data-tab="collection" className="panel nba-star-center" id="nba-stars" aria-label="Offizielle NBA-Sterne">
          <div className="nba-star-heading"><div><span className="section-kicker">SORARE OFFICIAL · NBA STAR SYNC</span><h2>Deine Sterne. Direkt von Sorare.</h2><p>Automatische aktuelle Spielerbewertung aus <code>gameplayTierStars</code> – ohne geschätzte Sterne.</p></div><button type="button" disabled={starSync.phase==="loading"||!basePlayers.length} onClick={()=>void fetchOfficialStars(true)}>{starSync.phase==="loading"?"↻ Synchronisiere …":"↻ Sterne jetzt aktualisieren"}</button></div>
          <div className="nba-star-metrics"><div><small>OFFIZIELL VON SORARE</small><strong>{automaticStarCount}</strong><span>der geladenen NBA-Spieler</span></div><div><small>MANUELLER FALLBACK</small><strong>{manualStarCount}</strong><span>falls Sorare keine Bewertung liefert</span></div><div><small>OHNE STERNWERT</small><strong>{players.length-ratedCount}</strong><span>bewusst nicht geschätzt</span></div><div><small>LETZTER ABRUF</small><strong className="nba-star-date">{starSync.snapshot?new Date(starSync.snapshot.fetchedAt).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):starSync.phase==="loading"?"Lädt …":"—"}</strong><span>Sorare-API · 15 Min. Cache</span></div></div>
          {starSync.phase==="error"&&<p className="nba-star-warning" role="status">⚠ {starSync.message} Bisherige manuelle Sternwerte bleiben als Fallback verfügbar.</p>}
          {starSync.phase==="ready"&&starSync.snapshot?.partial&&<p className="nba-star-warning">⚠ Einige Teile des Sterneabrufs sind fehlgeschlagen. Für fehlende Bewertungen gilt weiterhin der manuelle Fallback.</p>}
          <p className="nba-star-note">Sorare aktualisiert Spieler-Tiers spieltagabhängig. Für bereits eröffnete Gameweeks kann der auf Sorare festgeschriebene Sternpreis vom aktuellen <em>gameplayTierStars</em>-Wert abweichen. Vor dem Einreichen bitte die konkrete Wettbewerbs-GW prüfen. Kartenbesitz und Kartenboni kommen aus Sorare, soweit verfügbar; sonst manuelle Ersatzwerte.</p>
        </section>}
        {activeTab==="analytics"&&(<div className="v35-tab-section" data-tab="analytics">{activeTab==="analytics"&&<DataHealthCenter sport={sport} players={basePlayers} summary={fetchSummary}
          archiveBackend={archiveBackend} pendingResults={autoPending}
          matchupSource={automaticMatchups.source} scheduleStatus={nbaSchedule.status}/>}</div>)} 

        {activeTab==="analytics"&&(<section data-tab="analytics" className="panel forecast-lab" id="forecast-lab">
          <div className="section-top"><div><span className="section-kicker">03 / PREDICTION ENGINE 2.0 · V3.3</span><h2>Form, Matchups & Risiko transparent.</h2></div><span className="lab-stage">EXPERIMENTELL · NICHT VALIDIERT</span></div>
          <p className="lab-intro">Prediction Engine 2.0 kombiniert die vorhandenen Sorare-Daten mit einem vorsichtig gewichteten Formsignal und zeigt Floor, Ceiling sowie einen nachvollziehbaren Risikoindex. Gegner und manuell gepflegte Minuten wirken nur einmal. <strong>V1.7 und V1.8 bleiben unverändert auswählbar.</strong> Ein Leistungsgewinn ist erst durch echte Ergebnisse nachzuweisen.</p>
          <div className="lab-model-switch" role="group" aria-label="Prognosemodell wählen">
            <button type="button" aria-pressed={modelMode==="v2"} className={modelMode==="v2"?"active":""} onClick={()=>setModelMode("v2")}>✦ V2.0 · Prediction Engine</button>
            <button type="button" aria-pressed={modelMode==="v18"} className={modelMode==="v18"?"active":""} onClick={()=>setModelMode("v18")}>◆ V1.8 · Experiment</button>
            <button type="button" aria-pressed={modelMode==="classic"} className={modelMode==="classic"?"active":""} onClick={()=>setModelMode("classic")}>◈ V1.7 · Standard</button>
          </div>
          <div className="lab-kpis">
            <div><small>V2.0 · Prognosegrundlage</small><strong>{withV2.toLocaleString("de-DE")}</strong><span>Keine erfundenen Scores bei fehlenden Daten</span></div>
            <div><small>V2.0 gegenüber V1.7</small><strong>{avgV2Change>=0?"+":""}{fmt(avgV2Change)} %</strong><span>Prognosedifferenz, kein Qualitätsnachweis</span></div>
            <div><small>V2.0 · offizielle Paarvergleiche</small><strong>{v2Backtest.count}</strong><span>{v2Backtest.count?`MAE V1.8: ${fmt(v2Backtest.v18Mae??0)} · V2.0: ${fmt(v2Backtest.v2Mae??0)}`:"Noch keine vergleichbaren FINAL-Daten"}</span></div>
          </div>
          <p className="lab-caution"><strong>Wichtig:</strong> Alle V2.0-Intervalle, Einsatzwahrscheinlichkeiten und Risikoeinstufungen sind unkalibrierte Heuristiken. Die 80-%-Spanne ist keine belegte 80-%-Trefferquote. {v2Backtest.count>0?`Offizielle V2.0-Vergleiche an ${v2Backtest.days} Spieltagen, MAE-Differenz V1.8 minus V2.0: ${fmt(v2Backtest.deltaMae??0)}.`:"V2.0-Qualität wird erst an zukünftigen offiziell abgeschlossenen Spielen messbar."}</p>
        </section>)} 

        {activeTab==="analytics"&&(<section data-tab="analytics" className="panel matchup-panel" id="matchups">
          <div className="section-top"><div><span className="section-kicker">04 / MATCHUP INTELLIGENCE</span><h2>Gegneranalyse & Top-Matchups</h2></div><span className="record-count">{ratedOpponents} von {opponents.length} Gegnern bewertet</span></div>
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
        </section>)} 

        {activeTab==="players"&&(<div className="v35-tab-section" data-tab="players">{activeTab==="players"&&<HiddenGems sport={sport} players={players} cardStore={effectiveCardStore} verifiedOwnedReady={verifiedOwnedReady} watchlist={watchlist}
          onOpenPlayer={setSelectedPlayerId} onAddPlayer={queueManualPlayer} onToggleFavorite={toggleFavorite}/>}</div>)} 

        <section data-tab="builder" className="two-column builder-zone-v23">
          <div className="panel builder-panel" id="lineup-builder">
            <div className="section-top"><div><span className="section-kicker">LINEUP STUDIO · V3.5</span><h2>Dein Lineup</h2></div><span className="live-pill">5 POSITIONEN</span></div>
            <div className="v35-model-picker"><label>Prognosemodell <select aria-label="Prognosemodell im Builder" value={modelMode} onChange={e=>setModelMode(e.target.value as typeof modelMode)}><option value="v2">V2.0 Prediction Engine</option><option value="v18">V1.8</option><option value="classic">V1.7</option></select></label></div>
            <div className={`v283-collection-switch ${ownedOnly?"is-on":""}`} aria-label={`${sport==="nba"?"NBA":"Fußball"} Kartenfilter`}>
              <div className="v283-collection-copy">
                <span className="v283-collection-eyebrow">✦ MY SORARE COLLECTION · {sport==="nba"?"NBA":"FUSSBALL"}</span>
                <strong>Nur meine {sport==="nba"?"NBA":"Fußball"}-Karten</strong>
                <small>{verifiedOwnedReady
                  ? `${ownedCount} Spieler aus deiner synchronisierten Sammlung im aktuellen Datenbereich · gilt für beide Builder-Modi`
                  : "Noch keine vollständig synchronisierte Sammlung geladen. Aktivierung wartet auf den erfolgreichen Sync."}</small>
              </div>
              <div className="v283-collection-controls">
                <label className="v283-toggle" htmlFor={`only-owned-${sport}`}>
                  <input id={`only-owned-${sport}`} type="checkbox" checked={ownedOnly} onChange={e=>setCollectionOnly(e.target.checked)}/>
                  <span className="v283-toggle-track" aria-hidden="true"><span/></span>
                  <span className="v283-toggle-state">{ownedOnly?"AN":"AUS"}</span>
                </label>
                <button type="button" onClick={()=>navigate("collection","meine-karten")}>Sammlung / Sync ↗</button>
              </div>
            </div>
            {ownedOnly&&!verifiedOwnedReady&&<p className="v283-collection-warning" role="status">Der Kartenfilter ist aktiviert, aber die Sorare-Sammlung ist noch nicht vollständig geladen. Bis zum erfolgreichen Sync werden keine Spieler als verifiziert eigene Karten gewertet. <a href="#meine-karten">Jetzt synchronisieren</a>.</p>}
            <div className="builder-mode-tabs" role="group" aria-label="Lineup Builder Modus">
              <button type="button" className={builderMode === "manual" ? "active" : ""} aria-pressed={builderMode === "manual"} onClick={() => setBuilderMode("manual")}>✋ Selbst aufstellen</button>
              <button type="button" className={builderMode === "automatic" ? "active" : ""} aria-pressed={builderMode === "automatic"} onClick={() => setBuilderMode("automatic")}>✦ Automatisch optimieren</button>
            </div>
            {builderMode === "automatic" && <div className="v26-injury-toolbar" role="status">
              <strong>✚ INJURY-CHECK AKTIV</strong>
              <span>{availability.loading?"Aktualisiere …":availability.error||`${Object.values(injuryById).filter(r=>r.status==="out").length} bestätigte OUT-Meldungen im Spielerpool`}</span>
              <span>OUT wird bei automatischen Vorschlägen ausgeschlossen. Quelle: {availability.data?.sources.join(" · ")||"Nicht verfügbar"}</span>
              <button type="button" disabled={availability.loading} onClick={availability.refresh}>↻ Ausfälle prüfen</button>
            </div>}
            {builderMode === "manual" && <div className="manual-target-controls">
              <label htmlFor="manual-target">Score-Ziel (optional)</label>
              <input id="manual-target" type="number" min="1" step="1" inputMode="numeric" value={target} placeholder="Score-Ziel eingeben" onChange={e=>setTarget(e.target.value)}/>
              {sport === "football" && <><button type="button" onClick={()=>setTarget("180")}>180 Pkt.</button><button type="button" onClick={()=>setTarget("360")}>360 Pkt.</button></>}
            </div>}
            {builderMode === "manual" ? <BuilderWorkspace sport={sport} league={league} availability={builderAvailability} availabilityById={injuryById} players={players} cardStore={effectiveCardStore} ownedOnly={ownedOnly} verifiedOwnedReady={verifiedOwnedReady} verifiedCollection={verifiedCollection} v30State={v30State} onV30Change={setV30State} leagues={leagues}
              updateCard={updateCard} targetScore={validTarget ? totalTarget : null}
              onOpenProfile={setSelectedPlayerId}
              onSavePredictions={saveLineupForecasts} requestedPlayer={manualRequest}
              favorites={watchlist} onToggleFavorite={toggleFavorite}
              nbaSchedule={nbaSchedule} matchupRatings={effectiveRatings} matchupSource={automaticMatchups.source}/> : <>
            <div className="v35-presets" aria-label="Optimierungs-Presets"><div className="v35-presets-head"><strong>✦ Meine Optimierungs-Presets</strong><span>Nur in diesem Browser gespeichert</span></div>
              <div className="v35-preset-controls"><select aria-label="Gespeichertes Preset wählen" value={presetSelected} onChange={e=>setPresetSelected(e.target.value)}><option value="">Preset wählen …</option>{optimizerPresets.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select><button type="button" disabled={!presetSelected} onClick={loadCurrentPreset}>Laden</button><button type="button" disabled={!presetSelected} onClick={()=>{setOptimizerPresets(prev=>deleteOptimizerPreset(prev,presetSelected));setPresetSelected("");setPresetNotice("Preset gelöscht.");}}>Löschen</button></div>
              <div className="v35-preset-controls"><input maxLength={45} value={presetName} placeholder="Neues Preset benennen" aria-label="Neues Preset benennen" onChange={e=>setPresetName(e.target.value)}/><button type="button" onClick={saveCurrentPreset}>+ Speichern</button></div>{presetNotice&&<small role="status">{presetNotice}</small>}</div>
            <details className="v35-advanced"><summary>⚙ Profi-Einstellungen · Team-Regeln, Stacks, Prognose-Optionen</summary><AutoBuilderSettings sport={sport} league={league} leagues={leagues} state={v30State} onChange={setV30State} teamId={v30EditTeam} onTeamChange={setV30EditTeam}/></details>
            <p className="v30-status" role="status">V3.0: {v30State.scope==="team"?"Individuelle Auto-Team-Strategien":"Gemeinsame Strategie"} · {v30ActiveSettings.projection.toUpperCase()} · {lineups.length} gültige Vorschläge. {v30ActiveSettings.projection==="q80"?"Q80 ist experimentell, nicht kalibriert; Spieler ohne mindestens 8 Scores werden ausgeschlossen.":""} {v30ActiveSettings.projection==="raw"?"Die Auswahl wird ohne Kartenbonus optimiert; die Teamanzeige enthält weiterhin tatsächliche Karten-/Captain-Zuschläge.":""} {v30ActiveSettings.excludedLeagues.includes(league)?"Die aktuell geladene Liga wurde ausgeschlossen.":""}</p>
            <p className="v283-auto-scope">{ownedOnly?"✓ Automatische Aufstellungen ausschließlich aus verifiziert eigenen Karten":"Alle Spieler im Datenbereich · theoretische Aufstellungen"} · Einstellung oben ändern.</p>
            {sport==="football"&&<div className="strategy-bar">
              <div className="strategy-title"><strong>Optimierung</strong><small>Diese Auswahl gilt für „Custom“. Safe, Balanced und High Ceiling aus V3.0 setzen ein eigenes Optimierungsziel.</small></div>
              <div className="strategy-options" role="group" aria-label="Lineup-Strategie">
                {(["balanced","safe","upside","target"] as Strategy[]).map(value => <button type="button" key={value} disabled={value === "target" && !validTarget} title={value === "target" && !validTarget ? "Bitte zuerst unten ein Score-Ziel eingeben" : undefined} className={strategy === value ? "active" : ""} onClick={() => {setStrategy(value);setActiveResult(0);setIntelligencePickKey(null);}}>{({balanced:"Ausgewogen",safe:"Sicher",upside:"Offensiv",target:"Zielchance"} as Record<Strategy,string>)[value]}</button>)}
              </div>
            </div>}
            {intelligenceView&&<ArcadeIntelligenceLab sport={sport} board={intelligenceView} target={target}
              onTargetChange={value=>{setTarget(value);setIntelligencePickKey(null);}}
              selectedKey={activeIntelligence?.key??null} onSelect={key=>{setIntelligencePickKey(key);setActiveResult(0);}}/>}
            {sport==="nba"&&<section className="nba31-panel" aria-label="NBA Stars Optimizer 2.1">
              <div className="nba31-heading"><div><span className="section-kicker">V3.2 · NBA STARS OPTIMIZER 2.1</span><h3>Smart Star Budget &amp; Diversity</h3><p>Ganze Fünferteams unter 16 ★ optimieren · vier klare Strategien · Unterschiede transparent.</p></div><span className="nba31-tag">5 Karten · ≤ 16 ★</span></div>
              <div className="nba31-modes" role="group" aria-label="NBA-Optimierungsprofil">
                {NBA_STARS_MODES.map(mode=><button type="button" key={mode.id} aria-pressed={nbaStarsMode===mode.id} className={nbaStarsMode===mode.id?"active":""} title={mode.detail}
                  onClick={()=>{const variant=nbaStarBoard?.variants.find(v=>v.mode===mode.id);selectNbaOptimizerMode(mode.id,variant?.lineup.picks.map(p=>p.player.id).sort().join("|")??null);}}
                  >{mode.label}</button>)}
              </div>
              <div className="nba32-diversity">
                <div><strong>Lineup Diversity</strong><span>Mindestens so viele andere Spieler zwischen den Varianten, sofern regelkonform möglich.</span></div>
                <div className="nba32-diversity-buttons" role="group" aria-label="Mindestanzahl anderer NBA-Spieler">
                  {([1,2,3] as NbaLineupDiversity[]).map(value=><button type="button" key={value}
                    className={nbaDiversity===value?"active":""} aria-pressed={nbaDiversity===value}
                    onClick={()=>updateNbaDiversity(value)}>{value===1?"Normal · 1":value===2?"Balanced · 2":"High Diversity · 3"}</button>)}
                </div>
              </div>
              {validTarget&&<button type="button" className={`nba31-target ${strategy==="target"?"active":""}`} aria-pressed={strategy==="target"} onClick={()=>{setStrategy(strategy==="target"?"balanced":"target");setNbaVariantKey(null);setActiveResult(0);}}>
                ◎ Zielchance für {fmt(totalTarget)} Punkte priorisieren {strategy==="target"?"✓":""}
              </button>}
              {(v30ActiveSettings.preset==="safe"||v30ActiveSettings.preset==="ceiling")&&<p className="nba31-note">Aktives V3.0-Preset ({v30ActiveSettings.preset}): Dieses Ziel hat Vorrang, bis du oben eines der vier NBA-Profile aktiv auswählst. Andere Filter bleiben erhalten.</p>}
              <p className="nba31-description">{NBA_STARS_MODES.find(m=>m.id===nbaStarsMode)?.detail}. Die gewählte NBA-Strategie ändert keine vorhandenen manuellen Teams.</p>
              {nbaStarBoard&&<div className="nba31-variants" aria-label="Unterschiedliche NBA-Teamvarianten">
                {nbaStarBoard.variants.map(v=><button type="button" key={v.mode} title="Diese Profil-Variante auswählen"
                  onClick={()=>selectNbaOptimizerMode(v.mode,v.lineup.picks.map(p=>p.player.id).sort().join("|"))}
                  className={nbaStarsMode===v.mode?"active":""}>
                  <span>{NBA_STARS_MODES.find(m=>m.id===v.mode)?.label}</span>
                  <strong>{fmt(v.lineup.projectedScore)} PS</strong>
                  <small>{fmt(v.lineup.starsUsed)} ★ · {fmt(v.assessment.pointsPerStar)} PS/★</small>
                  {v.mode==="max"?<small className="nba32-reference">Referenz · 0 PS Verlust</small>:
                    <small className={v.meetsDiversity?"nba32-meets":"nba32-unmet"}>
                      {v.projectedLoss>=0?`−${fmt(v.projectedLoss)} PS (${fmt(v.projectedLossPercent)} %)`:`+${fmt(-v.projectedLoss)} PS (${fmt(-v.projectedLossPercent)} %) `} ggü. Max
                      <span> · {v.changesFromMax} anders als Max · min. {v.minChangesToOtherVariants} zu anderen {v.meetsDiversity?"✓":"⚠"}</span>
                    </small>}
                </button>)}
              </div>}
              {nbaStarBoard&&nbaStarBoard.unmetDiversity.length>0&&<p role="status" className="nba32-warning">⚠ Mindestabweichung von {nbaDiversity} Spielern ist nicht bei allen Profilen erreichbar. Angezeigt wird die beste verfügbare regelkonforme Alternative innerhalb der 90-%-Qualitätsgrenze. Die tatsächlich erreichten Unterschiede stehen direkt an jedem Team.</p>}
              {nbaChosenAssessment&&chosen&&<div className="nba32-current" role="status">
                <span>Aktuelles Lineup vs. Max Points</span>
                <strong>{nbaChosenLoss===null?"—":nbaChosenLoss>=0?`−${fmt(nbaChosenLoss)} PS`:`+${fmt(-nbaChosenLoss)} PS`}</strong>
                <small>{nbaChosenChanges??0} andere Spieler · Max-Referenz: {fmt(nbaStarBoard?.referenceScore??0)} PS</small>
              </div>}
              {nbaChosenAssessment&&chosen&&<div className="nba31-metrics" role="status">
                <div><small>Star Efficiency</small><strong>{fmt(nbaChosenAssessment.pointsPerStar)}</strong><span>Prognosepunkte / Stern</span></div>
                <div><small>Budget übrig</small><strong>{fmt(nbaChosenAssessment.unusedStars)} ★</strong><span>Keine Pflicht, alle 16 ★ zu nutzen</span></div>
                <div><small>Risikoindex*</small><strong>{nbaChosenAssessment.riskIndex}/100</strong><span>{nbaChosenAssessment.atRisk} Einsatzrisiken · {nbaChosenAssessment.lowData} schwache Daten</span></div>
                <div><small>Matchup bekannt</small><strong>{nbaChosenAssessment.matchupKnown}/5</strong><span>{nbaChosenAssessment.matchupFavorable} günstig · {nbaChosenAssessment.matchupDifficult} schwierig</span></div>
              </div>}
              <p className="nba31-note">{nbaStarBoard?.note??"Kein NBA-Ergebnis für die aktuelle Auswahl."} {nbaChosenAssessment?.matchupPercentAverage!==null&&nbaChosenAssessment?.matchupPercentAverage!==undefined?`Ø Matchup-Anpassung der bewerteten Spieler: ${fmt(nbaChosenAssessment.matchupPercentAverage)} % (bereits enthalten).`:"Ohne Gegnerdaten wird kein fiktiver Matchup-Bonus vergeben."} * Risiko ist eine nicht kalibrierte Heuristik aus Einsatzchance, Formstreuung und Datenqualität. {v30State.scope==="team"?"Im Pro-Team-Modus gelten die individuellen V3.0-Einstellungen je Team.":""}</p>
            </section>}
            <div className="lock-info"><span>🔒 {lockedIds.length} Spieler fixiert · 🚫 {excludedIds.length} ausgeschlossen</span><button type="button" onClick={() => setCardStore(store => Object.fromEntries(Object.entries(store).map(([id,v])=>[id,{...v,locked:false,excluded:false}]))) }>Auswahl zurücksetzen</button></div>
            {sport === "nba" ? (
              <div className="budget-row">
                <div><span className="budget-name">NBA STERNE-LIMIT</span><div className="budget-value">{chosen ? fmt(chosen.starsUsed) : "0,0"}<span> / 16,0 ★</span></div></div>
                <div className="budget-track"><div style={{width:`${chosen ? chosen.starsUsed / 16 * 100 : 0}%`}}/></div>
              </div>
            ) : (
              <div className="target-shortcuts"><span>HOT STREAKS · ZIEL:</span><button className={target === "180" ? "active" : ""} onClick={() => setTarget("180")}>Schritt 2 · 180</button><button className={target === "360" ? "active" : ""} onClick={() => setTarget("360")}>Schritt 3 · 360</button></div>
            )}
            {activeIntelligence&&<div className="intelligence-selected-notice" role="status"><span>✦ Aktives Intelligence-Lineup: <strong>{activeIntelligence.label}</strong> · {fmt(chosen?.projectedScore??0)} Pkt.</span><button type="button" onClick={()=>setIntelligencePickKey(null)}>Zur Standard-Optimierung zurück</button></div>}
            <div className="lineup-board" id="auto-lineup-visual">
              {(sport === "football" ? ARCADE.football.slots : ARCADE.nba.slots).map((slot, index) => {
                const item = chosen?.picks[index];
                return <div className={`lineup-slot ${item ? "is-filled" : ""}`} key={`${slot}-${index}`}>
                  <div className="slot-icon">{item ? <PlayerAvatar player={item.player} small/> : (sport === "nba" ? "★" : ({GK:"◈",DEF:"⬡",MID:"✦",FWD:"◆",FLEX:"✧"} as Record<string,string>)[slot])}</div>
                  <div className="slot-content"><span className="slot-name">{sport === "nba" ? `Karte ${index + 1}` : `${POS_SHORT[slot]} · ${POS_LABEL[slot]}`}{sport==="football"&&item&&chosenAuto.captainId===item.player.id?" · 👑 CAPTAIN +50 %":""}</span>
                    {item ? <button className="player-open" type="button" onClick={() => setSelectedPlayerId(item.player.id)}>{item.player.name} ↗</button> : <strong>Noch kein passender Pick</strong>}
                    <small>{item ? `${item.player.team} · ${item.player.confidence ?? "mittel"} Datenlage${sport==="nba"?` · Gegner: ${item.player.opponent??"unbekannt"} (${matchupLabel((item.player as Forecast&{opponentRating?:number|null}).opponentRating??null)})`:""}` : sport === "nba" ? "Sterne für Spieler erfassen" : "Spieler aus dem Pool auswählen"}</small>
                  </div>
                  <div className="slot-score">{item ? <><strong>{fmt(item.projectedScore)}</strong><small>{sport === "nba" ? `${fmt(item.stars ?? 0)} ★ · +${fmt(item.bonusPercent)} % Kartenbonus` : `${chosenAuto.captainId===item.player.id?"👑 ":""}+${item.bonusPercent}% inkl. aller Boni`}</small></> : "—"}</div>
                </div>;
              })}
            </div>
            {sport==="football"&&chosen&&<div className="v29-auto-captain"><strong>👑 AUTO SMART CAPTAIN · +50 %</strong><span>Empfehlung: {chosen.picks.find(p=>p.player.id===chosenAuto.captainId)?.player.name??"Kein sicher verfügbarer Spieler"} · +{fmt(chosenAuto.extra)} Punkte</span><label>Captain manuell wählen<select aria-label="Captain der automatischen Fußballaufstellung auswählen" value={chosenAuto.captainId??""} onChange={e=>setAutoCaptainChoice({key:autoCaptainKey,playerId:e.target.value})}><option value="">Bitte wählen</option>{chosen.picks.map(p=><option key={p.player.id} value={p.player.id}>{p.player.name}</option>)}</select></label><small>Ein Vorschlag, keine offizielle Einreichung. NBA hat keine Captain-Regel.</small></div>}
            <div className="lineup-footer">
              <div><span>PROGNOSE GESAMT</span><strong>{chosen ? fmt(chosen.projectedScore) : "—"}<small> Pkt.</small></strong></div>
              <div className="target-input"><label htmlFor="target">Score-Ziel (frei einstellbar)</label><input id="target" type="number" min="1" step="1" inputMode="numeric" value={target} placeholder="z. B. 360" onChange={e=>setTarget(e.target.value)} /></div>
            </div>
            {!chosen&&<p className="v30-status">Kein passendes Lineup: Prüfe Bundesliga-/Liga-Ausschlüsse, Mindestpunkte, Team-Stack, Extra-Position, Q80-Datenabdeckung oder NBA-Sternelimit. Es werden keine fehlenden Daten ergänzt.</p>}
            {chosen && <div className="lineup-range"><span>Floor (heuristisch): <strong>{fmt(chosen.floorScore)}</strong></span><span>Ceiling (heuristisch): <strong>{fmt(chosen.ceilingScore)}</strong></span></div>}
            {chosen && validTarget && chosen.targetProbability !== null && <div className="target-chance" role="status"><div><span>GESCHÄTZTE ZIELCHANCE</span><strong>{Math.round(chosen.targetProbability * 100)} %</strong></div><small>Modellschätzung mit Formstreuung, DNP-Risiko und angenommener Team-Korrelation. Nicht kalibriert, keine garantierte Gewinnchance.</small></div>}
            {chosen && validTarget && (
              <div className="target-progress"><div className="target-track"><div style={{width: `${progress}%`}}/></div><p>Modellprognose {fmt(chosen.projectedScore)} / {fmt(totalTarget)} · <strong>{chosen.projectedScore >= totalTarget ? "Prognose über Ziel" : `${fmt(Math.max(0,totalTarget - chosen.projectedScore))} Punkte unter Ziel`}</strong></p></div>
            )}
            <p className="model-note">Mit „Fixieren“ zwingst du Spieler ins Lineup, mit „Sperren“ entfernst du sie aus der Auswahl. Sterne werden aus Sorare geladen, falls verfügbar; Kartenboni kommen aus Sorare, soweit verfügbar; sonst manuelle Ersatzwerte. {ownedOnly ? "Aufstellung nur aus vollständig synchronisierten Sorare-Karten." : "Theoretische Bestbesetzung aus dem geladenen Spielerpool – dein Kartenbesitz ist nicht geprüft."} Fehlende NBA-Sterne kannst du weiterhin manuell eintragen. Prognosen sind keine garantierten Ergebnisse.</p>
            {shownLineups.length > 1 && <div className="variants" role="group" aria-label="Aufstellungen vergleichen">{shownLineups.map((l, i) => <button key={i} className={Math.min(activeResult,lineups.length-1) === i ? "active" : ""} onClick={()=>{setActiveResult(i);setIntelligencePickKey(null);}}>Lineup {i+1} <strong>{validTarget && l.targetProbability !== null ? `${Math.round(l.targetProbability * 100)} % Zielchance` : `${fmt(l.projectedScore)} Pkt.`}</strong></button>)}</div>}
            {autoLineupDiff&&<div className="v35-auto-diff" aria-live="polite"><strong>Gegenüber Lineup 1:</strong><span>{autoLineupDiff.changed} andere Spieler · {autoLineupDiff.pointsDifference>=0?"+":""}{fmt(autoLineupDiff.pointsDifference)} PS</span>{autoLineupDiff.added.length>0&&<small>Neu: {autoLineupDiff.added.join(" · ")}</small>}{autoLineupDiff.removed.length>0&&<small>Statt: {autoLineupDiff.removed.join(" · ")}</small>}</div>}
            {shownLineups.length > 0 && <details className="v39-portfolio-details">
              <summary>▥ Multi-Lineup Portfolio 2.0 · {portfolioReport.teams} Teams · {portfolioReport.differentPlayers} verschiedene Spieler</summary>
              <div className="v39-portfolio-body"><span>Ø Prognose: <strong>{fmt(portfolioReport.averageScore)} PS</strong></span><span>Ø Überschneidung: <strong>{fmt(portfolioReport.averageShared)}/5</strong></span><span>Max. Wiederverwendung: <strong>{portfolioReport.maxReuse}×</strong></span></div>
              <label className="v39-portfolio-toggle"><input type="checkbox" checked={portfolioDiversity} onChange={e=>{setPortfolioDiversity(e.target.checked);setActiveResult(0);setNbaVariantKey(null);}}/> Mehr Vielfalt suchen (mind. 90 % Max-Prognose, globale Team-Regeln bleiben verbindlich)</label>
              {v30State.scope==='team'&&<small>Pro-Team-Einstellungen haben Vorrang: Diversifizierung beeinflusst nur den globalen Modus.</small>}
              {portfolioReport.warning&&<small>{portfolioReport.warning}</small>}
              <small>Nur Vorschläge aus bereits regelgeprüften Aufstellungen; keine Karten bei Sorare reserviert oder eingereicht.</small>
            </details>}
            {shownLineups.length > 1 && <div className="lineup-compare"><h3>Lineups im direkten Vergleich</h3><div className="tracking-scroll"><table className="tracking-table"><thead><tr><th>Lineup</th><th>Prognose</th><th>Floor</th><th>Ceiling</th>{sport === "nba" && <th>Sterne</th>}{validTarget && <th>Zielchance*</th>}</tr></thead><tbody>{shownLineups.map((l,i) => <tr key={i} className={Math.min(activeResult,lineups.length-1)===i ? "compare-selected" : ""} onClick={() => {setActiveResult(i);setIntelligencePickKey(null);}}><td><button type="button" onClick={() => {setActiveResult(i);setIntelligencePickKey(null);}}>#{i+1} wählen</button></td><td>{fmt(l.projectedScore)}</td><td>{fmt(l.floorScore)}</td><td>{fmt(l.ceilingScore)}</td>{sport === "nba" && <td>{fmt(l.starsUsed)} ★</td>}{validTarget && <td>{l.targetProbability===null ? "—" : `${Math.round(l.targetProbability*100)} %`}</td>}</tr>)}</tbody></table></div><p className="profile-muted">* Zielchance: nicht kalibrierte Modellschätzung. Lineups sind nicht automatisch offiziell spielberechtigt; Kartenbesitz und aktuelle Set-Regeln prüfen.</p></div>}
            {!chosen && <div className="empty-state"><strong>Für dieses Regelset fehlt eine vollständige gültige Aufstellung.</strong><p>{sport === "nba" ? "Vergib im Spielertableau zunächst echte Sterne (1–5 in 0,5-Schritten) für mindestens fünf geeignete Karten. Zusammen dürfen sie höchstens 16 Sterne haben." : "Es werden je ein TW, VER, MF, FWD sowie ein zusätzlicher Feldspieler benötigt."}{ownedOnly ? " Prüfe den vollständig synchronisierten Kartenbestand, den gewählten Datenbereich und die NBA-Sterne." : ""} Fixierungen müssen zum Regelset passen; NBA zusammen höchstens 16 Sterne.</p></div>}
            </>}
          </div>

        </section>
        <aside className="insights-column v35-player-insights" data-tab="players">
            <div className="panel insight-panel"><span className="section-kicker">05 / PLAYER INTELLIGENCE</span><h2>Top-Prognosen</h2><p className="caption-small">Aktives Modell: {modelMode === "v2" ? "Prediction Engine 2.0" : modelMode === "v18" ? "V1.8" : "V1.7"} · Sorare-Daten, L5/L10, Einsatzrisiko und optionale Scouting-Faktoren.</p>
              <div className="top-picks">{topPicks.map((p,i) => <div className="pick-row" key={p.id}><span className="pick-rank">{String(i+1).padStart(2,"0")}</span><PlayerAvatar player={p}/><span className="pick-name"><button type="button" className="player-open" onClick={() => setSelectedPlayerId(p.id)}>{p.name} ↗</button><small>{p.team}</small></span><span className="pick-score">{fmt(p.weighted)}<small>L5: {p.last5Avg === null ? "—" : fmt(p.last5Avg)}</small></span></div>)}</div>
            </div>
            <div className="panel tip-panel"><span className="section-kicker">WICHTIG ZUM MODELL</span><h3>Was noch fehlt</h3><p>Sorare stellt aktuelle NBA-Sterne über gameplayTierStars bereit; diese werden separat synchronisiert. Die offiziell festgeschriebenen Sterne einer bereits eröffneten Gameweek können abweichen. Deine persönliche Kartensammlung wird noch nicht automatisch synchronisiert.</p><p>Floor, Ceiling und Zielchance sind heuristische Modellwerte, keine statistisch validierte Vorhersage. Gegnerstärke wird bei eingerichteten Datenzugängen aus echten Gegnerergebnissen abgeleitet, sonst aus deinen manuellen Bewertungen. Erwartete Minuten, Verletzungsaktualität und xG/xA sind nicht über einen eigenen Live-Feed abgesichert.</p></div>
        </aside>

        {activeTab==="players"&&(<section data-tab="players" className="panel watchlist-panel" id="watchlist">
          <div className="section-top"><div><span className="section-kicker">DEIN SCOUTING BOARD</span><h2>Meine Watchlist <span className="watchlist-star">★</span></h2></div><span className="record-count">{watchlist.length} Favoriten · {favorites.length} geladen</span></div>
          <p className="watchlist-note">Beobachte deine Lieblingsspieler und nimm sie mit einem Klick in deine Aufstellung auf. Favoriten sind keine Bestätigung deines Kartenbesitzes. Sie bleiben nur in diesem Browser gespeichert.</p>
          {favorites.length ? <div className="watchlist-grid">{favorites.slice(0,12).map(p=><article key={p.id} className="watchlist-card">
            <PlayerAvatar player={p}/><div className="watchlist-card-body"><button type="button" onClick={()=>setSelectedPlayerId(p.id)}>{p.name} ↗</button><small>{p.team} · {p.position}</small><strong>{p.forecastSources.length?`${fmt(p.weighted)} Pkt.`:"Keine Score-Daten"}</strong></div>
            <div className="watchlist-card-actions"><button type="button" title={`${p.name} zur Aufstellung hinzufügen`} aria-label={`${p.name} in manuellen Builder übernehmen`} onClick={()=>queueManualPlayer(p.id)}>+ Lineup</button><button type="button" title="Aus Favoriten entfernen" aria-label={`${p.name} aus Favoriten entfernen`} onClick={()=>toggleFavorite(p.id)}>★</button></div>
          </article>)}</div> : <div className="watchlist-empty">Noch keine geladenen Favoriten. Markiere in der Spielersuche einen Spieler mit ☆. {watchlist.length>0 && "Einige Favoriten sind im aktuellen Team-/Ligabereich nicht geladen."}</div>}
          {favorites.length>12 && <a href="#spieler" className="watchlist-more" onClick={()=>setFavoritesOnly(true)}>Alle Favoriten in der Suche ansehen →</a>}
        </section>)} 
        {activeTab==="players"&&(<section data-tab="players" data-view={compactExplorer?"compact":"all"} className="panel explorer-panel" id="spieler">
          <div className="section-top"><div><span className="section-kicker">06 / SPIELER EXPLORER</span><h2>Spieler suchen & Spielerprofile öffnen</h2></div><span className="record-count">{filtered.length.toLocaleString("de-DE")} Ergebnisse</span></div>
          <div className="search-controls">
            <label className="searchbox"><span>⌕</span><input ref={searchRef} placeholder="Spieler, Verein oder Position suchen …" value={search} onChange={e=>{setSearch(e.target.value);setShowCount(40);}} aria-label="Spieler suchen"/><kbd>/ Suche · {filtered.length}</kbd></label>
            <select aria-label="Nach Position filtern" value={position} onChange={e=>{setPosition(e.target.value);setShowCount(40);}}><option value="all">Alle Positionen</option>{positions.map(p=><option key={p} value={p}>{POS_LABEL[p] ?? p}</option>)}</select>
            <select aria-label="Sortierung" value={sortBy} onChange={e=>setSortBy(e.target.value)}><option value="weighted">Beste Prognose</option><option value="avg">Höchster Ø-Score</option><option value="last5">Beste L5-Form</option><option value="upside">Höchstes Ceiling</option><option value="risk">Höchste Einsatzchance</option><option value="matchup">Bester bewerteter Gegner</option><option value="name">Name A–Z</option><option value="team">Team A–Z</option></select>
          </div>
          {search.trim().length>=2 && filtered.length>0 && <div className="search-suggestions" aria-label="Schnelltreffer zur Spielersuche"><div className="search-suggestions-heading"><strong>Schnelltreffer</strong><small>Vorschläge aus dem geladenen Spielerbereich</small></div><div className="search-suggestions-grid">{filtered.slice(0,6).map(p=><div key={p.id} className="search-suggestion"><PlayerAvatar player={p} small/><div><button type="button" onClick={()=>setSelectedPlayerId(p.id)}>{p.name} ↗</button><small>{p.team} · {p.position} · {p.forecastSources.length?`${fmt(p.weighted)} Pkt.`:"Score offen"}</small></div><button className="suggestion-add" type="button" onClick={()=>queueManualPlayer(p.id)} aria-label={`${p.name} direkt ins Lineup hinzufügen`}>+</button></div>)}</div></div>}
          <div className="search-quickfilters"><button type="button" className={favoritesOnly?"active":""} aria-pressed={favoritesOnly} onClick={()=>{setFavoritesOnly(v=>!v);setShowCount(40);}}>★ Nur Favoriten {watchlist.length>0?`(${watchlist.length})`:""}</button>{search && <button type="button" onClick={()=>{setSearch("");searchRef.current?.focus();}}>× Suche leeren</button>}<span>Tipp: <kbd>/</kbd> öffnet die Suche</span></div>
          <div className="v35-explorer-tools"><button type="button" className={compactExplorer?"active":""} aria-pressed={compactExplorer} onClick={()=>setCompactExplorer(true)}>▤ Kompakt</button><button type="button" className={!compactExplorer?"active":""} aria-pressed={!compactExplorer} onClick={()=>setCompactExplorer(false)}>▦ Alle Spalten</button><span>40 Spieler pro Seite · weitere laden bei Bedarf</span></div>
          <div className="filter-checkbox"><label><input type="checkbox" checked={hideUnavailable} onChange={e=>setHideUnavailable(e.target.checked)}/> Spieler mit fehlendem Spiel oder geringerer Einsatzchance ausblenden</label><label><input type="checkbox" checked={hasForecastOnly} onChange={e=>setHasForecastOnly(e.target.checked)}/> Nur Spieler mit mindestens einer Score-Datenquelle anzeigen</label></div>
          <div className="table-scroll"><table className={modelMode==="v2"?"players-table v35-model-v2":"players-table v35-model-legacy"}><thead><tr><th title="Favoriten in deiner Watchlist">★</th><th>Spieler / Team</th><th>Pos.</th><th>Ø Score</th><th>L5</th><th>Gegner</th><th>Floor – Ceiling</th><th>Daten</th>{modelMode==="v2"&&<th>Risiko*</th>}<th>Einsatz</th><th>Prognose</th><th>Scouting (manuell)</th><th>Builder</th><th>Mein Bestand</th>{sport === "nba" && <th>Sterne ★</th>}<th>Kartenbonus</th></tr></thead>
            <tbody>{filtered.slice(0,showCount).map(p => {
              const card = cardStore[p.id] ?? {};
              const syncedCard = effectiveCardStore[p.id] ?? card;
              return <tr key={p.id}>
                <td><button type="button" className={`favorite-toggle ${watchlist.includes(p.id)?"is-favorite":""}`} aria-pressed={watchlist.includes(p.id)} aria-label={`${p.name} ${watchlist.includes(p.id)?"aus Favoriten entfernen":"zu Favoriten hinzufügen"}`} onClick={()=>toggleFavorite(p.id)}>{watchlist.includes(p.id)?"★":"☆"}</button></td>
                <td><div className="player-identity"><PlayerAvatar player={p}/><span><button type="button" className="player-open" onClick={() => setSelectedPlayerId(p.id)} title={`Profil von ${p.name} öffnen`}>{p.name} ↗</button><small>{p.team}{p.injuries > 0 ? " · ⚠ Verletzung" : ""}{p.hasGame === false ? " · kein Spiel" : ""}</small>{p.nextGame && <small className="game-caption">{p.nextGame}</small>}</span></div></td>
                <td><span className="position-pill">{p.position}</span></td>
                <td className="numeric-cell">{p.avg === null ? "—" : fmt(p.avg)}</td>
                <td className="numeric-cell">{p.last5Avg === null ? "—" : fmt(p.last5Avg)}</td>
                <td><span className="opponent-cell"><strong>{p.opponent ?? "—"}</strong><small>{matchupLabel(p.opponentRating)}{p.opponentRating !== null ? ` (${fmt(p.matchupAdjustmentPct)} %)` : ""}</small></span></td>
                <td className="numeric-cell range-cell">{p.forecastSources.length ? `${fmt(p.floor)} – ${fmt(p.ceiling)}` : "—"}</td>
                <td><span className={`confidence-tag confidence-${p.confidence}`} title={`${p.sampleSize} Scores; Datenabdeckung, keine statistische Konfidenz`}>{p.confidence}</span></td>
                {modelMode==="v2"&&<td><span className={`v33-risk v33-risk-${p.modelV2.riskLabel}`} title="Heuristischer Risikoindex, keine echte Ausfallwahrscheinlichkeit">{p.modelV2.riskIndex}/100</span></td>}
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
                <td><div className="builder-actions"><button type="button" className="quick-add-table" title={`${p.name} direkt in den manuellen Builder übernehmen`} onClick={()=>queueManualPlayer(p.id)}>+ Lineup</button>
                  <button type="button" aria-pressed={card.locked === true} className={card.locked ? "active" : ""} title="Spieler fest ins Lineup aufnehmen" onClick={()=>updateCard(p.id,{locked:!card.locked,excluded:false})}>🔒 {card.locked ? "Fixiert" : "Fixieren"}</button>
                  <button type="button" aria-pressed={card.excluded === true} className={card.excluded ? "excluded" : ""} title="Spieler aus Lineups ausschließen" onClick={()=>updateCard(p.id,{excluded:!card.excluded,locked:false})}>🚫</button>
                </div></td>
                <td><label className="owned-checkbox" title="Diese Spielerkarte ist in meinem Bestand"><input type="checkbox" checked={effectiveCardStore[p.id]?.owned === true} disabled={verifiedOwnedReady} title={verifiedOwnedReady?"Bestand aus Sorare synchronisiert, daher nicht manuell änderbar":"Lokale Markierung"} onChange={e=>updateCard(p.id,{owned:e.target.checked})}/><span>{effectiveCardStore[p.id]?.owned ? verifiedOwnedReady?"✓ Sorare":"Meine Karte" : "Merken"}</span></label></td>
                {sport === "nba" && <td><div className="star-cell"><select className="small-select star-select" value={isValidNbaStars(effectiveCardStore[p.id]?.stars) ? String(effectiveCardStore[p.id]?.stars) : ""} disabled={officialStarValue(officialStars[p.id])!==null} aria-label={`Sterne für ${p.name}`} title={officialStarValue(officialStars[p.id])!==null?"Offizielle aktuelle Sorare-Spielerbewertung · nicht manuell überschreibbar":"Manueller Ersatzwert, solange keine offizielle Bewertung vorliegt"} onChange={e=>updateCard(p.id,{stars:e.target.value===""?null:Number(e.target.value)})}><option value="">—</option>{starOptions.map(s=><option value={String(s)} key={s}>{fmt(s)} ★</option>)}</select><small className={officialStarValue(officialStars[p.id])!==null?"star-source-official":"star-source-fallback"}>{nbaStarValue(officialStars[p.id],card.stars).source==="sorare"?"✓ Sorare":isValidNbaStars(card.stars)?"Manuell":"Fehlt"}</small></div></td>}
                <td>{syncedCard.bonusSource==="sorare"?<span className="v293-sorare-bonus" title="Automatischer Bonus der stärksten synchronisierten Karte dieses Spielers. Konkrete Karte im Builder wählen.">+{fmt(syncedCard.bonusPercent??0)} % · Sorare</span>
                  :<select className="small-select" value={card.bonusPercent ?? 0} aria-label={`Kartenbonus für ${p.name}`} onChange={e=>updateCard(p.id,{bonusPercent:Number(e.target.value)})}>{bonuses.map(b=><option value={b} key={b}>+{b} %</option>)}</select>}</td>
              </tr>;
            })}</tbody></table></div>
          {!filtered.length && <div className="empty-state">Keine passenden Spieler im geladenen Datenbereich.</div>}
          {showCount < filtered.length && <button className="load-more" onClick={()=>setShowCount(n=>n+40)}>Weitere Spieler anzeigen ({Math.min(40,filtered.length-showCount)}) ↓</button>}
          {quickNotice && <p className="quick-add-notice" role="status">{quickNotice}</p>}
          <details className="v35-advanced"><summary>Hinweise zu Datenquellen & Prognosen</summary><div className="footnote">Klicke auf einen Spielernamen, um sein Detailprofil zu öffnen. Tipp: Mit „Meine Karte“ markierst du deinen Bestand. NBA-Sterne werden nach Möglichkeit aktuell von Sorare abgerufen; gespeicherte manuelle Sterne dienen nur als Fallback. Kartenboni werden bei verifizierten Karten automatisch aus Sorare übernommen; ohne verfügbare Bonusdaten bleiben lokale Eingaben erhalten. Spielerbilder stammen soweit vorhanden aus der Sorare-API; fehlt ein Foto oder lässt es sich nicht laden, werden Initialen gezeigt. Die Spannen und Zielchancen sind heuristisch und noch nicht gegen echte Spieltagsergebnisse kalibriert. xG/xA sind vorerst nur Informationsfelder (ohne rechnerischen Einfluss); für die Minutenkorrektur musst du übliche UND erwartete Minuten eingeben. Gegnerbewertungen basieren bei aktiviertem Feed auf realen Team-Gegentoren/-punkten oder ansonsten auf deinen manuellen Eingaben; die 1–5-Skala bleibt nur eine grobe Einordnung.</div></details>
        </section>)} 
        {activeTab==="analytics"&&(<section data-tab="analytics" className="panel tracking-panel" id="tracking">
          <div className="section-top"><div><span className="section-kicker">07 / PROGNOSE-DATENBANK & BACKTESTING</span><h2>Prognose gegen Ergebnis</h2></div><span className="record-count">{metrics.count} lokal ausgewertete Vorhersagen</span></div>
          <div className="v39-reality-strip" aria-label="Prediction Reality Check">
            <strong>◈ Reality Check</strong><span>{realityCheck.matched} bestätigte Vor-Spiel-Paare · MAE {realityCheck.mae===null?'—':`${fmt(realityCheck.mae)} PS`} · Bias {realityCheck.bias===null?'—':`${fmt(realityCheck.bias)} PS`}</span><small>{realityCheck.message}</small>
          </div>
          <div className="v35-optional-cloud"><button type="button" aria-expanded={showCloudLearning} onClick={()=>setShowCloudLearning(v=>!v)}>☁ {showCloudLearning?"Cloud-Labor ausblenden":"Optionales Cloud-Labor anzeigen"} (Upstash nicht erforderlich)</button>{showCloudLearning&&<PredictionLearningCloud sport={sport}/>}</div>
          <p className="matchup-disclaimer">Dein <strong>persönliches Browser-Archiv</strong> bleibt ohne Upstash nutzbar. Hier kannst du bisherige Aufzeichnungen bearbeiten und JSON-Dateien sichern. Das Cloud-Labor arbeitet unabhängig im Hintergrund; deine privaten Karten- und Browser-Einstellungen werden nicht übertragen.</p>
          <div className="archive-banner">
            <div><strong>Persönliches Prognosearchiv</strong><small>{archiveBackend==="indexeddb"?"IndexedDB · auf diesem Gerät gespeichert":"Browser-Speicher (Ersatzmodus)"} · {tracked.length} gespeicherte Einträge · nicht geräteübergreifend synchronisiert</small></div>
            <label className="auto-archive-toggle"><input type="checkbox" checked={autoArchiveEnabled} onChange={e=>setAutoArchiveEnabled(e.target.checked)}/><span>Vor-Spiel-Snapshots automatisch sichern</span></label>
          </div>
          <p className="tracking-explainer">Wenn aktiviert, speichert der Helper bei deinen Besuchen bis zu 20 neue Spielerprognosen aus dem ausgewählten Datenbereich – nur für <strong>künftige Kalendertage</strong> mit bekanntem Spieltermin. Diese lokale Zusatzfunktion ist unabhängig von der neuen täglichen Cloud-Automatisierung. Alte Prognosen werden nicht nachträglich verändert.</p>
          <div className="backtest-panel" aria-label="Modell-Vergleich anhand offizieller Ergebnisse">
            <div className="backtest-head"><div><span className="section-kicker">V1.8 / EVIDENCE BOARD</span><h3>Ist das neue Modell wirklich genauer?</h3></div><span className="backtest-state">{backtest.verdict==="noch-keine-daten"?"Noch keine Paarvergleiche":backtest.verdict==="vorläufig"?"Vorläufige Daten":backtest.verdict==="verbessert"?"Holdout: V1.8 vorne":backtest.verdict==="verschlechtert"?"Holdout: V1.7 vorne":"Holdout: Gleichstand"}</span></div>
            <div className="backtest-metrics">
              <div><small>V1.7 · MAE</small><strong>{backtest.baseline?`${fmt(backtest.baseline.mae)} Pkt.`:"—"}</strong></div>
              <div><small>V1.8 · MAE</small><strong>{backtest.challenger?`${fmt(backtest.challenger.mae)} Pkt.`:"—"}</strong></div>
              <div><small>Unterschied im MAE</small><strong>{backtest.differenceMae!==null?`${backtest.differenceMae>0?"+":""}${fmt(backtest.differenceMae)} Pkt.`:"—"}</strong></div>
              <div><small>80-%-Intervall · Ist-Abdeckung</small><strong>{backtest.coverage80!==null?`${fmt(backtest.coverage80)} %`:"—"}</strong></div>
            </div>
            <p className="backtest-foot">Basis: {backtest.official} offiziell bestätigte Paare an {backtest.distinctDays} unterschiedlichen Spieltagen. Bereits gespeicherte V1.7-Prognosen ohne vorab aufgezeichnete V1.8-Vorhersage werden <strong>nicht rückwirkend</strong> umgerechnet. {backtest.holdout?`Zeitlich zurückgehaltener Test: ${backtest.holdout.count} Vorhersagen, MAE alt ${fmt(backtest.holdout.baselineMae)} / neu ${fmt(backtest.holdout.challengerMae)}.`:"Ein zeitlicher Holdout wird erst nach mindestens 20 bestätigten Paaren aus 6 Spieltagen angezeigt."} Auch bei besserem MAE besteht Unsicherheit; das Modell wird nicht automatisch umtrainiert.</p>
          </div>
          {activeTab==="analytics"&&<PredictionLabPro rows={tracked} sport={sport}/>}
          <div className="tracking-tools">
            <button className="action-primary" type="button" disabled={trackingCheck.running || !autoPending} onClick={()=>void checkSavedResults()}>{trackingCheck.running ? "Prüfung läuft …" : `Ergebnisse prüfen (${autoPending} offen)`}</button>
            <button type="button" onClick={exportTracking} disabled={!tracked.length}>Prognosen sichern (JSON)</button>
            <label className="tracking-upload">Sicherung importieren<input type="file" accept=".json,application/json" onChange={e=>{void importTracking(e.target.files?.[0]);e.target.value="";}}/></label>
          </div>
          {trackingCheck.message && <p className="tracking-status" role="status">{trackingCheck.message}</p>}
          <p className="tracking-explainer">Automatisch ausgefüllt: {metrics.officialCount} · Manuell: {metrics.manualCount} · Noch offen: {tracked.filter(t=>t.actual === null).length}. Bei fehlendem Spieltermin oder nicht endgültigem Sorare-Score wird nichts geraten.</p>
          <div className="tracking-metrics">
            <div><small>MAE · Ø absoluter Fehler</small><strong>{metrics.mae === null ? "—" : `${fmt(metrics.mae)} Pkt.`}</strong></div>
            <div><small>RMSE · größere Fehler stärker gewichtet</small><strong>{metrics.rmse === null ? "—" : `${fmt(metrics.rmse)} Pkt.`}</strong></div>
            <div><small>Bias · Prognose minus Ist</small><strong>{metrics.bias === null ? "—" : `${fmt(metrics.bias)} Pkt.`}</strong></div>
          </div>
          <div className="tracking-calibration">{advice ? <><strong>Kalibrierungsvorschlag ({advice.count} Ergebnisse)</strong><p>{advice.label}. Ein vorsichtiger Richtwert wäre {advice.offset > 0 ? "+" : ""}{fmt(advice.offset)} Punkte pro Prognose. Dieser Hinweis ändert das Modell <strong>nicht automatisch</strong>, um Überanpassung zu vermeiden.</p></> : <><strong>Modell-Lerneffekt</strong><p>Für einen belastbaren Korrekturvorschlag benötigen wir mindestens 20 ausgewertete Prognosen aus fünf Spieltagen. Die bisherigen Prognoseformeln bleiben bis dahin unverändert.</p></>}</div>
          {chosen && <button type="button" className="action-primary" onClick={() => chosen.picks.forEach(pick => saveTracked(pick.player))}>Diese 5 Spielerprognosen speichern</button>}
          <div className="tracking-scroll"><table className="tracking-table"><thead><tr><th>Spieler / gespeicherte Partie</th><th>Prognose</th><th>Ist-Score</th><th>Fehler</th><th></th></tr></thead><tbody>
            {tracked.slice(0, 60).map(row => <tr key={row.key}><td><strong>{row.playerName}</strong><small>{row.fixture ?? row.savedAt.slice(0,10)}</small></td><td>{fmt(row.predicted)}</td><td><input aria-label={`Tatsächlicher Sorare-Score für ${row.playerName}`} type="number" min="0" max="500" step="0.1" value={row.actual ?? ""} placeholder="Eintragen" onChange={e => setTracked(items => setActual(items,row.key,e.target.value === "" ? null : Number(e.target.value)))}/></td><td>{row.actual === null ? "—" : <>{fmt(row.predicted-row.actual)} <small className="tracking-source">{row.actualSource === "sorare" ? "Sorare FINAL" : "manuell"}</small></>}</td><td><button type="button" className="delete-tracking" aria-label={`Prognose für ${row.playerName} löschen`} onClick={() => setTracked(items=>items.filter(item=>item.key!==row.key))}>Entfernen</button></td></tr>)}
          </tbody></table></div>
          {!tracked.length && <div className="empty-state">Noch keine Prognosen gespeichert. Öffne einen Spieler und klicke auf „Prognose merken“ oder speichere ein vollständiges Lineup.</div>}
        </section>)} 
        {selectedPlayer && <div className="profile-overlay" onMouseDown={e => {if (e.target === e.currentTarget) setSelectedPlayerId(null);}}>
          <div className="profile-dialog" role="dialog" aria-modal="true" aria-label={`Spielerprofil ${selectedPlayer.name}`}>
            <button className="profile-close" type="button" autoFocus onClick={() => setSelectedPlayerId(null)} aria-label="Profil schließen">×</button>
            <div className="profile-head"><PlayerAvatar player={selectedPlayer}/><div><span className="section-kicker">SPIELERPROFIL · {sport === "nba" ? "NBA" : league === "__all" ? "FUẞBALL" : league}</span><h2>{selectedPlayer.name}</h2><p>{selectedPlayer.team} · {POS_LABEL[selectedPlayer.position] ?? selectedPlayer.position}</p></div></div>
            {sport==="nba"&&<div className="nba-profile-star"><strong>★ {isValidNbaStars(effectiveCardStore[selectedPlayer.id]?.stars)?fmt(effectiveCardStore[selectedPlayer.id].stars!):"—"}</strong><span>{nbaStarValue(officialStars[selectedPlayer.id],cardStore[selectedPlayer.id]?.stars).source==="sorare"?"Aktuelle Sorare-Spielersterne":isValidNbaStars(cardStore[selectedPlayer.id]?.stars)?"Manueller Fallback-Wert":"Sorare hat keinen gültigen Sternwert geliefert"} · Gameweek-Sternpreis kann abweichen</span></div>}
            <div className="profile-stats">
              <div><small>Erwarteter Score inkl. Einsatzrisiko</small><strong>{((selectedPlayer.sampleSize > 0 || selectedPlayer.proj !== null || selectedPlayer.avg !== null) ? fmt(selectedPlayer.weighted) : "—")}</strong></div>
              <div><small>Bei Einsatz</small><strong>{((selectedPlayer.sampleSize > 0 || selectedPlayer.proj !== null || selectedPlayer.avg !== null) ? fmt(selectedPlayer.expected) : "—")}</strong></div>
              <div><small>Einsatzwahrscheinlichkeit (Modell)</small><strong>{Math.round(selectedPlayer.playProb*100)} %</strong></div>
              <div><small>Floor / Ceiling (heuristisch)</small><strong>{(selectedPlayer.sampleSize > 0 || selectedPlayer.proj !== null || selectedPlayer.avg !== null) ? `${fmt(selectedPlayer.floor)} – ${fmt(selectedPlayer.ceiling)}` : "—"}</strong></div>
            </div>
            <section className="v33-profile-card" aria-label="Prediction Engine 2.0 Analyse">
              <div className="v33-profile-head"><strong>✦ PREDICTION ENGINE 2.0</strong><span>Datenqualität: {selectedPlayer.modelV2.quality}</span></div>
              {selectedPlayer.modelV2.applicable ? <>
                <div className="v33-metrics">
                  <div><small>Prognose inkl. DNP</small><strong>{fmt(selectedPlayer.modelV2.weighted)}</strong><span>Bei Einsatz {fmt(selectedPlayer.modelV2.expected)}</span></div>
                  <div><small>Floor – Ceiling*</small><strong>{fmt(selectedPlayer.modelV2.floor)} – {fmt(selectedPlayer.modelV2.ceiling)}</strong><span>Bei Einsatz · heuristisch</span></div>
                  <div><small>Risikoindex*</small><strong>{selectedPlayer.modelV2.riskIndex}/100</strong><span>{selectedPlayer.modelV2.riskLabel} · keine Ausfallwahrscheinlichkeit</span></div>
                </div>
                <div className="v33-interval">V2.0 gegenüber V1.8: <strong>{selectedPlayer.modelV18.applicable?`${selectedPlayer.modelV2.weighted>=selectedPlayer.modelV18.advancedWeighted?"+":""}${fmt(selectedPlayer.modelV2.weighted-selectedPlayer.modelV18.advancedWeighted)} Pkt.`:"kein Vergleich"}</strong> · Modellunterschied, keine gemessene Verbesserung</div>
                <div className="v33-interval">Inkl. DNP: P10–P90 Modellband <strong>{fmt(selectedPlayer.modelV2.unconditionalP10)} – {fmt(selectedPlayer.modelV2.unconditionalP90)}</strong> · nicht kalibriert</div>
                <div className="v33-signals"><span>Form-Gewicht: <strong>{Math.round(selectedPlayer.modelV2.recentWeight*100)} %</strong></span><span>Gegner: <strong>{selectedPlayer.modelV2.matchupPct>=0?"+":""}{fmt(selectedPlayer.modelV2.matchupPct)} %</strong></span><span>Minuten: <strong>{selectedPlayer.modelV2.minutesPct>=0?"+":""}{fmt(selectedPlayer.modelV2.minutesPct)} %</strong></span></div>
              </> : <p>Keine verwertbare Scoregrundlage. V2.0 erstellt keine erfundene Vorhersage.</p>}
              <ul>{selectedPlayer.modelV2.reasons.map((reason,i)=><li key={i}>{reason}</li>)}</ul>
              <p className="v33-disclaimer">* Modellbasierte Orientierung, keine statistisch validierte Sicherheit. V2.0 nutzt ausschließlich die bereits vorhandenen Sorare- und Scouting-Eingaben.</p>
            </section>
            <section className="v18-profile-card" aria-label="Modell-Vergleich und Score-Chancen">
              <div className="v18-profile-title"><strong>FORECAST LAB · V1.8</strong><span>{selectedPlayer.modelV18.quality}e Datenlage</span></div>
              <div className="v18-compare"><div><small>Bisherige Prognose</small><strong>{selectedPlayer.modelV18.applicable?fmt(selectedPlayer.modelV18.baselineWeighted):"—"}</strong></div><div><small>V1.8 Prognose</small><strong>{selectedPlayer.modelV18.applicable?fmt(selectedPlayer.modelV18.advancedWeighted):"—"}</strong></div><div><small>Änderung</small><strong>{selectedPlayer.modelV18.applicable?`${selectedPlayer.modelV18.changePercent>=0?"+":""}${fmt(selectedPlayer.modelV18.changePercent)} %`:"—"}</strong></div></div>
              {selectedPlayer.modelV18.applicable && <><div className="v18-distribution"><span>80-%-Modellintervall inkl. DNP: <strong>{fmt(selectedPlayer.modelV18.unconditionalP10)} – {fmt(selectedPlayer.modelV18.unconditionalP90)}</strong> Pkt.</span><span>Bei Einsatz: <strong>{fmt(selectedPlayer.modelV18.conditionalLow)} – {fmt(selectedPlayer.modelV18.conditionalHigh)}</strong> Pkt. (heuristisch)</span></div><div className="v18-prob-list">{[sport==="nba"?40:50,sport==="nba"?60:70].map(threshold=>{const chance=pointsAtLeast(selectedPlayer.modelV18.advancedExpected,selectedPlayer.modelV18.conditionalSd,selectedPlayer.playProb,threshold);return <div key={threshold}><span>Chance auf mindestens {threshold} Pkt. (Modell)</span><strong>{chance===null?"—":`${Math.round(chance*100)} %`}</strong><div><span style={{width:`${chance===null?0:Math.round(chance*100)}%`}}/></div></div>;})}</div></>}
              <ul>{selectedPlayer.modelV18.reasons.map((reason,i)=><li key={i}>{reason}</li>)}</ul>
              <p>Unkalibrierte Näherungen, keine garantierten Trefferquoten. Beide Prognosen werden erst <em>vor</em> dem Spiel eingefroren und später am echten Sorare-Score gemessen.</p>
            </section>
            <section className="profile-forecast-explain" aria-label="Prognose transparent erklärt">
              <div className="profile-forecast-title"><h3>Wie entsteht die Prognose?</h3><span>{selectedPlayer.forecastSources.length ? `${selectedPlayer.forecastSources.length} Datenquellen` : "Keine Score-Datenquelle"}</span></div>
              {selectedPlayer.forecastSources.length ? <>
                <p>Hier siehst du die Eingaben der ursprünglichen V1.7-Basisprognose. V1.8 ergänzt darüber einen vorsichtigen, ausreißerrobusten Trend und speichert beide Werte für den späteren Vergleich.</p>
                <div className="profile-forecast-sources">{selectedPlayer.forecastSources.map((source,index)=><div className="forecast-source-row" key={`${source.label}-${index}`}>
                  <span><strong>{source.label}</strong><small>{source.origin}</small></span>
                  <span><strong>{fmt(source.value)} Pkt.</strong><small>{Math.round(source.share*100)} % Gewicht</small></span>
                  <div className="forecast-source-track"><span style={{width:`${Math.round(source.share*100)}%`}}/></div>
                </div>)}</div>
                <p className="forecast-calc-note">Danach werden die vorhandene Gegnerbewertung ({fmt(selectedPlayer.matchupAdjustmentPct)} %) und eine optionale Minutenkorrektur ({fmt(selectedPlayer.minutesAdjustmentPct)} %) berücksichtigt. Für den risikoangepassten Wert wird anschließend die modellierte Einsatzchance einbezogen.</p>
              </> : <p>Für diesen Spieler liegen keine verwertbaren Score-Eingaben vor. Es wird bewusst keine erfundene Punkteprognose gezeigt.</p>}
              <div className="forecast-form-status"><strong>Formtrend:</strong> {selectedPlayer.formDirection === "unbekannt" ? "Nicht genügend getrennte historische Spielwerte" : `${selectedPlayer.formDirection} (${selectedPlayer.formChangePct !== null && selectedPlayer.formChangePct>0?"+":""}${fmt(selectedPlayer.formChangePct ?? 0)} % letzte fünf vs. ältere Spiele)`} <small>Der Basistrend wird separat angezeigt; V1.8 berücksichtigt einen vorsichtig begrenzten robusten Trend.</small></div>
            </section>
            <h3>Formkurve · letzte {profileScores.length} Scores</h3>
            {profileScores.length ? <div className="score-bars">{[...profileScores].reverse().map((score,i) => <div key={i} title={`${fmt(score)} Punkte`}><span style={{height:`${Math.min(100, Math.max(4, score / Math.max(1,...profileScores) * 100))}%`}}/><small>{fmt(score)}</small></div>)}</div> : <p className="profile-muted">{historyLoading ? "Historische Scores werden geladen …" : historyError ? "Einzelscores konnten aktuell nicht geladen werden. L5/L10-Durchschnittswerte bleiben nutzbar, sofern Sorare sie liefert." : "Keine historischen Einzelscores von Sorare verfügbar."}</p>}
            <div className="profile-detail-grid"><p><strong>Nächstes Spiel:</strong> {selectedPlayer.nextGame ?? "Nicht verfügbar"}</p><p><strong>Gegner:</strong> {selectedPlayer.opponent ?? "Nicht verfügbar"}</p><p><strong>Form L5 / L10:</strong> {selectedPlayer.last5Avg === null ? "—" : fmt(selectedPlayer.last5Avg)} / {selectedPlayer.last10Avg === null ? "—" : fmt(selectedPlayer.last10Avg)}</p><p><strong>Datenabdeckung:</strong> {selectedPlayer.confidence} ({profileScores.length} Einzelscores; ggf. separate L5/L10-Mittelwerte)</p><p><strong>Bewertung Gegner:</strong> {matchupLabel(selectedPlayer.opponentRating)} {selectedPlayer.opponentRating !== null ? (opponentRatings[selectedPlayer.opponent ?? ""] ? "· manuell" : "· automatisch") : ""}</p><p><strong>Verletzungseinträge:</strong> {selectedPlayer.injuries}</p></div>
            <div className="profile-actions"><button type="button" className="action-primary" onClick={()=>queueManualPlayer(selectedPlayer.id)}>+ Direkt in mein Lineup</button><button type="button" className="profile-favorite" aria-pressed={watchlist.includes(selectedPlayer.id)} onClick={()=>toggleFavorite(selectedPlayer.id)}>{watchlist.includes(selectedPlayer.id)?"★ Favorit entfernen":"☆ Zu Favoriten"}</button><button className="action-primary" type="button" onClick={() => saveTracked(selectedPlayer)}>{tracked.some(t=>t.key===createTrackedPrediction(selectedPlayer,sport).key) ? "Prognose gespeichert ✓" : "Prognose merken"}</button><button type="button" onClick={() => updateCard(selectedPlayer.id,{locked:!selectedCard.locked, excluded:false})}>{selectedCard.locked ? "Fixierung lösen" : "Für Lineup fixieren"}</button><button type="button" onClick={() => updateCard(selectedPlayer.id,{owned:!selectedCard.owned})}>{selectedCard.owned ? "Aus Kartenbestand entfernen" : "Als eigene Karte markieren"}</button></div>
            <p className="profile-muted">Für NBA gelten vorrangig die offiziell synchronisierten Sorare-Sterne; sonst deine manuellen Sternwerte. Kartenboni bleiben manuell. Für Spieler ohne aktuelle Sorare-Projektion sind Prognosen nicht belastbar.</p>
          </div>
        </div>}
        <footer className="app-footer"><strong>MARKERRAS SORARE HELPER</strong><span>Independent Sorare companion · Nicht mit Sorare verbunden · Kein automatisches Einreichen von Lineups</span></footer>
      </main>
    </div>
  );
}

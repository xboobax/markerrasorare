"use client";

import {useEffect,useMemo,useRef,useState,type DragEvent} from "react";
import {ARCADE} from "@/config/divination";
import {isValidNbaStars,slotAccepts,type CardInput,type Strategy} from "@/lib/arcade";
import {evaluateManualLineup} from "@/lib/manual-lineup";
import {diagnoseLineup} from "@/lib/lineup-doctor";
import {gameDate,initialTeams,placeInTeam,restoreWorkspace,withinHorizon,workspaceKey,type WorkspaceTeam} from "@/lib/builder-workspace";
import {goalMeter,moveBetweenSelections,quickSwapsForSlot,smartFillEmptySlots} from "@/lib/builder-neon";
import {nbaGameCoverage,opportunitiesForTeam,assessMatchup,compareBuilderTeams,transferWorkspacePlayer,multiGameLabel,type GameWindow} from "@/lib/builder-pro";
import type {ScheduleData} from "@/lib/gameweek-center";
import type {OpponentRatings} from "@/lib/matchups";
import type {Forecast,Sport} from "@/lib/model";
import {availabilityLabels,isConfirmedOut,type AvailabilityReport} from "@/lib/availability";
import {useAvailability} from "@/app/hooks/use-availability";
import {isInSelectedCollection,selectedCardBonus,type OwnedCollection} from "@/lib/my-collection";
import {captainForTeam,captainLineup,captainExtra,smartCaptain,swapPreview,cardsForPlayer,chooseCardAsset,columnsForPreset,columnsLabels,type ColumnKey,type CaptainMode} from "@/lib/lineup-v29";
import {playsOnBerlinDay,offsetBerlinDay,expectedFloor,expectedCeiling,expectedUpside,comparePoolValues,type MatchdayHorizon,type PoolSort} from "@/lib/builder-pool";
import {nbaValueScore,topNbaValuePlayers,type NbaValueMode} from "@/lib/builder-value";

type CardSettings={owned?:boolean;stars?:number|null;bonusPercent?:number;bonusSource?:"sorare";starSource?:"sorare";locked?:boolean;excluded?:boolean};
type Props={sport:Sport;league:string;availability:ReturnType<typeof useAvailability>;availabilityById:Record<string,AvailabilityReport>;players:Forecast[];cardStore:Record<string,CardSettings>;ownedOnly:boolean;verifiedOwnedReady:boolean;verifiedCollection:OwnedCollection|null;updateCard:(id:string,patch:CardSettings)=>void;
  targetScore:number|null;onOpenProfile:(id:string)=>void;onSavePredictions:(picks:Forecast[])=>void;
  requestedPlayer?:{id:string;seq:number}|null;favorites:string[];onToggleFavorite:(id:string)=>void;
  nbaSchedule:ScheduleData;matchupRatings:OpponentRatings;matchupSource:string|null;
};
const fmt=(n:number)=>Number.isFinite(n)?n.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1}):"—";
const fixtureTime=(p:Forecast)=>p.nextGameTipoff?new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit"}).format(new Date(p.nextGameTipoff)):null;
const short=(n:number)=>Number.isFinite(n)?n.toLocaleString("de-DE",{maximumFractionDigits:0}):"—";
const slotNames:Record<string,string>={GK:"Torwart",DEF:"Verteidiger",MID:"Mittelfeld",FWD:"Stürmer",FLEX:"Extra",ANY:"NBA-Karte"};
const positionNames:Record<string,string>={GK:"Torwart",DEF:"Verteidiger",MID:"Mittelfeld",FWD:"Stürmer",G:"Guard",F:"Forward",C:"Center"};
const filterKey=(v:string)=>v.toLocaleLowerCase("de-DE").normalize("NFKD").replace(/[\u0300-\u036f]/g,"");
function Avatar({player}:{player:Forecast}){
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[player.imageUrl]);
  return player.imageUrl&&!failed?<img src={player.imageUrl} loading="lazy" referrerPolicy="no-referrer" alt={`Foto: ${player.name}`} onError={()=>setFailed(true)}/>
    :<span className="v23-avatar-empty">{player.name.split(/\s+/).slice(0,2).map(part=>part[0]??"").join("")}</span>;
}
function Bars({player,compact=false}:{player:Forecast;compact?:boolean}){
  const values=(player.recentScores??[]).filter(n=>Number.isFinite(n)&&n>=0).slice(0,10).reverse();
  if(!values.length)return <span className="v23-no-form">Keine Einzel-Scores</span>;
  const max=Math.max(10,...values);
  return <div className={`v23-form-bars ${compact?"v24-card-form":""}`} title={`Letzte ${values.length} Sorare-Scores · historische Form, keine Live-Werte`} aria-label={`Letzte ${values.length} Scores: ${values.map(short).join(", ")}`}>
    {values.map((value,i)=><i key={i} style={{height:`${Math.max(9,Math.round(value/max*100))}%`}} className={value>=60?"positive":value<25?"negative":"neutral"}/>)}
  </div>;
}
function MatchupPill({opponent,ratings,sport}:{opponent:string|undefined;ratings:OpponentRatings;sport:Sport}){
  const m=assessMatchup(opponent,ratings,sport);
  return <span className={`v25-matchup-badge v25-matchup-${m.tone}`} title={m.rating===null?"Keine verifizierten oder manuell hinterlegten defensiven Gegnerdaten":`Gegnerstärke ${m.rating}/5 · Einordnung aus Datenquelle oder manueller Bewertung, keine garantierte Prognose`}>
    {m.rating===null?"◇ Unbewertet":`◆ ${m.label}`}
  </span>;
}
function AvailabilityBadge({report,small=false}:{report?:AvailabilityReport;small?:boolean}){
  return <span className={`v26-availability ${report?`v26-${report.status}`:"v26-unknown"} ${small?"v26-compact":""}`}
    title={report?`${availabilityLabels[report.status]} · ${report.reason} · Quelle: ${report.source}${report.gameDate?` · Spiel: ${report.gameDate}`:""}`:"Keine aktuelle Ausfallmeldung für diesen Spieler gefunden. Das ist keine Einsatzbestätigung."}>
    {report?availabilityLabels[report.status]:"? Nicht gemeldet"}
  </span>;
}
function MiniStat({label,value,tone}:{label:string;value:string;tone?:"good"|"warn"|"star"}){
  return <div className="v23-mini-stat"><small>{label}</small><strong className={tone?`tone-${tone}`:""}>{value}</strong></div>;
}
export default function BuilderWorkspace({sport,league,availability,availabilityById,players,cardStore,ownedOnly,verifiedOwnedReady,verifiedCollection,updateCard,targetScore,onOpenProfile,onSavePredictions,requestedPlayer,favorites,onToggleFavorite,nbaSchedule,matchupRatings,matchupSource}:Props){
  const [teams,setTeams]=useState<WorkspaceTeam[]>(initialTeams);
  const [activeTeamId,setActiveTeamId]=useState("team-1");
  const [loadedSport,setLoadedSport]=useState<Sport|null>(null);
  const [activeSlot,setActiveSlot]=useState<number|null>(null);
  const [query,setQuery]=useState("");
  const [horizon,setHorizon]=useState<MatchdayHorizon>("today");
  const [matchdayReady,setMatchdayReady]=useState(false);
  const [valueFilter,setValueFilter]=useState<NbaValueMode>("all");
  const [pool,setPool]=useState<"all"|"favorites"|"healthy">("all");
  const [availabilityFilter,setAvailabilityFilter]=useState<"all"|"alerts"|"out"|"unknown">("all");
  const [sort,setSort]=useState<PoolSort>("weighted");
  const [sortDescending,setSortDescending]=useState(true);
  const [position,setPosition]=useState("all");
  const [msg,setMsg]=useState("");
  const [lastRequest,setLastRequest]=useState<number|null>(null);
  const [undoTeams,setUndoTeams]=useState<WorkspaceTeam[]|null>(null);
  const [strategy,setStrategy]=useState<Strategy>("balanced");
  const [now,setNow]=useState<Date|null>(null);
  const [swapTarget,setSwapTarget]=useState<{teamId:string;slot:number}|null>(null);
  const [previewSwapId,setPreviewSwapId]=useState<string|null>(null);
  const [intelId,setIntelId]=useState<string|null>(null);
  const [showFinalCheck,setShowFinalCheck]=useState<string|null>(null);
  const [tablePreset,setTablePreset]=useState<"all"|"compact"|"scouting"|"custom">("compact");
  const [visibleColumns,setVisibleColumns]=useState<ColumnKey[]>(columnsForPreset("compact",sport));
  const [showColumnSettings,setShowColumnSettings]=useState(false);
  const [dragTarget,setDragTarget]=useState<string|null>(null);
  const [gameWindow,setGameWindow]=useState<GameWindow>(7);
  const [multiOnly,setMultiOnly]=useState(false);
  const [compareOpen,setCompareOpen]=useState(false);
  const [compareId,setCompareId]=useState("team-2");
  const [tapSource,setTapSource]=useState<{teamId:string;slot:number;playerName:string}|null>(null);
  const [tapMode,setTapMode]=useState<"copy"|"move">("copy");
  const dragRef=useRef<{kind:"pool"|"slot";playerId:string;teamId?:string;slot?:number}|null>(null);
  useEffect(()=>{
    setNow(new Date());
    // Keep "Heute" correct when the page stays open across German midnight / DST.
    const ticker=window.setInterval(()=>setNow(new Date()),60_000);
    return ()=>window.clearInterval(ticker);
  },[]);
  const activeTeam=teams.find(t=>t.id===activeTeamId)??teams[0];
  const onlyMyCards=ownedOnly||matchdayReady;
  const slots=sport==="nba"?ARCADE.nba.slots:ARCADE.football.slots;
  const gameCoverage=useMemo(()=>nbaGameCoverage(nbaSchedule,now??new Date(0),gameWindow),[nbaSchedule,now,gameWindow]);
  const gamesFor=(teamName:string)=>sport==="nba"?opportunitiesForTeam(teamName,gameCoverage):[];
  const activeCalendarDay=now?offsetBerlinDay(now,horizon==="tomorrow"?1:0):null;
  const eligibleByHorizon=(p:Forecast)=>{
    if(horizon==="today"||horizon==="tomorrow")return activeCalendarDay!==null&&playsOnBerlinDay(p,sport,activeCalendarDay,nbaSchedule);
    return horizon===null||!now||withinHorizon(gameDate(p),horizon,now,Boolean(p.nextGameTipoff));
  };
  const excludedByInjury=useMemo(()=>Object.entries(availabilityById).filter(([,r])=>isConfirmedOut(r)).map(([id])=>id),[availabilityById]);
  const availableAt=availability.data?.fetchedAt?new Date(availability.data.fetchedAt).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}):"—";
  const cards:CardInput[]=useMemo(()=>players.map(player=>({player,owned:cardStore[player.id]?.owned===true,
    stars:cardStore[player.id]?.stars??null,bonusPercent:cardStore[player.id]?.bonusPercent??0})),[players,cardStore]);
  const favoriteSet=useMemo(()=>new Set(favorites),[favorites]);
  const byId=useMemo(()=>new Map(players.map(player=>[player.id,player])),[players]);
  const teamCards=(team:WorkspaceTeam):CardInput[]=>cards.map(c=>{
    const available=cardsForPlayer(verifiedCollection?.cards,sport,c.player.id);
    const asset=chooseCardAsset(available,team.assetIds?.[c.player.id]);
    const customBonus=asset?team.assetBonuses?.[asset.assetId]:undefined;
    return {...c,bonusPercent:selectedCardBonus(asset,customBonus,asset&&cardStore[c.player.id]?.bonusSource==="sorare"?0:c.bonusPercent??0).percent};
  });
  const assessment=useMemo(()=>teams.map(team=>{
    const base=evaluateManualLineup(team.selection,teamCards(team),sport,team.goal??targetScore);
    const captain=sport==="football"?captainForTeam(base,team.captainId,availabilityById,team.captainMode??"projection"):null;
    return {team,base,captain,result:captainLineup(base,sport,captain,team.goal??targetScore)};
  }),[teams,cards,sport,targetScore,availabilityById,verifiedCollection]);
  const currentResult=assessment.find(a=>a.team.id===activeTeamId)?.result??assessment[0]?.result;
  const doctor=useMemo(()=>activeTeam?diagnoseLineup(activeTeam.selection,cards,sport,activeTeam.goal??targetScore,{limit:3}):null,
    [activeTeam,cards,sport,targetScore]);
  const selectedIds=new Set(activeTeam?.selection.filter((id):id is string=>!!id)??[]);
  const battleOpponent=teams.find(t=>t.id===compareId&&t.id!==activeTeamId)??teams.find(t=>t.id!==activeTeamId);
  const compareBase=assessment.find(a=>a.team.id===activeTeamId);
  const compareOther=assessment.find(a=>a.team.id===battleOpponent?.id);
  const battle=compareBase&&compareOther?compareBuilderTeams(compareBase.result,compareOther.result,compareBase.team.goal??targetScore,compareOther.team.goal??targetScore):null;
  const activeSlotLabel=activeSlot===null?"Nächsten freien Slot belegen":`Slot ${activeSlot+1}: ${slotNames[slots[activeSlot]]}`;

  useEffect(()=>{
    setTablePreset("compact");setVisibleColumns(columnsForPreset("compact",sport));
    try{const entry=JSON.parse(window.localStorage.getItem(`markerras.sorare.table.v29.${sport}`)||"null");
      if(Array.isArray(entry?.columns)){const good=columnsForPreset("all",sport);setVisibleColumns(entry.columns.filter((c:ColumnKey)=>good.includes(c)));setTablePreset("custom");}}
    catch{}
  },[sport]);
  const showCol=(key:ColumnKey)=>visibleColumns.includes(key);
  const setPreset=(preset:"all"|"compact"|"scouting")=>{setTablePreset(preset);setVisibleColumns(columnsForPreset(preset,sport));try{window.localStorage.removeItem(`markerras.sorare.table.v29.${sport}`);}catch{}};
  const toggleCol=(key:ColumnKey)=>{const next=visibleColumns.includes(key)?visibleColumns.filter(c=>c!==key):[...visibleColumns,key];setVisibleColumns(next);setTablePreset("custom");try{window.localStorage.setItem(`markerras.sorare.table.v29.${sport}`,JSON.stringify({columns:next}));}catch{}};
  useEffect(()=>{
    setLoadedSport(null);setMatchdayReady(false);setValueFilter("all");setActiveSlot(null);setSwapTarget(null);setTapSource(null);setCompareOpen(false);setMsg("");setLastRequest(null);setUndoTeams(null);
    try{
      const raw=window.localStorage.getItem(workspaceKey(sport));
      const legacy=window.localStorage.getItem(`markerras.sorare.manual-lineup.v1.${sport}`);
      const restored=restoreWorkspace(raw?JSON.parse(raw):null,legacy?JSON.parse(legacy):null);
      setTeams(restored.teams);setActiveTeamId(restored.activeTeamId);
    }catch{setTeams(initialTeams());setActiveTeamId("team-1");}
    setLoadedSport(sport);setIntelId(null);setPreviewSwapId(null);
  },[sport]);
  useEffect(()=>{
    if(loadedSport!==sport)return;
    try{window.localStorage.setItem(workspaceKey(sport),JSON.stringify({teams,activeTeamId}));}catch{}
  },[teams,activeTeamId,sport,loadedSport]);

  const changeTeams=(fn:(previous:WorkspaceTeam[])=>WorkspaceTeam[])=>{
    setUndoTeams(teams.map(t=>({...t,selection:t.selection.slice(),locks:[...t.locks],assetIds:{...t.assetIds}})));
    setTeams(prev=>fn(prev).map(team=>{
      const ids=new Set(team.selection.filter((id):id is string=>!!id));
      return {...team,captainId:sport==="football"&&team.captainId&&ids.has(team.captainId)?team.captainId:null,
        assetIds:Object.fromEntries(Object.entries(team.assetIds??{}).filter(([key])=>ids.has(key)))};
    }));
  };
  const changeTeam=(id:string,fn:(current:WorkspaceTeam)=>WorkspaceTeam)=>changeTeams(old=>old.map(t=>{
    if(t.id!==id)return t;
    const next=fn(t);
    const ids=new Set(next.selection.filter((v):v is string=>!!v));
    return {...next,captainId:sport==="football"&&next.captainId&&ids.has(next.captainId)?next.captainId:null,
      assetIds:Object.fromEntries(Object.entries(next.assetIds??{}).filter(([k])=>ids.has(k)))};
  }));
  const select=(id:string,slot:number|null=activeSlot,teamId:string=activeTeamId)=>{
    const team=teams.find(t=>t.id===teamId);
    if(!team)return;
    if(!isInSelectedCollection(id,cardStore,onlyMyCards,verifiedOwnedReady)){
      setMsg("Nur meine Karten ist aktiv: Dieser Spieler gehört nicht zur vollständig synchronisierten Sorare-Sammlung.");return;
    }
    const candidate=byId.get(id);
    if(horizon!==null&&candidate&&!eligibleByHorizon(candidate)){
      setMsg("Dieser Spieler hat im gewählten Zeithorizont keinen bestätigten Spieltermin. Wähle einen anderen Zeitraum, um ihn hinzuzufügen.");return;
    }
    if(matchdayReady&&isConfirmedOut(availabilityById[id])){
      setMsg("Matchday Ready: Dieser Spieler ist als OUT gemeldet. Der bestehende Teamstand bleibt erhalten.");return;
    }
    if(cardStore[id]?.excluded){setMsg("Dieser Spieler ist ausgeschlossen. Entferne erst die Sperre in der Spielerliste.");return;}
    const targetIndex=slot===null?team.selection.findIndex((v,i)=>!v&&slotAccepts(slots[i],byId.get(id)?.position??"")):slot;
    if(targetIndex!==null&&targetIndex>=0&&team.selection[targetIndex]&&team.locks.includes(team.selection[targetIndex]!)){
      setMsg("Dieser Slot ist fixiert. Bitte erst das Schloss öffnen.");return;
    }
    const placed=placeInTeam(team.selection,id,cards,sport,slot);
    if(placed.reason){setMsg(placed.reason);return;}
    changeTeam(team.id,old=>({...old,selection:placed.selection,locks:old.locks.filter(lock=>placed.selection.includes(lock))}));
    setActiveTeamId(team.id);setActiveSlot(null);
    const report=availabilityById[id];
    setMsg(`${byId.get(id)?.name??"Spieler"} in Team ${teams.indexOf(team)+1} · Slot ${(placed.index??0)+1} aufgenommen.${report?.status==="out"?" ACHTUNG: Für das nächste gemeldete Spiel als OUT markiert. Bitte Quick Swap prüfen.":""}`);
  };
  useEffect(()=>{
    if(!requestedPlayer||loadedSport!==sport||lastRequest===requestedPlayer.seq)return;
    setLastRequest(requestedPlayer.seq);
    select(requestedPlayer.id,null);
    // An explicit external add always uses a free slot, never an already selected slot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[requestedPlayer,loadedSport,sport]);
  const clearTeam=(id:string)=>{
    const team=teams.find(t=>t.id===id);
    if(!team)return;
    if(team.selection.some(Boolean)&&!window.confirm("Alle fünf Spieler dieses Teams entfernen?"))return;
    changeTeam(id,t=>({...t,selection:[null,null,null,null,null],locks:[],captainId:null,assetIds:{},assetBonuses:{}}));setMsg("Team geleert.");
  };
  const cloneTeam=(id:string)=>{
    if(teams.length>=6){setMsg("Maximal sechs Teams gleichzeitig. Lösche eines, um Platz zu schaffen.");return;}
    const source=teams.find(t=>t.id===id);
    if(!source)return;
    const nextId=`team-${Math.max(...teams.map(t=>Number(t.id.split("-")[1])||0))+1}`;
    changeTeams(old=>[...old,{...source,id:nextId,selection:source.selection.slice(),locks:[...source.locks],assetIds:{...source.assetIds},assetBonuses:{...source.assetBonuses},collapsed:false}]);
    setActiveTeamId(nextId);setMsg("Team als neue Variante dupliziert.");
  };
  const removeTeam=(id:string)=>{
    if(teams.length<=1){clearTeam(id);return;}
    if(!window.confirm("Dieses Team inklusive seiner Spieler löschen?"))return;
    const next=teams.filter(t=>t.id!==id);
    changeTeams(()=>next);if(activeTeamId===id)setActiveTeamId(next[0].id);
    setMsg("Team entfernt.");
  };
  const autoFill=(id:string)=>{
    const team=teams.find(t=>t.id===id);if(!team)return;
    const target=team.goal??targetScore;
    if(onlyMyCards&&team.selection.some(id=>id&&!isInSelectedCollection(id,cardStore,true,verifiedOwnedReady))){
      setMsg("Dieses Team enthält noch einen Spieler, der nicht in deiner synchronisierten Sammlung ist. Bitte manuell entfernen oder tauschen; deine Aufstellung wird nicht automatisch überschrieben.");return;
    }
    const allowed=cards.filter(c=>isInSelectedCollection(c.player.id,cardStore,onlyMyCards,verifiedOwnedReady)&&eligibleByHorizon(c.player)).filter(c=>pool==="favorites"?favoriteSet.has(c.player.id):pool==="healthy"?
      c.player.forecastSources.length>0&&c.player.hasGame!==false&&c.player.playProb>=.65&&!isConfirmedOut(availabilityById[c.player.id]):true).filter(c=>!isConfirmedOut(availabilityById[c.player.id]));
    const filled=smartFillEmptySlots(team.selection,teamCards(team),sport,{
      strategy:strategy==="target"&&!target?"balanced":strategy,targetScore:target,
      allowedIds:allowed.map(c=>c.player.id),excludedIds:[...new Set([...Object.keys(cardStore).filter(k=>cardStore[k]?.excluded),...excludedByInjury])],
    });
    if(filled.reason){setMsg(filled.reason);return;}
    const check=evaluateManualLineup(filled.selection,teamCards(team),sport,target);
    if(!check.valid){setMsg("Regelprüfung fehlgeschlagen. Die bisherige Aufstellung bleibt erhalten.");return;}
    changeTeam(id,t=>({...t,selection:filled.selection,locks:t.locks.filter(lock=>filled.selection.includes(lock)),
      captainId:sport==="football"?(t.captainId&&filled.selection.includes(t.captainId)?t.captainId:smartCaptain(check,availabilityById,t.captainMode??"projection")):null}));
    setActiveTeamId(id);setActiveSlot(null);setSwapTarget(null);setPreviewSwapId(null);
    setMsg(`Smart Auto-Fill: ${filled.added} freie Slots ergänzt. Alle vorhandenen Spieler bleiben erhalten. ${fmt(check.projectedScore)} Punkte Prognose.`);
  };
  const toggleLock=(teamId:string,id:string)=>{
    changeTeam(teamId,t=>({...t,locks:t.locks.includes(id)?t.locks.filter(v=>v!==id):[...t.locks,id]}));
    setMsg("Spieler-Fixierung für dieses Team aktualisiert.");
  };
  const beginDrag=(event:DragEvent<HTMLElement>,payload:{kind:"pool"|"slot";playerId:string;teamId?:string;slot?:number})=>{
    dragRef.current=payload;event.dataTransfer.effectAllowed="move";
    event.dataTransfer.setData("application/x-markerras-player",JSON.stringify(payload));
    event.dataTransfer.setData("text/plain",payload.playerId);
  };
  const dropOnSlot=(event:DragEvent<HTMLElement>,teamId:string,index:number)=>{
    event.preventDefault();setDragTarget(null);
    let payload=dragRef.current;
    if(!payload){try{payload=JSON.parse(event.dataTransfer.getData("application/x-markerras-player"));}catch{}}
    dragRef.current=null;
    if(!payload||typeof payload.playerId!=="string")return;
    if(!isInSelectedCollection(payload.playerId,cardStore,onlyMyCards,verifiedOwnedReady)){
      setMsg("Nur meine Karten ist aktiv. Verschiebe oder füge bitte nur synchronisierte eigene Karten hinzu.");return;
    }
    if(payload.kind==="pool"){select(payload.playerId,index,teamId);return;}
    const from=teams.find(t=>t.id===payload.teamId),to=teams.find(t=>t.id===teamId);
    if(!from||!to||typeof payload.slot!=="number")return;
    const changed=moveBetweenSelections({source:from.selection,target:to.selection,sourceSlot:payload.slot,targetSlot:index,
      sameTeam:from.id===to.id,sport,cards,sourceLocks:from.locks,targetLocks:to.locks});
    if(changed.reason){setMsg(changed.reason);return;}
    if(from.id===to.id)changeTeam(from.id,t=>({...t,selection:changed.source}));
    else changeTeams(old=>old.map(t=>t.id===from.id?{...t,selection:changed.source}:t.id===to.id?{...t,selection:changed.target}:t));
    setActiveTeamId(teamId);setActiveSlot(null);setSwapTarget(null);setMsg("Spieler per Drag & Drop verschoben. Beide Teams wurden auf gültige Positionen und Sterne geprüft.");
  };
  // Tap-to-place alternative to native HTML Drag & Drop (touch, keyboard and screen readers).
  const tapTransfer=(teamId:string,targetSlot:number)=>{
    if(!tapSource)return;
    const from=teams.find(t=>t.id===tapSource.teamId),to=teams.find(t=>t.id===teamId);
    if(!from||!to)return;
    const sourceId=from.selection[tapSource.slot];
    if(sourceId&&!isInSelectedCollection(sourceId,cardStore,onlyMyCards,verifiedOwnedReady)){
      setMsg("Nur meine Karten ist aktiv: Der ausgewählte Spieler gehört nicht zum synchronisierten Besitz.");return;
    }
    const result=transferWorkspacePlayer({source:from.selection,target:to.selection,sourceSlot:tapSource.slot,targetSlot,
      sameTeam:from.id===to.id,mode:tapMode,sport,cards,sourceLocks:from.locks,targetLocks:to.locks});
    if(result.reason){setMsg(result.reason);return;}
    if(from.id===to.id)changeTeam(from.id,t=>({...t,selection:result.source}));
    else changeTeams(old=>old.map(t=>t.id===from.id?{...t,selection:result.source}:t.id===to.id?{...t,selection:result.target}:t));
    setActiveTeamId(to.id);setTapSource(null);setActiveSlot(null);
    setMsg(tapMode==="copy"?"Spieler in das zweite Team kopiert – beide Aufstellungen bleiben unabhängig.":"Spieler verschoben. Positionen und NBA-Sterne wurden geprüft.");
  };
  const copyTeam=async(id:string)=>{
    const team=teams.find(t=>t.id===id);if(!team)return;
    const text=[`Markerras Sorare Helper · ${sport==="nba"?"NBA":"Fußball"} · ${id}`,
      ...team.selection.map((playerId,i)=>`${slotNames[slots[i]]}: ${byId.get(playerId??"")?.name??"—"}`),
      ...(sport==="football"?[`Captain (50 %): ${byId.get(assessment.find(a=>a.team.id===id)?.captain??"")?.name??"—"}`]:[]),
      `Ziel: ${team.goal??targetScore??"—"}`,"Modellprognose; keine offizielle Sorare-Einreichung"].join("\n");
    try{await navigator.clipboard.writeText(text);setMsg("Team in die Zwischenablage kopiert.");}
    catch{setMsg("Kopieren wurde vom Browser verhindert.");}
  };
  const sortedPlayers=useMemo(()=>{
    const term=filterKey(query.trim());
    const filtered=players.filter(p=>{
      if(term&&!filterKey(`${p.name} ${p.team} ${p.position} ${p.opponent??""}`).includes(term))return false;
      if(position!=="all"&&p.position!==position)return false;
      if(!isInSelectedCollection(p.id,cardStore,onlyMyCards,verifiedOwnedReady))return false;
      if(pool==="favorites"&&!favoriteSet.has(p.id))return false;
      if(pool==="healthy"&&(!p.forecastSources.length||p.hasGame===false||p.playProb<.65||isConfirmedOut(availabilityById[p.id])))return false;
      const availabilityStatus=availabilityById[p.id]?.status;
      if(availabilityFilter==="alerts"&&!(["out","doubtful","questionable"] as (typeof availabilityStatus)[]).includes(availabilityStatus))return false;
      if(availabilityFilter==="out"&&availabilityStatus!=="out")return false;
      if(availabilityFilter==="unknown"&&availabilityStatus!==undefined)return false;
      if((matchdayReady||(sport==="nba"&&valueFilter!=="all"))&&isConfirmedOut(availabilityById[p.id]))return false;
      if(!eligibleByHorizon(p))return false;
      if(activeSlot!==null&&!slotAccepts(slots[activeSlot],p.position))return false;
      if(sport==="nba"&&multiOnly&&gamesFor(p.team).length<2)return false;
      return true;
    });
    const eligible=sport==="nba"&&valueFilter!=="all"
      ?topNbaValuePlayers(filtered,Object.fromEntries(filtered.map(p=>[p.id,cardStore[p.id]?.stars??null])),valueFilter)
      :filtered;
    return eligible.sort((a,b)=>{
      if(sort==="name")return (sortDescending?1:-1)*a.name.localeCompare(b.name,"de");
      const weight=(p:Forecast):number|null=>{
        if(sort==="kickoff")return gameDate(p)?.getTime()??null;
        if(sort==="play")return p.playProb*100;
        if(sort==="matchup"){
          const rating=assessMatchup(p.opponent,matchupRatings,sport).rating;
          return rating===null?null:6-rating;
        }
        if(sort==="games")return gamesFor(p.team).length;
        if(sort==="stars")return isValidNbaStars(cardStore[p.id]?.stars)?cardStore[p.id]!.stars!:null;
        if(sort==="value")return nbaValueScore(p,cardStore[p.id]?.stars,"projection");
        if(sort==="valueFloor")return nbaValueScore(p,cardStore[p.id]?.stars,"floor");
        if(sort==="valueCeiling")return nbaValueScore(p,cardStore[p.id]?.stars,"ceiling");
        if(sort==="l5")return p.last5Avg;
        if(sort==="l10")return p.last10Avg;
        if(!p.forecastSources.length)return null;
        if(sort==="floor")return expectedFloor(p);
        if(sort==="ceiling")return expectedCeiling(p);
        if(sort==="upside")return expectedUpside(p);
        return p.weighted;
      };
      // Kickoff defaults to earliest first. Missing values always appear last.
      const descending=sort==="kickoff"?!sortDescending:sortDescending;
      return comparePoolValues(weight(a),weight(b),descending)||a.name.localeCompare(b.name,"de");
    });
  },[players,query,position,pool,cardStore,onlyMyCards,verifiedOwnedReady,favoriteSet,horizon,now,activeSlot,slots,sort,sortDescending,multiOnly,gameCoverage,nbaSchedule,matchupRatings,sport,availabilityFilter,availabilityById,matchdayReady,valueFilter]);
  const quickSwaps=useMemo(()=>{
    if(!swapTarget)return [];
    const team=teams.find(t=>t.id===swapTarget.teamId);if(!team)return [];
    return quickSwapsForSlot(team.selection,swapTarget.slot,cards,sport,[...new Set([
      ...Object.keys(cardStore).filter(id=>cardStore[id]?.excluded),...excludedByInjury,
      ...(onlyMyCards?cards.filter(c=>!isInSelectedCollection(c.player.id,cardStore,true,verifiedOwnedReady)).map(c=>c.player.id):[]),
      ...(horizon!==null?cards.filter(c=>!eligibleByHorizon(c.player)).map(c=>c.player.id):[]),
    ])],5);
  },[swapTarget,teams,cards,sport,cardStore,excludedByInjury,onlyMyCards,verifiedOwnedReady,horizon,now,nbaSchedule]);
  const previewResult=useMemo(()=>{
    if(!swapTarget||!previewSwapId)return null;
    const team=teams.find(t=>t.id===swapTarget.teamId),entry=assessment.find(a=>a.team.id===swapTarget.teamId);
    if(!team||!entry)return null;
    const changed=team.selection.slice();changed[swapTarget.slot]=previewSwapId;
    const raw=evaluateManualLineup(changed,teamCards(team),sport,team.goal??targetScore);
    if(raw.errors.length)return null;
    const captain=sport==="football"?captainForTeam(raw,team.captainId,availabilityById,team.captainMode??"projection"):null;
    return swapPreview({result:entry.base,sport,captainId:entry.captain,replacement:raw,replacementCaptain:captain,target:team.goal??targetScore});
  },[swapTarget,previewSwapId,teams,assessment,cards,sport,targetScore,availabilityById]);
  const intelPlayer=byId.get(intelId??"")??null;
  const [showCount,setShowCount]=useState(80);
  useEffect(()=>setShowCount(80),[sport,query,position,pool,horizon,sort,sortDescending,activeSlot,gameWindow,multiOnly,availabilityFilter,valueFilter,matchdayReady]);
  const toggleMatchdayReady=()=>{
    if(!matchdayReady&&!verifiedOwnedReady){
      setMsg("Matchday Ready benötigt die erfolgreich synchronisierte Sorare-Sammlung. Bitte zuerst unter ‚Meine Karten‘ synchronisieren.");return;
    }
    if(!matchdayReady){
      setHorizon("today");setPool("all");setAvailabilityFilter("all");setPosition("all");setMultiOnly(false);setActiveSlot(null);setQuery("");
      setMsg("Matchday Ready aktiv: Heute spielen · nur verifizierte eigene Karten · bestätigte OUT-Spieler ausblenden. Bestehende Teams bleiben unverändert.");
    }else setMsg("Matchday Ready deaktiviert. Die aktiven Filter bleiben zur weiteren Bearbeitung erhalten.");
    setMatchdayReady(v=>!v);
  };
  const existingOutOfWindow=horizon===null?0:(activeTeam?.selection??[]).filter(id=>{
    const candidate=byId.get(id??"");
    return candidate&&!eligibleByHorizon(candidate);
  }).length;
  return <div className="workspace-v23" aria-label="V2.9 Neon Lineup Builder Pro">
    <header className="v23-toolbar v292-toolbar">
      <div className="v23-toolbar-brand"><span className="v23-mark">M<span>★</span></span><span><strong>NEON LINEUP BUILDER PRO</strong><small>{sport==="nba"?"NBA · STERNE / VALUE SCOUT":"FOOTBALL · CAPTAIN +50 %"} · V2.9.2</small></span></div>
      <div className="v292-primary-controls">
        <label>Spieltag<select aria-label="Zeithorizont – Spiele am aktuellen Tag filtern" value={horizon===null?"all":horizon} onChange={e=>{const value=e.target.value;setMatchdayReady(false);setHorizon(value==="all"?null:value==="today"||value==="tomorrow"?value:Number(value) as MatchdayHorizon);}}>
          <option value="today">◉ Heute spielen (Berlin)</option><option value="tomorrow">Morgen spielen (Berlin)</option><option value="all">Alle bekannten Spiele</option><option value="24">≈ Nächste 24 Std.*</option><option value="72">Nächste 3 Tage*</option><option value="168">Nächste 7 Tage*</option>
        </select></label>
        <button type="button" className={`v292-ready-btn ${matchdayReady?"active":""}`} aria-pressed={matchdayReady} onClick={toggleMatchdayReady} title="Heute spielen + nur verifizierte eigene Sorare-Karten + keine bestätigten OUT-Spieler">{matchdayReady?"✓ Matchday Ready aktiv":"⚡ Matchday Ready"}</button>
        <div className="v23-toolbar-actions"><button type="button" onClick={()=>autoFill(activeTeamId)} title="Nur freie Slots des aktiven Teams füllen">✦ Smart Auto-Fill</button></div>
      </div>
      <details className="v292-toolbar-more"><summary>Weitere Optionen <span>⌄</span></summary>
        <div className="v292-toolbar-extra">
          {sport==="nba"&&<label>Mehrfachspiele<select aria-label="NBA-Spielzeitraum für Mehrfachspiele" value={gameWindow} onChange={e=>setGameWindow(Number(e.target.value) as GameWindow)}><option value="3">3 Tage</option><option value="7">7 Tage</option><option value="14">14 Tage</option></select></label>}
          <label>Zusatzfilter<select value={pool} onChange={e=>setPool(e.target.value as typeof pool)}><option value="all">Kein Zusatzfilter</option><option value="favorites">Watchlist</option><option value="healthy">Gute Datenlage</option></select></label>
          <label>Optimierung<select value={strategy} onChange={e=>setStrategy(e.target.value as Strategy)}><option value="balanced">Ausgewogen</option><option value="safe">Sicher</option><option value="upside">Offensiv</option><option value="target" disabled={targetScore===null&&!teams.some(t=>t.goal!==null)}>Arcade-Ziel</option></select></label>
          <div className="v23-toolbar-actions v292-secondary-actions"><button type="button" className={compareOpen?"v25-active-action":""} onClick={()=>setCompareOpen(v=>!v)} title="Teams anhand ihrer Prognosen vergleichen">⇄ Team Battle</button><button type="button" onClick={()=>cloneTeam(activeTeamId)} title="Aktives Team kopieren">⧉ Team kopieren</button><button type="button" onClick={()=>{if(undoTeams){setTeams(undoTeams);setUndoTeams(null);setMsg("Letzte Teamänderung rückgängig gemacht.");}}} disabled={!undoTeams}>↶ Undo</button></div>
        </div>
      </details>
    </header>
    <div className="v23-subbar v292-subbar"><span className="v23-live-dot"/><strong>{teams.length} Teams</strong><span>{onlyMyCards?"✓ Meine Sorare-Karten":"Alle Spieler"}</span>{(horizon==="today"||horizon==="tomorrow")&&<span className="v291-day-chip">◷ {horizon==="today"?"Heute":"Morgen"} · {now?new Date(`${activeCalendarDay}T12:00:00Z`).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"UTC"}):"Datum wird geladen"} · MEZ/MESZ</span>}<span className="v23-target-label">Team <b>{activeTeamId.replace("team-", "#")}</b> · {activeSlotLabel}</span>{existingOutOfWindow>0&&<span className="v291-day-warning" title="Bestehende Teams werden nicht automatisch geändert.">⚠ {existingOutOfWindow} bestehende Spieler außerhalb des Zeitfensters</span>}{matchdayReady&&<span className="v292-active-state">⚡ Ready: Heute · Eigene Karten · Nicht OUT</span>}</div>
    <details className="v26-injury-toolbar v292-injury-details" aria-label="INJURY & AVAILABILITY">
      <summary>✚ Ausfallmeldungen <span className={availability.error?"v26-status-error":""} role="status" aria-live="polite">{availability.loading?"Prüfe …":availability.error||`${availability.data?.reports.length??0} Meldungen · ${availableAt} Uhr`}</span><span>Details ⌄</span></summary>
      <div className="v292-injury-content"><span>Quelle: {availability.data?.sources.join(" · ")||"Keine bestätigte Quelle"}</span>
      {availability.data?.providerUpdatedAt&&<span>Provider-Stand: {new Date(availability.data.providerUpdatedAt).toLocaleString("de-DE")}</span>}
      <span>Aktualisierung bei offener Seite: ca. {Math.round(availability.intervalMs/60000)} Min. · Provider können verzögert sein</span>
      <button type="button" disabled={availability.loading} onClick={availability.refresh}>↻ Jetzt prüfen</button></div>
    </details>
    {!!availability.changes.length&&<div className="v26-breaking" role="alert"><b>⚠ Neue kurzfristige Ausfallmeldung:</b> {availability.changes.join(" · ")}. Betroffene Teams prüfen und Quick Swap nutzen.</div>}
    {availability.data?.notes.length? <details className="v26-source-note"><summary>Quellenstatus / Fußball-API-Zugang</summary>{availability.data.notes.map((n,i)=><p key={i}>{n}</p>)}<p>Keine Ausfallmeldung bedeutet nicht, dass ein Spieler fit oder in der Startelf ist. Webseitenüberwachung läuft nur bei geöffnetem Tab.</p></details>:null}
    {msg&&<div className="v23-message" role="status">{msg}<button type="button" onClick={()=>setMsg("")} aria-label="Hinweis schließen">×</button></div>}
    <div className="v23-layout">
      <div className="v23-team-column" aria-label="Meine Teams">
        {compareOpen&&<section className="v25-battle" aria-label="Team Battle Vergleich">
          <div className="v25-battle-head"><strong>⇄ TEAM BATTLE</strong><button type="button" aria-label="Teamvergleich schließen" onClick={()=>setCompareOpen(false)}>×</button></div>
          <div className="v25-battle-controls"><span>Team {teams.findIndex(t=>t.id===activeTeamId)+1}</span><b>VS</b><select value={battleOpponent?.id??""} aria-label="Vergleichsteam auswählen" onChange={e=>setCompareId(e.target.value)}>{teams.filter(t=>t.id!==activeTeamId).map(t=><option key={t.id} value={t.id}>Team {teams.indexOf(t)+1}</option>)}</select></div>
          {battle?<><div className="v25-battle-statgrid">
            {[["Prognose",battle.left.projectedScore,battle.right.projectedScore],["Floor",battle.left.floorScore,battle.right.floorScore],["Ceiling",battle.left.ceilingScore,battle.right.ceilingScore],...(sport==="nba"?[["Sterne",battle.left.starsUsed,battle.right.starsUsed]]:[]),["Zielchance*",battle.left.targetProbability===null?NaN:battle.left.targetProbability*100,battle.right.targetProbability===null?NaN:battle.right.targetProbability*100],["Warnungen",battle.left.warnings.length+battle.left.errors.length,battle.right.warnings.length+battle.right.errors.length]] .map(([name,a,b])=><div key={String(name)}><small>{name}</small><strong className={Number(a)>Number(b)?"v25-battle-wins":""}>{fmt(Number(a))}</strong><span>:</span><strong className={Number(b)>Number(a)?"v25-battle-wins":""}>{fmt(Number(b))}</strong></div>)}
          </div><p>{battle.sharedPlayers} gemeinsame Spieler{battle.sharedNames.length?`: ${battle.sharedNames.join(", ")}`:""} · {battle.left.valid&&battle.right.valid?"Beide Teams regelkonform":"Mindestens ein Team unvollständig oder ungültig"}.</p>
          <small>*Zielchance in Prozent (nur bei vollständigen, gültigen Teams mit einem Punkteziel). Werte sind Modellschätzungen; weniger Warnungen ist besser. Kein garantiertes Spielergebnis.</small></>:<p>Füge ein weiteres Team hinzu, um Aufstellungen zu vergleichen.</p>}
        </section>}
        {tapSource&&<div className="v25-transfer-prompt" role="status"><strong>▣ {tapSource.playerName}</strong><small>Jetzt den Zielslot in einem Team antippen.</small><label>Aktion <select value={tapMode} onChange={e=>setTapMode(e.target.value as "copy"|"move")}><option value="copy">Kopieren</option><option value="move">Verschieben / tauschen</option></select></label><button type="button" onClick={()=>setTapSource(null)}>Abbrechen</button></div>}
        {assessment.map(({team,result,base,captain},teamIndex)=>{
          const active=team.id===activeTeamId;
          const d=active?doctor:null;
          const meter=goalMeter(result.projectedScore,team.goal??targetScore);
          const captainPlayer=byId.get(captain??"");
          const captainRisk=captain?availabilityById[captain]:undefined;
          const recommended=sport==="football"?smartCaptain(base,availabilityById,team.captainMode??"projection"):null;
          const missing=Math.max(0,5-team.selection.filter(Boolean).length);
          const multiCount=sport==="nba"?result.picks.filter(p=>gamesFor(p.player.team).length>=2).length:0;
          const teamAvailabilityAlerts=team.selection.filter((id):id is string=>!!id).map(id=>({id,report:availabilityById[id],player:byId.get(id)})).filter(({report})=>report&&(report.status==="out"||report.status==="doubtful"||report.status==="questionable"));
          const confirmedOuts=teamAvailabilityAlerts.filter(({report})=>report?.status==="out");
          const nonOwnedCount=onlyMyCards?team.selection.filter((id):id is string=>!!id).filter(id=>!isInSelectedCollection(id,cardStore,true,verifiedOwnedReady)).length:0;
          const riskCount=result.errors.length+result.warnings.length+(d?.issues.length??0)+Number(missing>0)+teamAvailabilityAlerts.length+(sport==="football"&&captainRisk?.status==="out"?1:0);
          return <section key={team.id} className={`v23-team v24-team ${active?"is-current":""}`} aria-label={`Team ${teamIndex+1}`}>
            <div className="v23-team-top">
              <button type="button" className="v23-collapse" onClick={()=>changeTeam(team.id,t=>({...t,collapsed:!t.collapsed}))} aria-label={`Team ${teamIndex+1} ${team.collapsed?"ausklappen":"einklappen"}`}>{team.collapsed?"▸":"⌄"}</button>
              <button type="button" className="v23-team-name" onClick={()=>{setActiveTeamId(team.id);setActiveSlot(null);}}>TEAM {teamIndex+1}</button>
              <span className={`v23-team-state ${confirmedOuts.length?"bad":result.valid?"good":result.errors.length?"bad":"idle"}`} title={result.errors.join(" · ")||"Noch nicht vollständig"}>{confirmedOuts.length?`⚠ ${confirmedOuts.length} OUT`:result.valid?"✓ Gültig":result.errors.length?"! Prüfen":`${result.picks.length}/5`}</span>
              <div className="v23-team-score"><span>{sport==="nba"?"STERNE":"PS"}<b className={sport==="nba"&&result.starsUsed>16?"danger":""}>{sport==="nba"?fmt(result.starsUsed):short(result.projectedScore)}</b></span><span>PROG.<b>{fmt(result.projectedScore)}</b></span><label>ZIEL<input type="number" min="1" max="10000" placeholder={targetScore===null?"—":String(targetScore)} value={team.goal??""} aria-label={`Zielscore Team ${teamIndex+1}`} onChange={e=>changeTeam(team.id,t=>({...t,goal:e.target.value?Math.max(1,Math.min(10000,Number(e.target.value))):null}))}/></label></div>
              <div className="v23-team-tools"><button type="button" onClick={()=>autoFill(team.id)} title="Nur freie Slots ergänzen – vorhandene Spieler bleiben stehen">✦</button><button type="button" onClick={()=>cloneTeam(team.id)} title="Team duplizieren">⧉</button><button type="button" onClick={()=>void copyTeam(team.id)} title="Team kopieren">▣</button><button type="button" onClick={()=>clearTeam(team.id)} title="Team leeren">⌫</button>{teams.length>1&&<button type="button" onClick={()=>removeTeam(team.id)} title="Team löschen">×</button>}</div>
            </div>
            {!team.collapsed&&<>
              <div className="v23-card-row v24-card-row">
                {slots.map((slot,index)=>{
                  const pick=result.slots[index];const player=pick?.player??byId.get(team.selection[index]??"");
                  const isSelected=active&&activeSlot===index;
                  const locked=!!player&&team.locks.includes(player.id);
                  const dragHere=dragTarget===`${team.id}:${index}`;
                  const games=player?gamesFor(player.team):[];
                  const matchup=player?assessMatchup(player.opponent,matchupRatings,sport):null;
                  const report=player?availabilityById[player.id]:undefined;
                  return <article key={`${slot}-${index}`} className={`v23-card v24-card ${player?"filled":"empty"} ${isSelected?"focused":""} ${locked?"v24-locked":""} ${dragHere?"v24-drop-target":""} ${tapSource?"v25-tap-ready":""} ${report?.status==="out"?"v26-card-out":report?.status==="questionable"?"v26-card-questionable":""}`}
                    draggable={!!player&&!locked} onDragStart={event=>player&&beginDrag(event,{kind:"slot",playerId:player.id,teamId:team.id,slot:index})}
                    onDragEnd={()=>{dragRef.current=null;setDragTarget(null);}}
                    onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect="move";setDragTarget(`${team.id}:${index}`);}}
                    onDragLeave={()=>setDragTarget(key=>key===`${team.id}:${index}`?null:key)}
                    onDrop={event=>dropOnSlot(event,team.id,index)}>
                    <div className="v23-card-top"><span>{sport==="nba"?`#${index+1}`:({GK:"TW",DEF:"VER",MID:"MF",FWD:"ST",FLEX:"EX"} as Record<string,string>)[slot]}</span>{sport==="football"&&player&&<button type="button" className={`v29-crown ${captain===player.id?"active":""}`} aria-pressed={captain===player.id} aria-label={`${player.name} als Kapitän auswählen, 50 Prozent Bonus`} title={captain===player.id?"Kapitän · +50 % (fest)":"Diesen Spieler zum Kapitän machen"} onClick={()=>changeTeam(team.id,t=>({...t,captainId:player.id}))}>👑</button>}<div><button type="button" aria-label={`Slot ${index+1} wählen`} onClick={()=>{if(tapSource){tapTransfer(team.id,index);}else{setActiveTeamId(team.id);setActiveSlot(index);setMsg("");}}} title={tapSource?"Ausgewählten Spieler hierhin übertragen":"Slot wählen"}> {tapSource?"◎":"✎"}</button>{player&&<><button type="button" className={tapSource?.teamId===team.id&&tapSource.slot===index?"v25-active-action":""} title="Spieler zum Kopieren oder Verschieben per Klick auswählen (auch auf Mobilgeräten)" aria-label={`${player.name} für Teamtransfer wählen`} onClick={()=>{setTapSource({teamId:team.id,slot:index,playerName:player.name});setActiveTeamId(team.id);}}>⤴</button><button type="button" className={locked?"v24-lock-active":""} title={locked?"Spieler entsperren":"Spieler in diesem Team fixieren"} aria-label={`${player.name} ${locked?"entsperren":"fixieren"}`} aria-pressed={locked} onClick={()=>toggleLock(team.id,player.id)}>{locked?"🔒":"♧"}</button><button type="button" title="Quick Swap: passende Alternativen zeigen" aria-label={`Quick Swap für ${player.name}`} onClick={()=>{setActiveTeamId(team.id);setActiveSlot(index);setSwapTarget(v=>v?.teamId===team.id&&v.slot===index?null:{teamId:team.id,slot:index});setPreviewSwapId(null);}}>⇄</button><button type="button" title={cardStore[player.id]?.excluded?"Spieler freigeben":"Spieler für den Auto-Builder sperren"} aria-label={`${player.name} für Auto-Builder ${cardStore[player.id]?.excluded?"freigeben":"sperren"}`} disabled={locked} onClick={()=>{updateCard(player.id,{excluded:!cardStore[player.id]?.excluded,locked:false});setMsg("Auto-Builder-Sperre aktualisiert. Der Spieler bleibt in diesem manuellen Team, bis du ihn entfernst.");}}>⊘</button><button type="button" aria-label={`${player.name} entfernen`} disabled={locked} onClick={()=>changeTeam(team.id,t=>({...t,selection:t.selection.map((id,i)=>i===index?null:id),locks:t.locks.filter(v=>v!==player.id)}))}>−</button></>}</div></div>
                    {player?<>
                      <button type="button" className="v23-portrait" onClick={()=>{setIntelId(player.id);setActiveTeamId(team.id);}} title={`${player.name} Profil öffnen`}><Avatar player={player}/></button>
                      <button type="button" className="v23-player-name" onClick={()=>{setIntelId(player.id);setActiveTeamId(team.id);}} title={player.name}>{player.name}</button>
                      <span className="v23-role">{positionNames[player.position]??player.position}</span>
                      <AvailabilityBadge report={report}/>
                      {sport==="nba"&&<span className={`v25-game-label ${games.length>=2?"v25-multi":games.length?"v25-single":"v25-unknown"}`} title={`Bestätigte Spiele im ${gameWindow}-Tage-Fenster, keine offizielle Sorare-Gameweek`}>{games.length?multiGameLabel(games.length):"Kein Spielplan"}</span>}
                      <MatchupPill opponent={player.opponent} ratings={matchupRatings} sport={sport}/>
                      <div className="v23-mini-grid">
                        {sport==="nba"?<><MiniStat label="L5" value={player.last5Avg===null?"—":short(player.last5Avg)}/><MiniStat label="Ø" value={player.avg===null?"—":short(player.avg)}/><MiniStat label="★" tone="star" value={isValidNbaStars(cardStore[player.id]?.stars)?fmt(cardStore[player.id]!.stars!):"—"}/></>
                          :<><MiniStat label="Einsatz*" value={`${short(player.playProb*100)}%`} tone={player.playProb<.65?"warn":"good"}/><MiniStat label="L5" value={player.last5Avg===null?"—":short(player.last5Avg)}/><MiniStat label="Bonus" tone="star" value={`+${base.slots[index]?.bonusPercent??0}%`}/></>}
                      </div>
                      <div className="v23-mini-grid second"><MiniStat label="Prognose" value={pick?fmt(pick.projectedScore):"—"}/><MiniStat label="Floor" value={pick?fmt(pick.floorScore):"—"}/><MiniStat label="Ceiling" value={pick?fmt(pick.ceilingScore):"—"}/></div>
                      {sport==="nba"&&<span className="v293-sorare-bonus">Kartenbonus +{fmt(base.slots[index]?.bonusPercent??0)} % {cardsForPlayer(verifiedCollection?.cards,sport,player.id).length?"· Sorare/Meine Karte":"· Fallback"}</span>}
                      <Bars player={player} compact/>
                      {sport==="football"&&captain===player.id&&<span className="v29-captain-glow">👑 CAPTAIN · +50 % · +{fmt(captainExtra(base,captain))} PS</span>}
                      {verifiedOwnedReady&&cardsForPlayer(verifiedCollection?.cards,sport,player.id).length>0&&<label className="v29-asset-select">Meine Karte<select aria-label={`Sorare-Karte von ${player.name} wählen`} value={chooseCardAsset(cardsForPlayer(verifiedCollection?.cards,sport,player.id),team.assetIds?.[player.id])?.assetId??""} onChange={e=>changeTeam(team.id,t=>({...t,assetIds:{...t.assetIds,[player.id]:e.target.value}}))}>
                        {cardsForPlayer(verifiedCollection?.cards,sport,player.id).map(asset=><option key={asset.assetId} value={asset.assetId}>{asset.rarity} · {asset.seasonYear??"?"} · #{asset.serialNumber??"?"}</option>)}
                      </select>{(()=>{
                        const asset=chooseCardAsset(cardsForPlayer(verifiedCollection?.cards,sport,player.id),team.assetIds?.[player.id]);
                        const fallback=asset&&cardStore[player.id]?.bonusSource==="sorare"?0:cardStore[player.id]?.bonusPercent??0;
                        const bonus=selectedCardBonus(asset,asset?team.assetBonuses?.[asset.assetId]:undefined,fallback);
                        return bonus.source==="sorare"?<span className="v293-sorare-bonus" title={(asset?.bonusDetails??[]).map(b=>`${b.title}: +${b.bonusBasisPoints/100}%`).join(" · ")||"Sorare meldet für diese Karte keinen zusätzlichen Bonus."}>✓ Sorare +{fmt(bonus.percent)} % · Level {asset?.grade??"—"}</span>
                          :<span className="v29-card-bonus-edit">Bonus (Fallback manuell) <input type="number" min="0" max="50" step="1" aria-label={`Manuellen Bonus der gewählten Karte von ${player.name} anpassen`} value={asset?team.assetBonuses?.[asset.assetId]??fallback:fallback} onChange={e=>{
                            if(asset)changeTeam(team.id,t=>({...t,assetBonuses:{...t.assetBonuses,[asset.assetId]:Math.max(0,Math.min(50,Number(e.target.value)||0))}}));
                            else updateCard(player.id,{bonusPercent:Math.max(0,Math.min(50,Number(e.target.value)||0))});
                          }}/>%</span>;
                      })()}</label>}
                      {sport==="nba"&&games.length>1&&<details className="v25-card-games"><summary>▣ Alle {games.length} Spiele zeigen</summary>{games.map(g=><small key={g.fixtureId}>{g.date.split("-").reverse().join(".")} · {g.home?"Heim":"Auswärts"} vs {g.opponent}{g.tipoff?` · ${fixtureTime({...player,nextGameTipoff:g.tipoff})} Uhr`:""}</small>)}</details>}
                      <div className="v23-card-match"><strong>{player.opponent?`vs ${player.opponent}`:player.team}</strong><small>{gameDate(player)?gameDate(player)!.toLocaleDateString("de-DE",{timeZone:"Europe/Berlin"}):"Termin unbekannt"}{fixtureTime(player)?` · ${fixtureTime(player)} Uhr`:""}{player.hasGame===false?" · kein Spiel gemeldet":""}</small></div>
                    </>:<button type="button" className="v23-card-empty-content" onClick={()=>{if(tapSource)tapTransfer(team.id,index);else{setActiveTeamId(team.id);setActiveSlot(index);setMsg("");}}}><span className="v23-plus-ring">+</span><strong>{team.selection[index]?"Spieler nicht geladen":sport==="nba"?"Karte wählen":slotNames[slot]}</strong><small>{team.selection[index]?"Team oder Liga prüfen":"Spieler rechts auswählen"}</small></button>}
                  </article>;
                })}
              </div>
              {sport==="football"&&<div className="v29-captain-toolbar">
                <div><strong>👑 CAPTAIN +50 %</strong><span>{captainPlayer?.name??"Noch kein Spieler"} · <b>+{fmt(captainExtra(base,captain))} PS</b> · {team.captainId===captain?"Manuell":"Smart-Vorschlag"}</span></div>
                <label>Smart Captain<select aria-label={`Captain-Strategie für Team ${teamIndex+1}`} value={team.captainMode??"projection"} onChange={e=>changeTeam(team.id,t=>({...t,captainMode:e.target.value as CaptainMode}))}><option value="projection">Höchster Erwartungswert</option><option value="safety">Sicher (Floor & Risiko)</option></select></label>
                <button type="button" disabled={!recommended} onClick={()=>changeTeam(team.id,t=>({...t,captainId:recommended}))}>👑 Smart Captain übernehmen</button>
                {captainRisk&&["out","doubtful","questionable"].includes(captainRisk.status)&&<strong className="v29-captain-alert">⚠ Captain {availabilityLabels[captainRisk.status]} · Ersatz prüfen</strong>}
              </div>}
              {meter&&<div className="v24-goal-meter" aria-label={`Arcade-Ziel: ${Math.round(meter.percentage)} Prozent des Punkteziels prognostiziert`}>
                <div className="v24-goal-line"><span>◎ Arcade Goal Meter <b>{fmt(result.projectedScore)} / {fmt(team.goal??targetScore??0)} PS</b></span><strong className={meter.difference>=0?"v24-positive":"v24-pending"}>{meter.difference>=0?`+${fmt(meter.difference)}`:`−${fmt(meter.remaining)}`} PS</strong></div>
                <div className="v24-goal-track"><span style={{width:`${meter.percentage}%`}}/></div>
                <small>{result.valid&&result.targetProbability!==null?`Geschätzte Zielchance ${short(result.targetProbability*100)} % · nicht kalibriert`:"Zielchance erst mit einem gültigen Team und belastbaren Sorare-Daten"}</small>
              </div>}
              <footer className="v23-team-footer"><span><b>{result.picks.length}/5</b> Spieler</span><span>Floor <b>{fmt(result.floorScore)}</b></span>{sport==="nba"&&<span className={multiCount?"v25-multi-text":""}>{multiCount} Mehrfachspieler / {gameWindow} T.</span>}<span>Ceiling <b>{fmt(result.ceilingScore)}</b></span>{sport==="nba"&&<span>Budget <b className={result.starsUsed>16?"v23-danger":""}>{fmt(result.starsUsed)}/16 ★</b></span>}<span>Zielchance* <b>{result.targetProbability===null?"—":`${short(result.targetProbability*100)} %`}</b></span></footer>
              {active&&sport==="nba"&&<div className="v25-multi-note">▣ <strong>{multiCount} Spieler mit 2+ Spielen</strong> im {gameWindow}-Tage-Fenster. Nur der beste Einzelspiel-Score zählt in entsprechenden NBA-Gameweek-Wettbewerben; kein automatischer Bonus für Arcade. Die Anzeige ersetzt keine Prüfung der offiziellen Gameweek-Berechtigung.</div>}
              {active&&<details className={`v24-risk-radar ${result.errors.length||confirmedOuts.length?"v24-risk-critical":riskCount?"v24-risk-warning":"v24-risk-clear"}`} open={result.errors.length>0||confirmedOuts.length>0}>
                <summary><span>◈ LINEUP RISK RADAR</span><b>{result.errors.length?`${result.errors.length} Regelprobleme`:missing?`${missing} freie Slots · ${riskCount} Hinweise`:riskCount?`${riskCount} Hinweise`:"Keine Warnungen"}</b></summary>
                <div className="v24-risk-content">
                  {sport==="football"&&captainRisk?.status==="out"&&<p className="v24-risk-error">👑 Kapitän fällt aus. Wähle einen neuen Captain oder nutze Quick Swap.</p>}
                  {teamAvailabilityAlerts.map(({id,report,player})=><p key={`injury-${id}`} className={report?.status==="out"?"v24-risk-error":"v26-risk-alert"}><b>{report?.status==="out"?"✕":"!"} {player?.name??"Spieler"}: {report?availabilityLabels[report.status]:""}</b> · {report?.reason} ({report?.source}). {report?.status==="out"?"Quick Swap wählen; automatische Neubefüllung überspringt OUT.":"Vor Spielbeginn erneut prüfen."}</p>)}
                  {missing>0&&<p>{missing} freie Slots: Das Team ist noch nicht vollständig. Die Zielchance kann erst danach berechnet werden.</p>}
                  {result.errors.map((item,i)=><p key={`error-${i}`} className="v24-risk-error">✕ {item}</p>)}
                  {result.warnings.slice(0,5).map((item,i)=><p key={`warn-${i}`}>! {item}</p>)}
                  {d?.issues.slice(0,5).map(issue=><p key={issue.id}><b>{issue.title}:</b> {issue.description}</p>)}
                  {!riskCount&&<p>Keine Probleme aus den verfügbaren Daten festgestellt. Prüfe vor dem Sorare-Lock trotzdem Kartenberechtigung und Gameweek-Sternpreis.</p>}
                </div>
              </details>}
              {active&&swapTarget?.teamId===team.id&&team.selection[swapTarget.slot]&&<div className="v24-quick-swap">
                <div className="v24-swap-header"><b>⇄ QUICK SWAP · Slot {swapTarget.slot+1}</b><button type="button" onClick={()=>{setSwapTarget(null);setPreviewSwapId(null);}} aria-label="Quick Swap schließen">×</button></div>
                {team.locks.includes(team.selection[swapTarget.slot]!)?<p>Spieler ist fixiert. Bitte zuerst entsperren.</p>:quickSwaps.length?quickSwaps.map(candidate=><button key={candidate.id} type="button" className="v24-swap-pick" onClick={()=>setPreviewSwapId(candidate.id)}>
                  <span><b>{candidate.name}</b><small>{candidate.team} {candidate.stars!==null?` · ${fmt(candidate.stars)} ★`:""}</small></span><strong className={candidate.delta>=0?"v24-positive":"v24-pending"}>{candidate.delta>=0?"+":""}{fmt(candidate.delta)} PS{sport==="football"?"*":""}</strong><span>{previewSwapId===candidate.id?"✓ Vorschau aktiv":"Vorschau ↗"}</span>
                </button>):<p>Keine zulässigen Alternativen mit den aktuell geladenen Daten gefunden.</p>}
                {previewSwapId&&previewResult&&<div className="v29-swap-preview" role="status"><strong>Vorschau vor dem Wechsel · {byId.get(previewSwapId)?.name}</strong>
                  <div><span>Prognose <b>{previewResult.delta>=0?"+":""}{fmt(previewResult.delta)} PS</b></span><span>Floor <b>{previewResult.floorDelta>=0?"+":""}{fmt(previewResult.floorDelta)}</b></span><span>Ceiling <b>{previewResult.ceilingDelta>=0?"+":""}{fmt(previewResult.ceilingDelta)}</b></span>{sport==="nba"&&<span>Sterne <b>{previewResult.starDelta>=0?"+":""}{fmt(previewResult.starDelta)}</b></span>}</div>
                  {previewResult.captainChanged&&<small>👑 Der Captain wird neu empfohlen; die +50 % sind in der Vorschau enthalten.</small>}
                  <small>Modellschätzung, keine Garantie. {sport==="football"?"*Die Kandidatenliste zeigt Werte vor dem 50-%-Captain; diese Vorschau berücksichtigt ihn.":""} Es wird erst nach Bestätigung getauscht.</small>
                  <button type="button" disabled={!previewResult.valid||isConfirmedOut(availabilityById[previewSwapId])} onClick={()=>{select(previewSwapId,swapTarget.slot,team.id);setSwapTarget(null);setPreviewSwapId(null);}}>✓ Wechsel übernehmen</button></div>}
                
              </div>}
              {active&&<details className="v29-explain"><summary>✦ Explain My Lineup · So entsteht diese Prognose</summary><p>Die fünf Spieler ergeben vor Captain <b>{fmt(base.projectedScore)} PS</b>. {sport==="football"?`Der fest gewählte 50-%-Captain ${captainPlayer?.name??"—"} addiert ${fmt(captainExtra(base,captain))} PS.`:"NBA hat keinen Kapitän und keinen Captain-Bonus."} Ergebnis: <b>{fmt(result.projectedScore)} PS</b>.</p>
                {result.picks.map(p=><p key={p.player.id}><b>{p.player.name}</b>: {fmt(p.projectedScore)} PS · {p.player.forecastSources.length?`Prognose aus ${p.player.forecastSources.length} Datenquelle(n)`:"Unsichere Datenlage"} · {p.player.opponent??"Gegner nicht bekannt"} · {availabilityById[p.player.id]?availabilityLabels[availabilityById[p.player.id].status]:"Ausfallstatus unbekannt"}.</p>)}
                <small>Die Erklärung basiert nur auf tatsächlich vorhandenen Prognosedaten, nicht auf einer generierten Erfolgsbehauptung.</small></details>}
              {active&&<div className="v29-final-check"><button type="button" onClick={()=>setShowFinalCheck(v=>v===team.id?null:team.id)}>✓ Final Lineup Check {showFinalCheck===team.id?"▴":"▾"}</button>{showFinalCheck===team.id&&<div role="status">
                <p>{result.picks.length===5?"✓ Fünf Plätze belegt":"✕ Noch freie Plätze"}</p><p>{result.errors.length===0?"✓ Positions-/Sterneregeln geprüft":`✕ ${result.errors.join(" · ")}`}</p>
                {sport==="football"&&<p>{captain?`✓ Captain ${captainPlayer?.name??""} mit +50 %` :"✕ Kapitän fehlt"}</p>}
                <p>{confirmedOuts.length===0?"✓ Kein bestätigter OUT-Fall in den geladenen Meldungen":`✕ ${confirmedOuts.length} bestätigte Ausfälle`}</p>
                <p>{verifiedOwnedReady?`✓ Sorare-Sammlung synchronisiert${nonOwnedCount?` · ${nonOwnedCount} Spieler nicht im Bestand`:""}`:"! Sammlungsstand nicht verifiziert"}</p>
                <p>{availability.data?.fetchedAt?`Ausfallmeldungen geprüft: ${new Date(availability.data.fetchedAt).toLocaleString("de-DE")}`:"! Aktuelle Verletzungsdaten fehlen"}</p>
                <small>Dies ist keine Bestätigung der konkreten Sorare-Wettbewerbsberechtigung oder einer offiziellen Einreichung.</small></div>}</div>}
              {active&&result.errors.length>0&&<p className="v23-team-alert">{result.errors.slice(0,2).join(" · ")}</p>}
              {active&&d&&d.issues.length>0&&<details className="v23-doctor"><summary>✦ Lineup Doctor · {d.issues.length} Hinweise</summary><div>{d.issues.slice(0,4).map(item=><p key={item.id}><b>{item.title}</b> – {item.description}</p>)}</div></details>}
              {nonOwnedCount>0&&<p className="v283-team-owned-warning">⚠ {nonOwnedCount} vorhandene Karte(n) in diesem Team gehören nicht zum bestätigten Bestand. Die Aufstellung bleibt bis zu deiner Änderung erhalten.</p>}
            {active&&d&&d.swaps.length>0&&<details className="v23-doctor v23-doctor-swaps"><summary>✦ Lineup Doctor · {d.swaps.length} geprüfte Wechselideen</summary><div>{d.swaps.map(swap=><div className="v23-swap" key={`${swap.slotIndex}-${swap.toId}`}><span><b>{swap.fromName}</b> → <b>{swap.toName}</b><small>{swap.kind==="safer"?"Weniger Modellrisiko":swap.kind==="repair"?"Regelreparatur":"Höhere Prognose"} · {swap.delta>=0?"+":""}{fmt(swap.delta)} Punkte</small></span><button type="button" disabled={team.locks.includes(swap.fromId)||isConfirmedOut(availabilityById[swap.toId])||!isInSelectedCollection(swap.toId,cardStore,onlyMyCards,verifiedOwnedReady)} onClick={()=>{setActiveTeamId(team.id);setSwapTarget({teamId:team.id,slot:swap.slotIndex});setPreviewSwapId(swap.toId);}}>Wechsel ansehen</button></div>)}</div></details>}
            </>}
          </section>;
        })}
        <button type="button" className="v23-add-team" onClick={()=>{
          if(teams.length>=6){setMsg("Maximal 6 Teams.");return;}
          const nextId=`team-${Math.max(...teams.map(t=>Number(t.id.split("-")[1])||0))+1}`;
          changeTeams(old=>[...old,{id:nextId,selection:[null,null,null,null,null],goal:null,collapsed:false,locks:[],captainId:null,assetIds:{},assetBonuses:{}}]);setActiveTeamId(nextId);
        }} disabled={teams.length>=6}>+ Neues Team hinzufügen <span>{teams.length} / 6</span></button>
        <div className="v23-team-note">Autospeicherung inklusive Fixierungen auf diesem Gerät · {verifiedOwnedReady?"Besitz aus Sorare synchronisiert":"Kartenbesitz ohne bestätigten Sync nicht verifiziert"}.</div>
      </div>
      <section className="v23-pool" aria-label="Spielerpool und Suche">
        <div className="v23-pool-head"><div><span className="v23-kicker">PLAYER DATABASE / SCOUTING</span><h3>Spielerpool <small>{sortedPlayers.length.toLocaleString("de-DE")} Treffer</small></h3></div><span className="v23-active-team-chip">◉ Team {teams.findIndex(t=>t.id===activeTeamId)+1} aktiv</span></div>
        <div className="v23-pool-filters v292-pool-filters">
          <input type="search" aria-label="Spieler oder Team suchen" placeholder="⌕ Spieler, Team oder Gegner suchen …" value={query} onChange={e=>setQuery(e.target.value)}/>
          <label className="v292-sort-label"><span>Sortieren</span><select aria-label="Spieler sortieren" value={sort} onChange={e=>setSort(e.target.value as PoolSort)}><option value="weighted">Prognose</option><option value="ceiling">Ceiling (inkl. Einsatz)</option><option value="floor">Floor (inkl. Einsatz)</option><option value="upside">Upside (Ceiling − Prognose)</option><option value="l5">L5-Form</option><option value="l10">L10-Form</option><option value="play">Einsatzchance / Risiko</option><option value="kickoff">Nächstes Spiel</option>{sport==="nba"&&<><option value="stars">Sterne</option><option value="value">Prognose / Stern</option><option value="valueFloor">Floor / Stern</option><option value="valueCeiling">Ceiling / Stern</option><option value="games">Mehrfachspiele</option></>}<option value="matchup">Günstiges Matchup</option><option value="name">Name A–Z</option></select></label>
          <button type="button" className="v291-sort-direction" onClick={()=>setSortDescending(v=>!v)} aria-label={sortDescending?"Sortierrichtung umkehren: aufsteigend":"Sortierrichtung umkehren: absteigend"} title="Sortierrichtung wechseln">{sort==="name"?(sortDescending?"A–Z":"Z–A"):sort==="kickoff"?(sortDescending?"Früh zuerst":"Spät zuerst"):(sortDescending?"↓ Absteigend":"↑ Aufsteigend")}</button>
          <details className="v292-pool-more"><summary>Mehr Filter ⌄</summary><div>
            <select aria-label="Position filtern" value={position} onChange={e=>setPosition(e.target.value)}><option value="all">Alle Positionen</option>{(sport==="nba"?["G","F","C"]:["GK","DEF","MID","FWD"]).map(pos=><option key={pos} value={pos}>{positionNames[pos]}</option>)}</select>
            <select aria-label="Verletzungsstatus filtern" value={availabilityFilter} onChange={e=>{setAvailabilityFilter(e.target.value as typeof availabilityFilter);if(e.target.value==="out")setMatchdayReady(false);}}><option value="all">Alle Verfügbarkeiten</option><option value="alerts">⚠ OUT / Fraglich</option><option value="out">Nur OUT</option><option value="unknown">Ohne Statusmeldung</option></select>
            {sport==="nba"&&<label className="v25-multi-filter"><input type="checkbox" checked={multiOnly} onChange={e=>setMultiOnly(e.target.checked)}/> Nur 2+ Spiele</label>}
            {activeSlot!==null&&<button type="button" className="v23-clear-slot" onClick={()=>setActiveSlot(null)}>Slotfilter ×</button>}
          </div></details>
        </div>
        {sport==="nba"&&<div className="v292-value-panel"><div><strong>◇ NBA VALUE FINDER</strong><small>Modellpunkte pro ★ · Vergleich innerhalb deines aktuellen Spielerpools</small></div>
          <select aria-label="NBA Value Filter auswählen" value={valueFilter} onChange={e=>{const mode=e.target.value as NbaValueMode;setValueFilter(mode);if(mode!=="all"){setSort(mode==="projection"?"value":mode==="floor"?"valueFloor":"valueCeiling");setSortDescending(true);}}}>
            <option value="all">Alle Spieler</option><option value="projection">Top 25 % · Prognose/★</option><option value="floor">Top 25 % · Floor/★</option><option value="ceiling">Top 25 % · Ceiling/★</option>
          </select>
          {valueFilter!=="all"&&<span className="v292-value-count">{sortedPlayers.length} Value-Kandidaten</span>}
        </div>}
        {matchdayReady&&<p className="v292-ready-description">⚡ Matchday Ready prüft den heutigen Spielplan (deutsche Zeit), deine <b>verifizierten Sorare-Karten</b> und bestätigte OUT-Meldungen. Unbekannter Status bedeutet nicht automatisch fit. Gespeicherte Teams bleiben erhalten.</p>}
        <div className="v29-table-toolbar"><strong>Tabellenansicht</strong><select value={tablePreset} aria-label="Tabellenansicht wählen" onChange={e=>{if(e.target.value!=="custom")setPreset(e.target.value as "all"|"compact"|"scouting");}}><option value="all">Alle Spalten</option><option value="compact">Kompakt</option><option value="scouting">Scouting</option><option value="custom">Eigene Ansicht</option></select><button type="button" onClick={()=>setShowColumnSettings(v=>!v)}>⚙ Spalten auswählen</button>
          {showColumnSettings&&<div className="v29-columns">{columnsForPreset("all",sport).map(k=><label key={k}><input type="checkbox" checked={showCol(k)} onChange={()=>toggleCol(k)}/>{columnsLabels[k]}</label>)}</div>}
        </div>
        {intelPlayer&&<section className="v29-intel-panel" aria-label="Player Intelligence Panel"><div className="v29-intel-head"><b>◈ PLAYER INTELLIGENCE</b><button type="button" onClick={()=>setIntelId(null)} aria-label="Spielerdetails schließen">×</button></div>
          <div className="v29-intel-person"><div className="v29-intel-avatar"><Avatar player={intelPlayer}/></div><div><h4>{intelPlayer.name}</h4><span>{intelPlayer.team} · {positionNames[intelPlayer.position]??intelPlayer.position}</span><p>{intelPlayer.opponent?`Nächster Gegner: ${intelPlayer.opponent}`:"Gegner unbekannt"}</p></div></div>
          <div className="v29-intel-stats"><MiniStat label="Prognose" value={fmt(intelPlayer.weighted)} tone="good"/><MiniStat label="L5" value={intelPlayer.last5Avg===null?"—":fmt(intelPlayer.last5Avg)}/><MiniStat label="L10" value={intelPlayer.last10Avg===null?"—":fmt(intelPlayer.last10Avg)}/><MiniStat label="Einsatz*" value={`${short(intelPlayer.playProb*100)} %`}/><MiniStat label="Floor" value={fmt(intelPlayer.floor*intelPlayer.playProb)}/><MiniStat label="Ceiling" value={fmt(intelPlayer.ceiling*intelPlayer.playProb)}/></div>
          <Bars player={intelPlayer}/><p><AvailabilityBadge report={availabilityById[intelPlayer.id]}/> <MatchupPill opponent={intelPlayer.opponent} ratings={matchupRatings} sport={sport}/></p>
          {sport==="football"&&<p>👑 Captain-Potenzial: <b>+{fmt(intelPlayer.weighted*.5)} PS</b> bei 50 % (ohne weitere Kartenboni). Konkrete Captain-Wahl im Team vornehmen.</p>}
          <p>Kartenbonus: <strong>+{fmt(cardStore[intelPlayer.id]?.bonusPercent??0)} %</strong> {cardStore[intelPlayer.id]?.bonusSource==="sorare"?"· von Sorare synchronisiert (beste verfügbare Karte)":"· manuelle Eingabe oder Fallback"} · {gameDate(intelPlayer)?`Nächstes Spiel am ${gameDate(intelPlayer)!.toLocaleDateString("de-DE",{timeZone:"Europe/Berlin"})}`:"Kein bestätigter Termin"}. Der tatsächliche Bonus kann vom ausgewählten Wettbewerb abhängen.</p>
          {verifiedOwnedReady&&<p>Eigene Sorare-Karten: <b>{cardsForPlayer(verifiedCollection?.cards,sport,intelPlayer.id).length}</b> {cardsForPlayer(verifiedCollection?.cards,sport,intelPlayer.id).map(c=>`${c.rarity} ${c.seasonYear??""} #${c.serialNumber??"?"}`).join(" · ")}</p>}
          <div className="v29-intel-actions"><button type="button" onClick={()=>select(intelPlayer.id)}>+ Zum aktiven Team</button><button type="button" onClick={()=>onOpenProfile(intelPlayer.id)}>Ausführliches Profil ↗</button></div></section>}
        <div className="v23-table-scroll"><table className="v23-roster-table"><thead><tr><th>Aktion</th>{showCol("date")&&<th>Datum</th>}<th>Spieler / Team</th>{showCol("status")&&<th>Verfügbarkeit</th>}{sport==="nba"&&showCol("games")&&<th>Spiele*</th>}{showCol("matchup")&&<th>Gegnerstärke</th>}{showCol("form")&&<th>Form (letzte Scores)</th>}{showCol("play")&&<th>Einsatz*</th>}{showCol("l5")&&<th>L5</th>}{showCol("l10")&&<th>L10</th>}{showCol("projection")&&<th>Prognose</th>}{showCol("floor")&&<th>Floor</th>}{showCol("ceiling")&&<th>Ceiling</th>}{sport==="nba"&&<>{showCol("stars")&&<th>Sterne</th>}{(showCol("value")||valueFilter!=="all")&&<th>{valueFilter==="floor"?"Floor/★":valueFilter==="ceiling"?"Ceiling/★":"Wert/★"}</th>}</>}{showCol("bonus")&&<th>Kartenbonus</th>}{showCol("card")&&<th>Karte</th>}</tr></thead>
          <tbody>{sortedPlayers.slice(0,showCount).map(p=>{
            const card=cardStore[p.id]??{};
            const stars=isValidNbaStars(card.stars)?card.stars:null;
            const selected=selectedIds.has(p.id);
            const date=gameDate(p);const games=gamesFor(p.team);const availabilityReport=availabilityById[p.id];
            return <tr key={p.id} draggable={!card.excluded} onDragStart={event=>beginDrag(event,{kind:"pool",playerId:p.id})} onDragEnd={()=>{dragRef.current=null;setDragTarget(null);}} className={selected?"v23-roster-picked":""}>
              <td><div className="v23-row-actions"><button type="button" title={`Zu Team ${teams.findIndex(t=>t.id===activeTeamId)+1} hinzufügen`} aria-label={`${p.name} zum Team hinzufügen`} onClick={()=>select(p.id)} disabled={selected||card.excluded===true}>+</button><button type="button" title="Für den Optimizer ausschließen" aria-label={`${p.name} ${card.excluded?"freigeben":"ausschließen"}`} aria-pressed={card.excluded===true} className={card.excluded?"is-blocked":""} onClick={()=>updateCard(p.id,{excluded:!card.excluded,locked:false})}>⊘</button></div></td>
              {showCol("date")&&<td className="v23-date">{date?date.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit",timeZone:"Europe/Berlin"}):"—"}<small>{date?(fixtureTime(p)?`${fixtureTime(p)} Uhr`:"Uhrzeit unbekannt"):"Nicht verfügbar"}</small></td>}
              <td><div className="v23-roster-person"><button type="button" className="v23-roster-avatar" onClick={()=>setIntelId(p.id)}><Avatar player={p}/></button><div><button type="button" className="v23-roster-name" onClick={()=>setIntelId(p.id)}>{p.name}</button><small>{p.team} · {p.position} {p.opponent?`· vs ${p.opponent}`:""}</small><button type="button" className={`v23-inline-fav ${favoriteSet.has(p.id)?"is-on":""}`} onClick={()=>onToggleFavorite(p.id)}>{favoriteSet.has(p.id)?"★ Auf Watchlist":"☆ Merken"}</button></div></div></td>
              {showCol("status")&&<td><AvailabilityBadge report={availabilityReport} small/></td>}
              {sport==="nba"&&showCol("games")&&<td><span className={`v25-row-games ${games.length>=2?"v25-multi":""}`}>{games.length?multiGameLabel(games.length):"—"}</span>{games.length>0&&<small className="v25-row-games-list" title={games.map(g=>`${g.date} · ${g.home?"H":"A"} vs ${g.opponent}`).join(" · ")}>{games.slice(0,2).map(g=>g.opponent).join(" / ")}{games.length>2?` +${games.length-2}`:""}</small>}</td>}
              {showCol("matchup")&&<td><MatchupPill opponent={p.opponent} ratings={matchupRatings} sport={sport}/></td>}
              {showCol("form")&&<td><Bars player={p}/></td>}
              {showCol("play")&&<td><span className={`v23-table-pill ${p.playProb<.6?"bad":p.playProb>=.8?"good":"mid"}`}>{short(p.playProb*100)}%</span></td>}
              {showCol("l5")&&<td><span className="v23-table-pill mid">{p.last5Avg===null?"—":fmt(p.last5Avg)}</span></td>}
              {showCol("l10")&&<td><span className="v23-table-pill muted">{p.last10Avg===null?"—":fmt(p.last10Avg)}</span></td>}
              {showCol("projection")&&<td><span className="v23-table-pill featured">{p.forecastSources.length?fmt(p.weighted):"—"}</span></td>}
              {showCol("floor")&&<td><span className="v23-small-figure">{p.forecastSources.length?fmt(p.floor*p.playProb):"—"}</span></td>}
              {showCol("ceiling")&&<td><span className="v23-small-figure">{p.forecastSources.length?fmt(p.ceiling*p.playProb):"—"}</span></td>}
              {sport==="nba"&&<>{showCol("stars")&&<td>{card.starSource==="sorare"?<span className="v23-table-pill star">{stars===null?"—":`${fmt(stars)} ★`}</span>:<select className="v23-star-edit" aria-label={`Sterne für ${p.name} manuell eintragen`} title="Manueller Ersatzwert, wenn Sorare keinen offiziellen Sternwert liefert" value={stars===null?"":String(stars)} onChange={e=>updateCard(p.id,{stars:e.target.value?Number(e.target.value):null})}><option value="">★ —</option>{Array.from({length:9},(_,i)=>1+i/2).map(value=><option key={value} value={value}>{fmt(value)} ★</option>)}</select>}<small className="v23-star-source">{card.starSource==="sorare"?"✓ Sorare":stars!==null?"Manuell":"Fehlt"}</small></td>}{(showCol("value")||valueFilter!=="all")&&<td title={valueFilter==="floor"?"Floor / Stern":valueFilter==="ceiling"?"Ceiling / Stern":"Prognose / Stern"}>{fmt(nbaValueScore(p,stars,valueFilter==="floor"?"floor":valueFilter==="ceiling"?"ceiling":"projection")??NaN)}</td>}</>}
                {showCol("bonus")&&<td>{card.bonusSource==="sorare"?<span className="v293-sorare-bonus" title="Bester synchronisierter Kartenbonus. Die konkrete Karte wird in der Teamkarte ausgewählt.">+{fmt(card.bonusPercent??0)} % · Sorare</span>:<select className="v23-bonus-select" aria-label={`Kartenbonus ${p.name}`} value={card.bonusPercent??0} onChange={e=>updateCard(p.id,{bonusPercent:Number(e.target.value)})}>{[0,5,10,15,20,25,30].map(n=><option key={n} value={n}>+{n}%</option>)}</select>}</td>}
              {showCol("card")&&<td><button type="button" className={`v23-owned-button ${card.owned?"owned":""}`} aria-pressed={card.owned===true} disabled={verifiedOwnedReady} title={verifiedOwnedReady?"Besitz wurde aus Sorare synchronisiert und kann hier nicht manuell verändert werden":"Manuell Kartenbesitz markieren"} onClick={()=>updateCard(p.id,{owned:!card.owned})}>{card.owned?(verifiedOwnedReady?"✓ Sorare":"✓ Meine"):(verifiedOwnedReady?"—":"+ Karte")}</button></td>}
            </tr>;
          })}</tbody></table></div>
        {!sortedPlayers.length&&sport==="nba"&&valueFilter!=="all"&&<div className="v292-value-empty">Keine NBA-Value-Kandidaten mit gültigen Sternen und verlässlicher Prognose im aktuellen Filter. Prüfe Tag, Sammlung oder Sternwerte.</div>}
        {!sortedPlayers.length&&<div className="v23-no-results">{(horizon==="today"||horizon==="tomorrow")&&sport==="nba"&&nbaSchedule.status!=="available"?
          "NBA-Spielplan derzeit nicht verfügbar: Für diesen Tag können wir keine bestätigten Spiele nachweisen. Bitte Spielplan aktualisieren oder einen anderen Zeithorizont auswählen.":
          (horizon==="today"||horizon==="tomorrow")?`Keine bestätigten Spiele für ${activeCalendarDay??"den ausgewählten Tag"} im geladenen ${sport==="nba"?"NBA":"Fußball"}-Pool. Prüfe Liga, Kartenfilter und Spielplan oder wähle einen größeren Zeitraum.`:
          onlyMyCards?"Keine passenden Karten aus deiner synchronisierten Sammlung. Prüfe die Synchronisierung unter ‚Meine Karten‘ oder den gewählten Verein / die Liga.":"Keine passenden Spieler im aktuell geladenen Pool. Prüfe Liga, Filter, Slotposition oder Spieltermin."}</div>}
        {showCount<sortedPlayers.length&&<button className="v23-load-more" type="button" onClick={()=>setShowCount(count=>count+80)}>Weitere 80 Spieler anzeigen · {sortedPlayers.length-showCount} verbleiben ↓</button>}
        <div className="v23-pool-foot"><span>Ausfallstatus aus externen Meldungen, mit Quellenangabe. Keine Meldung = unbekannt, nicht gesund. Die angezeigte Einsatzwahrscheinlichkeit, Floor/Ceiling und Zielchance sind <b>Modellschätzungen</b>. Gegnerstärke: {matchupSource??"manuelle Bewertung oder unbekannt"}, 1 = günstig, 5 = schwierig. Mehrfachspiele beziehen sich auf das gewählte Zeitfenster – nicht auf eine bestätigte Arcade-Gameweek. Keine Summierung der NBA-Einzelspiel-Scores.</span><button type="button" onClick={()=>{
          if(!currentResult?.picks.length){setMsg("Zum Speichern zuerst Spieler auswählen.");return;}
          onSavePredictions(currentResult.picks.map(p=>p.player));setMsg("Prognosen des aktiven Teams im Forecast Lab gespeichert.");
        }}>Prognosen sichern ↗</button></div>
      </section>
    </div>
  </div>;
}

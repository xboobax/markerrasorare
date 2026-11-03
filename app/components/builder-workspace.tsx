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

type CardSettings={owned?:boolean;stars?:number|null;bonusPercent?:number;starSource?:"sorare";locked?:boolean;excluded?:boolean};
type Props={sport:Sport;players:Forecast[];cardStore:Record<string,CardSettings>;updateCard:(id:string,patch:CardSettings)=>void;
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
function MiniStat({label,value,tone}:{label:string;value:string;tone?:"good"|"warn"|"star"}){
  return <div className="v23-mini-stat"><small>{label}</small><strong className={tone?`tone-${tone}`:""}>{value}</strong></div>;
}
export default function BuilderWorkspace({sport,players,cardStore,updateCard,targetScore,onOpenProfile,onSavePredictions,requestedPlayer,favorites,onToggleFavorite,nbaSchedule,matchupRatings,matchupSource}:Props){
  const [teams,setTeams]=useState<WorkspaceTeam[]>(initialTeams);
  const [activeTeamId,setActiveTeamId]=useState("team-1");
  const [loadedSport,setLoadedSport]=useState<Sport|null>(null);
  const [activeSlot,setActiveSlot]=useState<number|null>(null);
  const [query,setQuery]=useState("");
  const [horizon,setHorizon]=useState<number|null>(null);
  const [pool,setPool]=useState<"all"|"owned"|"favorites"|"healthy">("all");
  const [sort,setSort]=useState<"weighted"|"l5"|"play"|"stars"|"value"|"name"|"matchup"|"games">("weighted");
  const [position,setPosition]=useState("all");
  const [msg,setMsg]=useState("");
  const [lastRequest,setLastRequest]=useState<number|null>(null);
  const [undoTeams,setUndoTeams]=useState<WorkspaceTeam[]|null>(null);
  const [strategy,setStrategy]=useState<Strategy>("balanced");
  const [now,setNow]=useState<Date|null>(null);
  const [swapTarget,setSwapTarget]=useState<{teamId:string;slot:number}|null>(null);
  const [dragTarget,setDragTarget]=useState<string|null>(null);
  const [gameWindow,setGameWindow]=useState<GameWindow>(7);
  const [multiOnly,setMultiOnly]=useState(false);
  const [compareOpen,setCompareOpen]=useState(false);
  const [compareId,setCompareId]=useState("team-2");
  const [tapSource,setTapSource]=useState<{teamId:string;slot:number;playerName:string}|null>(null);
  const [tapMode,setTapMode]=useState<"copy"|"move">("copy");
  const dragRef=useRef<{kind:"pool"|"slot";playerId:string;teamId?:string;slot?:number}|null>(null);
  useEffect(()=>setNow(new Date()),[]);
  const activeTeam=teams.find(t=>t.id===activeTeamId)??teams[0];
  const slots=sport==="nba"?ARCADE.nba.slots:ARCADE.football.slots;
  const gameCoverage=useMemo(()=>nbaGameCoverage(nbaSchedule,now??new Date(0),gameWindow),[nbaSchedule,now,gameWindow]);
  const gamesFor=(teamName:string)=>sport==="nba"?opportunitiesForTeam(teamName,gameCoverage):[];
  const cards:CardInput[]=useMemo(()=>players.map(player=>({player,owned:cardStore[player.id]?.owned===true,
    stars:cardStore[player.id]?.stars??null,bonusPercent:cardStore[player.id]?.bonusPercent??0})),[players,cardStore]);
  const favoriteSet=useMemo(()=>new Set(favorites),[favorites]);
  const byId=useMemo(()=>new Map(players.map(player=>[player.id,player])),[players]);
  const assessment=useMemo(()=>teams.map(team=>({team,result:evaluateManualLineup(team.selection,cards,sport,team.goal??targetScore)})),[teams,cards,sport,targetScore]);
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
    setLoadedSport(null);setActiveSlot(null);setSwapTarget(null);setTapSource(null);setCompareOpen(false);setMsg("");setLastRequest(null);setUndoTeams(null);
    try{
      const raw=window.localStorage.getItem(workspaceKey(sport));
      const legacy=window.localStorage.getItem(`markerras.sorare.manual-lineup.v1.${sport}`);
      const restored=restoreWorkspace(raw?JSON.parse(raw):null,legacy?JSON.parse(legacy):null);
      setTeams(restored.teams);setActiveTeamId(restored.activeTeamId);
    }catch{setTeams(initialTeams());setActiveTeamId("team-1");}
    setLoadedSport(sport);
  },[sport]);
  useEffect(()=>{
    if(loadedSport!==sport)return;
    try{window.localStorage.setItem(workspaceKey(sport),JSON.stringify({teams,activeTeamId}));}catch{}
  },[teams,activeTeamId,sport,loadedSport]);

  const changeTeams=(fn:(previous:WorkspaceTeam[])=>WorkspaceTeam[])=>{
    setUndoTeams(teams.map(t=>({...t,selection:t.selection.slice(),locks:[...t.locks]})));
    setTeams(fn);
  };
  const changeTeam=(id:string,fn:(current:WorkspaceTeam)=>WorkspaceTeam)=>changeTeams(old=>old.map(t=>t.id===id?fn(t):t));
  const select=(id:string,slot:number|null=activeSlot,teamId:string=activeTeamId)=>{
    const team=teams.find(t=>t.id===teamId);
    if(!team)return;
    if(cardStore[id]?.excluded){setMsg("Dieser Spieler ist ausgeschlossen. Entferne erst die Sperre in der Spielerliste.");return;}
    const targetIndex=slot===null?team.selection.findIndex((v,i)=>!v&&slotAccepts(slots[i],byId.get(id)?.position??"")):slot;
    if(targetIndex!==null&&targetIndex>=0&&team.selection[targetIndex]&&team.locks.includes(team.selection[targetIndex]!)){
      setMsg("Dieser Slot ist fixiert. Bitte erst das Schloss öffnen.");return;
    }
    const placed=placeInTeam(team.selection,id,cards,sport,slot);
    if(placed.reason){setMsg(placed.reason);return;}
    changeTeam(team.id,old=>({...old,selection:placed.selection,locks:old.locks.filter(lock=>placed.selection.includes(lock))}));
    setActiveTeamId(team.id);setActiveSlot(null);
    setMsg(`${byId.get(id)?.name??"Spieler"} in Team ${teams.indexOf(team)+1} · Slot ${(placed.index??0)+1} aufgenommen.`);
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
    changeTeam(id,t=>({...t,selection:[null,null,null,null,null],locks:[]}));setMsg("Team geleert.");
  };
  const cloneTeam=(id:string)=>{
    if(teams.length>=6){setMsg("Maximal sechs Teams gleichzeitig. Lösche eines, um Platz zu schaffen.");return;}
    const source=teams.find(t=>t.id===id);
    if(!source)return;
    const nextId=`team-${Math.max(...teams.map(t=>Number(t.id.split("-")[1])||0))+1}`;
    changeTeams(old=>[...old,{...source,id:nextId,selection:source.selection.slice(),locks:[...source.locks],collapsed:false}]);
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
    const allowed=cards.filter(c=>pool==="owned"?c.owned:pool==="favorites"?favoriteSet.has(c.player.id):pool==="healthy"?
      c.player.forecastSources.length>0&&c.player.hasGame!==false&&c.player.playProb>=.65:true);
    const filled=smartFillEmptySlots(team.selection,cards,sport,{
      strategy:strategy==="target"&&!target?"balanced":strategy,targetScore:target,
      allowedIds:allowed.map(c=>c.player.id),excludedIds:Object.keys(cardStore).filter(k=>cardStore[k]?.excluded),
    });
    if(filled.reason){setMsg(filled.reason);return;}
    const check=evaluateManualLineup(filled.selection,cards,sport,target);
    if(!check.valid){setMsg("Regelprüfung fehlgeschlagen. Die bisherige Aufstellung bleibt erhalten.");return;}
    changeTeam(id,t=>({...t,selection:filled.selection,locks:t.locks.filter(lock=>filled.selection.includes(lock))}));
    setActiveTeamId(id);setActiveSlot(null);setSwapTarget(null);
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
      `Ziel: ${team.goal??targetScore??"—"}`,"Modellprognose; keine offizielle Sorare-Einreichung"].join("\n");
    try{await navigator.clipboard.writeText(text);setMsg("Team in die Zwischenablage kopiert.");}
    catch{setMsg("Kopieren wurde vom Browser verhindert.");}
  };
  const sortedPlayers=useMemo(()=>{
    const term=filterKey(query.trim());
    return players.filter(p=>{
      if(term&&!filterKey(`${p.name} ${p.team} ${p.position} ${p.opponent??""}`).includes(term))return false;
      if(position!=="all"&&p.position!==position)return false;
      if(pool==="owned"&&!cardStore[p.id]?.owned)return false;
      if(pool==="favorites"&&!favoriteSet.has(p.id))return false;
      if(pool==="healthy"&&(!p.forecastSources.length||p.hasGame===false||p.playProb<.65))return false;
      if(horizon!==null&&now&&!withinHorizon(gameDate(p),horizon,now,Boolean(p.nextGameTipoff)))return false;
      if(activeSlot!==null&&!slotAccepts(slots[activeSlot],p.position))return false;
      if(sport==="nba"&&multiOnly&&gamesFor(p.team).length<2)return false;
      return true;
    }).sort((a,b)=>{
      const weight=(p:Forecast)=>({weighted:p.weighted,l5:p.last5Avg??-1,play:p.playProb*100,
        matchup:assessMatchup(p.opponent,matchupRatings,sport).rating===null?-1:6-assessMatchup(p.opponent,matchupRatings,sport).rating!,
        games:gamesFor(p.team).length,
        stars:cardStore[p.id]?.stars??-1,value:isValidNbaStars(cardStore[p.id]?.stars)?p.weighted/cardStore[p.id]!.stars!:0,
        name:0})[sort];
      return sort==="name"?a.name.localeCompare(b.name,"de"):(weight(b)-weight(a)||a.name.localeCompare(b.name,"de"));
    });
  },[players,query,position,pool,cardStore,favoriteSet,horizon,now,activeSlot,slots,sort,multiOnly,gameCoverage,matchupRatings,sport]);
  const quickSwaps=useMemo(()=>{
    if(!swapTarget)return [];
    const team=teams.find(t=>t.id===swapTarget.teamId);if(!team)return [];
    return quickSwapsForSlot(team.selection,swapTarget.slot,cards,sport,Object.keys(cardStore).filter(id=>cardStore[id]?.excluded),5);
  },[swapTarget,teams,cards,sport,cardStore]);
  const [showCount,setShowCount]=useState(80);
  useEffect(()=>setShowCount(80),[sport,query,position,pool,horizon,sort,activeSlot,gameWindow,multiOnly]);
  const poolCount=players.length;
  return <div className="workspace-v23" aria-label="V2.5 Obsidian Neon Builder Pro Workspace">
    <header className="v23-toolbar">
      <div className="v23-toolbar-brand"><span className="v23-mark">M<span>★</span></span><span><strong>NEON BUILDER PRO</strong><small>{sport==="nba"?"NBA · OFFIZIELLE SORARE-STERNE":"FOOTBALL · 5 POSITIONEN"} / V2.5.0</small></span></div>
      <label>Zeithorizont<select value={horizon===null?"all":horizon} onChange={e=>setHorizon(e.target.value==="all"?null:Number(e.target.value))}>
        <option value="all">Alle bekannten Spiele</option><option value="24">≈ Nächste 24 Std.*</option><option value="72">Nächste 3 Tage*</option><option value="168">Nächste 7 Tage*</option>
      </select></label>
      {sport==="nba"&&<label>Spielzeitraum<select aria-label="NBA-Spielzeitraum für Mehrfachspiele" value={gameWindow} onChange={e=>setGameWindow(Number(e.target.value) as GameWindow)}>
        <option value="3">3 Tage</option><option value="7">7 Tage</option><option value="14">14 Tage</option>
      </select></label>}
      <label>Spielerpool<select value={pool} onChange={e=>setPool(e.target.value as typeof pool)}><option value="all">Alle Spieler</option><option value="owned">Meine Karten</option><option value="favorites">Watchlist</option><option value="healthy">Gute Datenlage</option></select></label>
      <label>Optimierung<select value={strategy} onChange={e=>setStrategy(e.target.value as Strategy)}><option value="balanced">Ausgewogen</option><option value="safe">Sicher</option><option value="upside">Offensiv</option><option value="target" disabled={targetScore===null&&!teams.some(t=>t.goal!==null)}>Arcade-Ziel</option></select></label>
      <div className="v23-toolbar-actions"><button type="button" onClick={()=>autoFill(activeTeamId)} title="Nur freie Slots des aktiven Teams füllen">✦ Smart Auto-Fill</button><button type="button" className={compareOpen?"v25-active-action":""} onClick={()=>setCompareOpen(v=>!v)} title="Zwei Teams anhand ihrer Prognosen vergleichen">⇄ Team Battle</button><button type="button" onClick={()=>cloneTeam(activeTeamId)} title="Aktives Team kopieren">⧉ Team kopieren</button><button type="button" onClick={()=>{if(undoTeams){setTeams(undoTeams);setUndoTeams(null);setMsg("Letzte Teamänderung rückgängig gemacht.");}}} disabled={!undoTeams} title="Letzte Teamänderung rückgängig machen">↶ Undo</button></div>
    </header>
    <div className="v23-subbar"><span className="v23-live-dot"/> <strong>{teams.length} Teams</strong><span>{poolCount} geladene Spieler</span><span className="v23-target-label">Aktives Team <b>{activeTeamId.replace("team-", "#")}</b> · {activeSlotLabel}</span><span className="v23-tiny-muted">Spieler rechts ziehen oder „+“ benutzen · NBA-Termine in deutscher Zeit (MEZ/MESZ)</span></div>
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
        {assessment.map(({team,result},teamIndex)=>{
          const active=team.id===activeTeamId;
          const d=active?doctor:null;
          const meter=goalMeter(result.projectedScore,team.goal??targetScore);
          const missing=Math.max(0,5-team.selection.filter(Boolean).length);
          const multiCount=sport==="nba"?result.picks.filter(p=>gamesFor(p.player.team).length>=2).length:0;
          const riskCount=result.errors.length+result.warnings.length+(d?.issues.length??0)+Number(missing>0);
          return <section key={team.id} className={`v23-team v24-team ${active?"is-current":""}`} aria-label={`Team ${teamIndex+1}`}>
            <div className="v23-team-top">
              <button type="button" className="v23-collapse" onClick={()=>changeTeam(team.id,t=>({...t,collapsed:!t.collapsed}))} aria-label={`Team ${teamIndex+1} ${team.collapsed?"ausklappen":"einklappen"}`}>{team.collapsed?"▸":"⌄"}</button>
              <button type="button" className="v23-team-name" onClick={()=>{setActiveTeamId(team.id);setActiveSlot(null);}}>TEAM {teamIndex+1}</button>
              <span className={`v23-team-state ${result.valid?"good":result.errors.length?"bad":"idle"}`} title={result.errors.join(" · ")||"Noch nicht vollständig"}>{result.valid?"✓ Gültig":result.errors.length?"! Prüfen":`${result.picks.length}/5`}</span>
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
                  return <article key={`${slot}-${index}`} className={`v23-card v24-card ${player?"filled":"empty"} ${isSelected?"focused":""} ${locked?"v24-locked":""} ${dragHere?"v24-drop-target":""} ${tapSource?"v25-tap-ready":""}`}
                    draggable={!!player&&!locked} onDragStart={event=>player&&beginDrag(event,{kind:"slot",playerId:player.id,teamId:team.id,slot:index})}
                    onDragEnd={()=>{dragRef.current=null;setDragTarget(null);}}
                    onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect="move";setDragTarget(`${team.id}:${index}`);}}
                    onDragLeave={()=>setDragTarget(key=>key===`${team.id}:${index}`?null:key)}
                    onDrop={event=>dropOnSlot(event,team.id,index)}>
                    <div className="v23-card-top"><span>{sport==="nba"?`#${index+1}`:({GK:"TW",DEF:"VER",MID:"MF",FWD:"ST",FLEX:"EX"} as Record<string,string>)[slot]}</span><div><button type="button" aria-label={`Slot ${index+1} wählen`} onClick={()=>{if(tapSource){tapTransfer(team.id,index);}else{setActiveTeamId(team.id);setActiveSlot(index);setMsg("");}}} title={tapSource?"Ausgewählten Spieler hierhin übertragen":"Slot wählen"}> {tapSource?"◎":"✎"}</button>{player&&<><button type="button" className={tapSource?.teamId===team.id&&tapSource.slot===index?"v25-active-action":""} title="Spieler zum Kopieren oder Verschieben per Klick auswählen (auch auf Mobilgeräten)" aria-label={`${player.name} für Teamtransfer wählen`} onClick={()=>{setTapSource({teamId:team.id,slot:index,playerName:player.name});setActiveTeamId(team.id);}}>⤴</button><button type="button" className={locked?"v24-lock-active":""} title={locked?"Spieler entsperren":"Spieler in diesem Team fixieren"} aria-label={`${player.name} ${locked?"entsperren":"fixieren"}`} aria-pressed={locked} onClick={()=>toggleLock(team.id,player.id)}>{locked?"🔒":"♧"}</button><button type="button" title="Quick Swap: passende Alternativen zeigen" aria-label={`Quick Swap für ${player.name}`} onClick={()=>{setActiveTeamId(team.id);setActiveSlot(index);setSwapTarget(v=>v?.teamId===team.id&&v.slot===index?null:{teamId:team.id,slot:index});}}>⇄</button><button type="button" title={cardStore[player.id]?.excluded?"Spieler freigeben":"Spieler für den Auto-Builder sperren"} aria-label={`${player.name} für Auto-Builder ${cardStore[player.id]?.excluded?"freigeben":"sperren"}`} disabled={locked} onClick={()=>{updateCard(player.id,{excluded:!cardStore[player.id]?.excluded,locked:false});setMsg("Auto-Builder-Sperre aktualisiert. Der Spieler bleibt in diesem manuellen Team, bis du ihn entfernst.");}}>⊘</button><button type="button" aria-label={`${player.name} entfernen`} disabled={locked} onClick={()=>changeTeam(team.id,t=>({...t,selection:t.selection.map((id,i)=>i===index?null:id),locks:t.locks.filter(v=>v!==player.id)}))}>−</button></>}</div></div>
                    {player?<>
                      <button type="button" className="v23-portrait" onClick={()=>onOpenProfile(player.id)} title={`${player.name} Profil öffnen`}><Avatar player={player}/></button>
                      <button type="button" className="v23-player-name" onClick={()=>onOpenProfile(player.id)} title={player.name}>{player.name}</button>
                      <span className="v23-role">{positionNames[player.position]??player.position}</span>
                      {sport==="nba"&&<span className={`v25-game-label ${games.length>=2?"v25-multi":games.length?"v25-single":"v25-unknown"}`} title={`Bestätigte Spiele im ${gameWindow}-Tage-Fenster, keine offizielle Sorare-Gameweek`}>{games.length?multiGameLabel(games.length):"Kein Spielplan"}</span>}
                      <MatchupPill opponent={player.opponent} ratings={matchupRatings} sport={sport}/>
                      <div className="v23-mini-grid">
                        {sport==="nba"?<><MiniStat label="L5" value={player.last5Avg===null?"—":short(player.last5Avg)}/><MiniStat label="Ø" value={player.avg===null?"—":short(player.avg)}/><MiniStat label="★" tone="star" value={isValidNbaStars(cardStore[player.id]?.stars)?fmt(cardStore[player.id]!.stars!):"—"}/></>
                          :<><MiniStat label="Einsatz*" value={`${short(player.playProb*100)}%`} tone={player.playProb<.65?"warn":"good"}/><MiniStat label="L5" value={player.last5Avg===null?"—":short(player.last5Avg)}/><MiniStat label="Bonus" tone="star" value={`+${pick?.bonusPercent??0}%`}/></>}
                      </div>
                      <div className="v23-mini-grid second"><MiniStat label="Prognose" value={pick?fmt(pick.projectedScore):"—"}/><MiniStat label="Floor" value={pick?fmt(pick.floorScore):"—"}/><MiniStat label="Ceiling" value={pick?fmt(pick.ceilingScore):"—"}/></div>
                      <Bars player={player} compact/>
                      {sport==="nba"&&games.length>1&&<details className="v25-card-games"><summary>▣ Alle {games.length} Spiele zeigen</summary>{games.map(g=><small key={g.fixtureId}>{g.date.split("-").reverse().join(".")} · {g.home?"Heim":"Auswärts"} vs {g.opponent}{g.tipoff?` · ${fixtureTime({...player,nextGameTipoff:g.tipoff})} Uhr`:""}</small>)}</details>}
                      <div className="v23-card-match"><strong>{player.opponent?`vs ${player.opponent}`:player.team}</strong><small>{gameDate(player)?gameDate(player)!.toLocaleDateString("de-DE",{timeZone:"Europe/Berlin"}):"Termin unbekannt"}{fixtureTime(player)?` · ${fixtureTime(player)} Uhr`:""}{player.hasGame===false?" · kein Spiel gemeldet":""}</small></div>
                    </>:<button type="button" className="v23-card-empty-content" onClick={()=>{if(tapSource)tapTransfer(team.id,index);else{setActiveTeamId(team.id);setActiveSlot(index);setMsg("");}}}><span className="v23-plus-ring">+</span><strong>{team.selection[index]?"Spieler nicht geladen":sport==="nba"?"Karte wählen":slotNames[slot]}</strong><small>{team.selection[index]?"Team oder Liga prüfen":"Spieler rechts auswählen"}</small></button>}
                  </article>;
                })}
              </div>
              {meter&&<div className="v24-goal-meter" aria-label={`Arcade-Ziel: ${Math.round(meter.percentage)} Prozent des Punkteziels prognostiziert`}>
                <div className="v24-goal-line"><span>◎ Arcade Goal Meter <b>{fmt(result.projectedScore)} / {fmt(team.goal??targetScore??0)} PS</b></span><strong className={meter.difference>=0?"v24-positive":"v24-pending"}>{meter.difference>=0?`+${fmt(meter.difference)}`:`−${fmt(meter.remaining)}`} PS</strong></div>
                <div className="v24-goal-track"><span style={{width:`${meter.percentage}%`}}/></div>
                <small>{result.valid&&result.targetProbability!==null?`Geschätzte Zielchance ${short(result.targetProbability*100)} % · nicht kalibriert`:"Zielchance erst mit einem gültigen Team und belastbaren Sorare-Daten"}</small>
              </div>}
              <footer className="v23-team-footer"><span><b>{result.picks.length}/5</b> Spieler</span><span>Floor <b>{fmt(result.floorScore)}</b></span>{sport==="nba"&&<span className={multiCount?"v25-multi-text":""}>{multiCount} Mehrfachspieler / {gameWindow} T.</span>}<span>Ceiling <b>{fmt(result.ceilingScore)}</b></span>{sport==="nba"&&<span>Budget <b className={result.starsUsed>16?"v23-danger":""}>{fmt(result.starsUsed)}/16 ★</b></span>}<span>Zielchance* <b>{result.targetProbability===null?"—":`${short(result.targetProbability*100)} %`}</b></span></footer>
              {active&&sport==="nba"&&<div className="v25-multi-note">▣ <strong>{multiCount} Spieler mit 2+ Spielen</strong> im {gameWindow}-Tage-Fenster. Nur der beste Einzelspiel-Score zählt in entsprechenden NBA-Gameweek-Wettbewerben; kein automatischer Bonus für Arcade. Die Anzeige ersetzt keine Prüfung der offiziellen Gameweek-Berechtigung.</div>}
              {active&&<details className={`v24-risk-radar ${result.errors.length?"v24-risk-critical":riskCount?"v24-risk-warning":"v24-risk-clear"}`} open={result.errors.length>0}>
                <summary><span>◈ LINEUP RISK RADAR</span><b>{result.errors.length?`${result.errors.length} Regelprobleme`:missing?`${missing} freie Slots · ${riskCount} Hinweise`:riskCount?`${riskCount} Hinweise`:"Keine Warnungen"}</b></summary>
                <div className="v24-risk-content">
                  {missing>0&&<p>{missing} freie Slots: Das Team ist noch nicht vollständig. Die Zielchance kann erst danach berechnet werden.</p>}
                  {result.errors.map((item,i)=><p key={`error-${i}`} className="v24-risk-error">✕ {item}</p>)}
                  {result.warnings.slice(0,5).map((item,i)=><p key={`warn-${i}`}>! {item}</p>)}
                  {d?.issues.slice(0,5).map(issue=><p key={issue.id}><b>{issue.title}:</b> {issue.description}</p>)}
                  {!riskCount&&<p>Keine Probleme aus den verfügbaren Daten festgestellt. Prüfe vor dem Sorare-Lock trotzdem Kartenberechtigung und Gameweek-Sternpreis.</p>}
                </div>
              </details>}
              {active&&swapTarget?.teamId===team.id&&team.selection[swapTarget.slot]&&<div className="v24-quick-swap">
                <div className="v24-swap-header"><b>⇄ QUICK SWAP · Slot {swapTarget.slot+1}</b><button type="button" onClick={()=>setSwapTarget(null)} aria-label="Quick Swap schließen">×</button></div>
                {team.locks.includes(team.selection[swapTarget.slot]!)?<p>Spieler ist fixiert. Bitte zuerst entsperren.</p>:quickSwaps.length?quickSwaps.map(candidate=><button key={candidate.id} type="button" className="v24-swap-pick" onClick={()=>{select(candidate.id,swapTarget.slot,team.id);setSwapTarget(null);}}>
                  <span><b>{candidate.name}</b><small>{candidate.team} {candidate.stars!==null?` · ${fmt(candidate.stars)} ★`:""}</small></span><strong className={candidate.delta>=0?"v24-positive":"v24-pending"}>{candidate.delta>=0?"+":""}{fmt(candidate.delta)} PS</strong><span>Übernehmen ↗</span>
                </button>):<p>Keine zulässigen Alternativen mit den aktuell geladenen Daten gefunden.</p>}
              </div>}
              {active&&result.errors.length>0&&<p className="v23-team-alert">{result.errors.slice(0,2).join(" · ")}</p>}
              {active&&d&&d.issues.length>0&&<details className="v23-doctor"><summary>✦ Lineup Doctor · {d.issues.length} Hinweise</summary><div>{d.issues.slice(0,4).map(item=><p key={item.id}><b>{item.title}</b> – {item.description}</p>)}</div></details>}
              {active&&d&&d.swaps.length>0&&<details className="v23-doctor v23-doctor-swaps"><summary>✦ Lineup Doctor · {d.swaps.length} geprüfte Wechselideen</summary><div>{d.swaps.map(swap=><div className="v23-swap" key={`${swap.slotIndex}-${swap.toId}`}><span><b>{swap.fromName}</b> → <b>{swap.toName}</b><small>{swap.kind==="safer"?"Weniger Modellrisiko":swap.kind==="repair"?"Regelreparatur":"Höhere Prognose"} · {swap.delta>=0?"+":""}{fmt(swap.delta)} Punkte</small></span><button type="button" disabled={team.locks.includes(swap.fromId)} onClick={()=>select(swap.toId,swap.slotIndex,team.id)}>Wechsel übernehmen</button></div>)}</div></details>}
            </>}
          </section>;
        })}
        <button type="button" className="v23-add-team" onClick={()=>{
          if(teams.length>=6){setMsg("Maximal 6 Teams.");return;}
          const nextId=`team-${Math.max(...teams.map(t=>Number(t.id.split("-")[1])||0))+1}`;
          changeTeams(old=>[...old,{id:nextId,selection:[null,null,null,null,null],goal:null,collapsed:false,locks:[]}]);setActiveTeamId(nextId);
        }} disabled={teams.length>=6}>+ Neues Team hinzufügen <span>{teams.length} / 6</span></button>
        <div className="v23-team-note">Autospeicherung inklusive Fixierungen auf diesem Gerät · V2.3-Teams werden übernommen. Kartenbesitz ist weiterhin manuell zu prüfen.</div>
      </div>
      <section className="v23-pool" aria-label="Spielerpool und Suche">
        <div className="v23-pool-head"><div><span className="v23-kicker">PLAYER DATABASE / SCOUTING</span><h3>Spielerpool <small>{sortedPlayers.length.toLocaleString("de-DE")} Treffer</small></h3></div><span className="v23-active-team-chip">◉ Team {teams.findIndex(t=>t.id===activeTeamId)+1} aktiv</span></div>
        <div className="v23-pool-filters"><input type="search" aria-label="Spieler oder Team suchen" placeholder="⌕  Spieler / Team / Gegner suchen …" value={query} onChange={e=>setQuery(e.target.value)}/>
          <select aria-label="Position filtern" value={position} onChange={e=>setPosition(e.target.value)}><option value="all">Alle Positionen</option>{(sport==="nba"?["G","F","C"]:["GK","DEF","MID","FWD"]).map(pos=><option key={pos} value={pos}>{positionNames[pos]}</option>)}</select>
          {sport==="nba"&&<label className="v25-multi-filter"><input type="checkbox" checked={multiOnly} onChange={e=>setMultiOnly(e.target.checked)}/> Nur 2+ Spiele</label>}
          <select aria-label="Spieler sortieren" value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="weighted">Prognose ↓</option><option value="l5">L5 ↓</option><option value="play">Einsatzchance ↓</option>{sport==="nba"&&<><option value="stars">Sterne ↓</option><option value="value">Prognose / Stern ↓</option><option value="games">Mehrfachspiele ↓</option></>}<option value="matchup">Günstiges Matchup ↓</option><option value="name">Name A–Z</option></select>
          {activeSlot!==null&&<button type="button" className="v23-clear-slot" onClick={()=>setActiveSlot(null)}>Slotfilter ×</button>}
        </div>
        <div className="v23-table-scroll"><table className="v23-roster-table"><thead><tr><th>Aktion</th><th>Datum</th><th>Spieler / Team</th>{sport==="nba"&&<th>Spiele*</th>}<th>Gegnerstärke</th><th>Form (letzte Scores)</th><th>Einsatz*</th><th>L5</th><th>L10</th><th>Prognose</th><th>Floor</th><th>Ceiling</th>{sport==="nba"?<><th>Sterne</th><th>Wert/★</th></>:<th>Bonus</th>}<th>Karte</th></tr></thead>
          <tbody>{sortedPlayers.slice(0,showCount).map(p=>{
            const card=cardStore[p.id]??{};
            const stars=isValidNbaStars(card.stars)?card.stars:null;
            const selected=selectedIds.has(p.id);
            const date=gameDate(p);const games=gamesFor(p.team);
            return <tr key={p.id} draggable={!card.excluded} onDragStart={event=>beginDrag(event,{kind:"pool",playerId:p.id})} onDragEnd={()=>{dragRef.current=null;setDragTarget(null);}} className={selected?"v23-roster-picked":""}>
              <td><div className="v23-row-actions"><button type="button" title={`Zu Team ${teams.findIndex(t=>t.id===activeTeamId)+1} hinzufügen`} aria-label={`${p.name} zum Team hinzufügen`} onClick={()=>select(p.id)} disabled={selected||card.excluded===true}>+</button><button type="button" title="Für den Optimizer ausschließen" aria-label={`${p.name} ${card.excluded?"freigeben":"ausschließen"}`} aria-pressed={card.excluded===true} className={card.excluded?"is-blocked":""} onClick={()=>updateCard(p.id,{excluded:!card.excluded,locked:false})}>⊘</button></div></td>
              <td className="v23-date">{date?date.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit",timeZone:"Europe/Berlin"}):"—"}<small>{date?(fixtureTime(p)?`${fixtureTime(p)} Uhr`:"Uhrzeit unbekannt"):"Nicht verfügbar"}</small></td>
              <td><div className="v23-roster-person"><button type="button" className="v23-roster-avatar" onClick={()=>onOpenProfile(p.id)}><Avatar player={p}/></button><div><button type="button" className="v23-roster-name" onClick={()=>onOpenProfile(p.id)}>{p.name}</button><small>{p.team} · {p.position} {p.opponent?`· vs ${p.opponent}`:""}</small><button type="button" className={`v23-inline-fav ${favoriteSet.has(p.id)?"is-on":""}`} onClick={()=>onToggleFavorite(p.id)}>{favoriteSet.has(p.id)?"★ Auf Watchlist":"☆ Merken"}</button></div></div></td>
              {sport==="nba"&&<td><span className={`v25-row-games ${games.length>=2?"v25-multi":""}`}>{games.length?multiGameLabel(games.length):"—"}</span>{games.length>0&&<small className="v25-row-games-list" title={games.map(g=>`${g.date} · ${g.home?"H":"A"} vs ${g.opponent}`).join(" · ")}>{games.slice(0,2).map(g=>g.opponent).join(" / ")}{games.length>2?` +${games.length-2}`:""}</small>}</td>}
              <td><MatchupPill opponent={p.opponent} ratings={matchupRatings} sport={sport}/></td>
              <td><Bars player={p}/></td>
              <td><span className={`v23-table-pill ${p.playProb<.6?"bad":p.playProb>=.8?"good":"mid"}`}>{short(p.playProb*100)}%</span></td>
              <td><span className="v23-table-pill mid">{p.last5Avg===null?"—":fmt(p.last5Avg)}</span></td>
              <td><span className="v23-table-pill muted">{p.last10Avg===null?"—":fmt(p.last10Avg)}</span></td>
              <td><span className="v23-table-pill featured">{p.forecastSources.length?fmt(p.weighted):"—"}</span></td>
              <td><span className="v23-small-figure">{p.forecastSources.length?fmt(p.floor*p.playProb):"—"}</span></td>
              <td><span className="v23-small-figure">{p.forecastSources.length?fmt(p.ceiling*p.playProb):"—"}</span></td>
              {sport==="nba"?<><td>{card.starSource==="sorare"?<span className="v23-table-pill star">{stars===null?"—":`${fmt(stars)} ★`}</span>:<select className="v23-star-edit" aria-label={`Sterne für ${p.name} manuell eintragen`} title="Manueller Ersatzwert, wenn Sorare keinen offiziellen Sternwert liefert" value={stars===null?"":String(stars)} onChange={e=>updateCard(p.id,{stars:e.target.value?Number(e.target.value):null})}><option value="">★ —</option>{Array.from({length:9},(_,i)=>1+i/2).map(value=><option key={value} value={value}>{fmt(value)} ★</option>)}</select>}<small className="v23-star-source">{card.starSource==="sorare"?"✓ Sorare":stars!==null?"Manuell":"Fehlt"}</small></td><td>{stars!==null&&p.forecastSources.length?fmt(p.weighted/stars):"—"}</td></>
                :<td><select className="v23-bonus-select" aria-label={`Kartenbonus ${p.name}`} value={card.bonusPercent??0} onChange={e=>updateCard(p.id,{bonusPercent:Number(e.target.value)})}>{[0,5,10,15,20,25,30].map(n=><option key={n} value={n}>+{n}%</option>)}</select></td>}
              <td><button type="button" className={`v23-owned-button ${card.owned?"owned":""}`} aria-pressed={card.owned===true} title="Manuell Kartenbesitz markieren" onClick={()=>updateCard(p.id,{owned:!card.owned})}>{card.owned?"✓ Meine":"+ Karte"}</button></td>
            </tr>;
          })}</tbody></table></div>
        {!sortedPlayers.length&&<div className="v23-no-results">Keine passenden Spieler im aktuell geladenen Pool. Prüfe Liga, Filter, Slotposition oder Spieltermin.</div>}
        {showCount<sortedPlayers.length&&<button className="v23-load-more" type="button" onClick={()=>setShowCount(count=>count+80)}>Weitere 80 Spieler anzeigen · {sortedPlayers.length-showCount} verbleiben ↓</button>}
        <div className="v23-pool-foot"><span>Die angezeigte Einsatzwahrscheinlichkeit, Floor/Ceiling und Zielchance sind <b>Modellschätzungen</b>. Gegnerstärke: {matchupSource??"manuelle Bewertung oder unbekannt"}, 1 = günstig, 5 = schwierig. Mehrfachspiele beziehen sich auf das gewählte Zeitfenster – nicht auf eine bestätigte Arcade-Gameweek. Keine Summierung der NBA-Einzelspiel-Scores.</span><button type="button" onClick={()=>{
          if(!currentResult?.picks.length){setMsg("Zum Speichern zuerst Spieler auswählen.");return;}
          onSavePredictions(currentResult.picks.map(p=>p.player));setMsg("Prognosen des aktiven Teams im Forecast Lab gespeichert.");
        }}>Prognosen sichern ↗</button></div>
      </section>
    </div>
  </div>;
}

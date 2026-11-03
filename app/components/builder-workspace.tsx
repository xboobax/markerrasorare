"use client";

import {useEffect,useMemo,useState} from "react";
import {ARCADE} from "@/config/divination";
import {isValidNbaStars,optimizeArcadeLineups,slotAccepts,type CardInput,type Strategy} from "@/lib/arcade";
import {evaluateManualLineup} from "@/lib/manual-lineup";
import {diagnoseLineup} from "@/lib/lineup-doctor";
import {gameDate,initialTeams,placeInTeam,restoreWorkspace,withinHorizon,workspaceKey,type WorkspaceTeam} from "@/lib/builder-workspace";
import type {Forecast,Sport} from "@/lib/model";

type CardSettings={owned?:boolean;stars?:number|null;bonusPercent?:number;starSource?:"sorare";locked?:boolean;excluded?:boolean};
type Props={sport:Sport;players:Forecast[];cardStore:Record<string,CardSettings>;updateCard:(id:string,patch:CardSettings)=>void;
  targetScore:number|null;onOpenProfile:(id:string)=>void;onSavePredictions:(picks:Forecast[])=>void;
  requestedPlayer?:{id:string;seq:number}|null;favorites:string[];onToggleFavorite:(id:string)=>void;
};
const fmt=(n:number)=>Number.isFinite(n)?n.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1}):"—";
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
function Bars({player}:{player:Forecast}){
  const values=(player.recentScores??[]).filter(n=>Number.isFinite(n)&&n>=0).slice(0,10).reverse();
  if(!values.length)return <span className="v23-no-form">Keine Einzel-Scores</span>;
  const max=Math.max(10,...values);
  return <div className="v23-form-bars" title={`Letzte ${values.length} Sorare-Scores · historische Form, keine Live-Werte`} aria-label={`Letzte ${values.length} Scores: ${values.map(short).join(", ")}`}>
    {values.map((value,i)=><i key={i} style={{height:`${Math.max(9,Math.round(value/max*100))}%`}} className={value>=60?"positive":value<25?"negative":"neutral"}/>)}
  </div>;
}
function MiniStat({label,value,tone}:{label:string;value:string;tone?:"good"|"warn"}){
  return <div className="v23-mini-stat"><small>{label}</small><strong className={tone?`tone-${tone}`:""}>{value}</strong></div>;
}
export default function BuilderWorkspace({sport,players,cardStore,updateCard,targetScore,onOpenProfile,onSavePredictions,requestedPlayer,favorites,onToggleFavorite}:Props){
  const [teams,setTeams]=useState<WorkspaceTeam[]>(initialTeams);
  const [activeTeamId,setActiveTeamId]=useState("team-1");
  const [loadedSport,setLoadedSport]=useState<Sport|null>(null);
  const [activeSlot,setActiveSlot]=useState<number|null>(null);
  const [query,setQuery]=useState("");
  const [horizon,setHorizon]=useState<number|null>(null);
  const [pool,setPool]=useState<"all"|"owned"|"favorites"|"healthy">("all");
  const [sort,setSort]=useState<"weighted"|"l5"|"play"|"stars"|"value"|"name">("weighted");
  const [position,setPosition]=useState("all");
  const [msg,setMsg]=useState("");
  const [lastRequest,setLastRequest]=useState<number|null>(null);
  const [undoTeams,setUndoTeams]=useState<WorkspaceTeam[]|null>(null);
  const [strategy,setStrategy]=useState<Strategy>("balanced");
  const [now,setNow]=useState<Date|null>(null);
  useEffect(()=>setNow(new Date()),[]);
  const activeTeam=teams.find(t=>t.id===activeTeamId)??teams[0];
  const slots=sport==="nba"?ARCADE.nba.slots:ARCADE.football.slots;
  const cards:CardInput[]=useMemo(()=>players.map(player=>({player,owned:cardStore[player.id]?.owned===true,
    stars:cardStore[player.id]?.stars??null,bonusPercent:cardStore[player.id]?.bonusPercent??0})),[players,cardStore]);
  const favoriteSet=useMemo(()=>new Set(favorites),[favorites]);
  const byId=useMemo(()=>new Map(players.map(player=>[player.id,player])),[players]);
  const assessment=useMemo(()=>teams.map(team=>({team,result:evaluateManualLineup(team.selection,cards,sport,team.goal??targetScore)})),[teams,cards,sport,targetScore]);
  const currentResult=assessment.find(a=>a.team.id===activeTeamId)?.result??assessment[0]?.result;
  const doctor=useMemo(()=>activeTeam?diagnoseLineup(activeTeam.selection,cards,sport,activeTeam.goal??targetScore,{limit:3}):null,
    [activeTeam,cards,sport,targetScore]);
  const selectedIds=new Set(activeTeam?.selection.filter((id):id is string=>!!id)??[]);
  const activeSlotLabel=activeSlot===null?"Nächsten freien Slot belegen":`Slot ${activeSlot+1}: ${slotNames[slots[activeSlot]]}`;

  useEffect(()=>{
    setLoadedSport(null);setActiveSlot(null);setMsg("");setLastRequest(null);setUndoTeams(null);
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
    setUndoTeams(teams.map(t=>({...t,selection:t.selection.slice()})));
    setTeams(fn);
  };
  const changeTeam=(id:string,fn:(current:WorkspaceTeam)=>WorkspaceTeam)=>changeTeams(old=>old.map(t=>t.id===id?fn(t):t));
  const select=(id:string,slot:number|null=activeSlot,teamId:string=activeTeamId)=>{
    const team=teams.find(t=>t.id===teamId);
    if(!team)return;
    if(cardStore[id]?.excluded){setMsg("Dieser Spieler ist ausgeschlossen. Entferne erst die Sperre in der Spielerliste.");return;}
    const placed=placeInTeam(team.selection,id,cards,sport,slot);
    if(placed.reason){setMsg(placed.reason);return;}
    changeTeam(team.id,old=>({...old,selection:placed.selection}));
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
    changeTeam(id,t=>({...t,selection:[null,null,null,null,null]}));setMsg("Team geleert.");
  };
  const cloneTeam=(id:string)=>{
    if(teams.length>=6){setMsg("Maximal sechs Teams gleichzeitig. Lösche eines, um Platz zu schaffen.");return;}
    const source=teams.find(t=>t.id===id);
    if(!source)return;
    const nextId=`team-${Math.max(...teams.map(t=>Number(t.id.split("-")[1])||0))+1}`;
    changeTeams(old=>[...old,{...source,id:nextId,selection:source.selection.slice(),collapsed:false}]);
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
    const team=teams.find(t=>t.id===id);
    if(!team)return;
    if(team.selection.some(Boolean)&&!window.confirm("Die Spieler dieses Teams durch eine automatisch optimierte Aufstellung ersetzen?"))return;
    const target=team.goal??targetScore;
    const poolCards=cards.filter(c=>pool==="owned"?c.owned:pool==="favorites"?favoriteSet.has(c.player.id):pool==="healthy"?
      c.player.forecastSources.length>0&&c.player.hasGame!==false&&c.player.playProb>=.65:true);
    const result=optimizeArcadeLineups(poolCards,{sport,strategy:strategy==="target"&&!target?"balanced":strategy,
      targetScore:target,ownedOnly:pool==="owned",limit:1,beamWidth:260,maxCandidatesPerSlot:120,
      excludedPlayerIds:Object.keys(cardStore).filter(playerId=>cardStore[playerId]?.excluded),
      lockedPlayerIds:Object.keys(cardStore).filter(playerId=>cardStore[playerId]?.locked)});
    const best=result[0];
    if(!best||best.picks.length!==5){setMsg("Keine vollständige gültige Auto-Aufstellung gefunden. Prüfe Positionen, NBA-Sterne und deine Filter.");return;}
    const assigned=slots.map((slot,i)=>best.picks[i]?.player.id??null);
    const check=evaluateManualLineup(assigned,cards,sport,target);
    if(!check.valid){setMsg("Die berechnete Aufstellung hat eine Regelprüfung nicht bestanden und wurde nicht übernommen.");return;}
    changeTeam(id,t=>({...t,selection:assigned}));setActiveTeamId(id);
    setMsg(`Team automatisch befüllt: ${fmt(check.projectedScore)} prognostizierte Punkte. Kartenbesitz und Gameweek-Regeln prüfen.`);
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
      if(horizon!==null&&now&&!withinHorizon(gameDate(p),horizon,now))return false;
      if(activeSlot!==null&&!slotAccepts(slots[activeSlot],p.position))return false;
      return true;
    }).sort((a,b)=>{
      const weight=(p:Forecast)=>({weighted:p.weighted,l5:p.last5Avg??-1,play:p.playProb*100,
        stars:cardStore[p.id]?.stars??-1,value:isValidNbaStars(cardStore[p.id]?.stars)?p.weighted/cardStore[p.id]!.stars!:0,
        name:0})[sort];
      return sort==="name"?a.name.localeCompare(b.name,"de"):(weight(b)-weight(a)||a.name.localeCompare(b.name,"de"));
    });
  },[players,query,position,pool,cardStore,favoriteSet,horizon,now,activeSlot,slots,sort]);
  const [showCount,setShowCount]=useState(80);
  useEffect(()=>setShowCount(80),[sport,query,position,pool,horizon,sort,activeSlot]);
  const poolCount=players.length;
  return <div className="workspace-v23" aria-label="V2.3 Builder Workspace">
    <header className="v23-toolbar">
      <div className="v23-toolbar-brand"><span className="v23-mark">M<span>★</span></span><span><strong>BUILDER WORKSPACE</strong><small>{sport==="nba"?"NBA · OFFIZIELLE SORARE-STERNE":"FOOTBALL · 5 POSITIONEN"} / V2.3</small></span></div>
      <label>Zeithorizont<select value={horizon===null?"all":horizon} onChange={e=>setHorizon(e.target.value==="all"?null:Number(e.target.value))}>
        <option value="all">Alle bekannten Spiele</option><option value="24">≈ Nächste 24 Std.*</option><option value="72">Nächste 3 Tage*</option><option value="168">Nächste 7 Tage*</option>
      </select></label>
      <label>Spielerpool<select value={pool} onChange={e=>setPool(e.target.value as typeof pool)}><option value="all">Alle Spieler</option><option value="owned">Meine Karten</option><option value="favorites">Watchlist</option><option value="healthy">Gute Datenlage</option></select></label>
      <label>Optimierung<select value={strategy} onChange={e=>setStrategy(e.target.value as Strategy)}><option value="balanced">Ausgewogen</option><option value="safe">Sicher</option><option value="upside">Offensiv</option><option value="target" disabled={targetScore===null&&!teams.some(t=>t.goal!==null)}>Arcade-Ziel</option></select></label>
      <div className="v23-toolbar-actions"><button type="button" onClick={()=>autoFill(activeTeamId)} title="Aktives Team automatisch befüllen">✦ Auto-Builder</button><button type="button" onClick={()=>cloneTeam(activeTeamId)} title="Aktives Team kopieren">⧉ Team kopieren</button><button type="button" onClick={()=>{if(undoTeams){setTeams(undoTeams);setUndoTeams(null);setMsg("Letzte Teamänderung rückgängig gemacht.");}}} disabled={!undoTeams} title="Letzte Teamänderung rückgängig machen">↶ Undo</button></div>
    </header>
    <div className="v23-subbar"><span className="v23-live-dot"/> <strong>{teams.length} Teams</strong><span>{poolCount} geladene Spieler</span><span className="v23-target-label">Aktives Team <b>{activeTeamId.replace("team-", "#")}</b> · {activeSlotLabel}</span><span className="v23-tiny-muted">* Nur Spiele mit bekanntem Datum; Uhrzeit unbekannt</span></div>
    {msg&&<div className="v23-message" role="status">{msg}<button type="button" onClick={()=>setMsg("")} aria-label="Hinweis schließen">×</button></div>}
    <div className="v23-layout">
      <div className="v23-team-column" aria-label="Meine Teams">
        {assessment.map(({team,result},teamIndex)=>{
          const active=team.id===activeTeamId;
          const d=active?doctor:null;
          return <section key={team.id} className={`v23-team ${active?"is-current":""}`} aria-label={`Team ${teamIndex+1}`}>
            <div className="v23-team-top">
              <button type="button" className="v23-collapse" onClick={()=>changeTeam(team.id,t=>({...t,collapsed:!t.collapsed}))} aria-label={`Team ${teamIndex+1} ${team.collapsed?"ausklappen":"einklappen"}`}>{team.collapsed?"▸":"⌄"}</button>
              <button type="button" className="v23-team-name" onClick={()=>{setActiveTeamId(team.id);setActiveSlot(null);}}>TEAM {teamIndex+1}</button>
              <span className={`v23-team-state ${result.valid?"good":result.errors.length?"bad":"idle"}`} title={result.errors.join(" · ")||"Noch nicht vollständig"}>{result.valid?"✓ Gültig":result.errors.length?"! Prüfen":`${result.picks.length}/5`}</span>
              <div className="v23-team-score"><span>{sport==="nba"?"STERNE":"PS"}<b className={sport==="nba"&&result.starsUsed>16?"danger":""}>{sport==="nba"?fmt(result.starsUsed):short(result.projectedScore)}</b></span><span>PROG.<b>{fmt(result.projectedScore)}</b></span><label>ZIEL<input type="number" min="1" max="10000" placeholder={targetScore===null?"—":String(targetScore)} value={team.goal??""} aria-label={`Zielscore Team ${teamIndex+1}`} onChange={e=>changeTeam(team.id,t=>({...t,goal:e.target.value?Math.max(1,Math.min(10000,Number(e.target.value))):null}))}/></label></div>
              <div className="v23-team-tools"><button type="button" onClick={()=>autoFill(team.id)} title="Auto-Builder für Team">✦</button><button type="button" onClick={()=>cloneTeam(team.id)} title="Team duplizieren">⧉</button><button type="button" onClick={()=>void copyTeam(team.id)} title="Team kopieren">▣</button><button type="button" onClick={()=>clearTeam(team.id)} title="Team leeren">⌫</button>{teams.length>1&&<button type="button" onClick={()=>removeTeam(team.id)} title="Team löschen">×</button>}</div>
            </div>
            {!team.collapsed&&<>
              <div className="v23-card-row">
                {slots.map((slot,index)=>{
                  const pick=result.slots[index];const player=pick?.player??byId.get(team.selection[index]??"");
                  const isSelected=active&&activeSlot===index;
                  return <article key={`${slot}-${index}`} className={`v23-card ${player?"filled":"empty"} ${isSelected?"focused":""}`}>
                    <div className="v23-card-top"><span>{sport==="nba"?`#${index+1}`:({GK:"TW",DEF:"VER",MID:"MF",FWD:"ST",FLEX:"EX"} as Record<string,string>)[slot]}</span><div><button type="button" aria-label={`Slot ${index+1} wählen`} onClick={()=>{setActiveTeamId(team.id);setActiveSlot(index);setMsg("");}}>✎</button>{player&&<><button type="button" title={cardStore[player.id]?.excluded?"Spieler freigeben":"Spieler für den Auto-Builder sperren"} aria-label={`${player.name} für Auto-Builder ${cardStore[player.id]?.excluded?"freigeben":"sperren"}`} onClick={()=>{updateCard(player.id,{excluded:!cardStore[player.id]?.excluded,locked:false});setMsg("Auto-Builder-Sperre aktualisiert. Der Spieler bleibt in diesem manuellen Team, bis du ihn entfernst.");}}>⊘</button><button type="button" aria-label={`${player.name} entfernen`} onClick={()=>changeTeam(team.id,t=>({...t,selection:t.selection.map((id,i)=>i===index?null:id)}))}>−</button></>}</div></div>
                    {player?<>
                      <button type="button" className="v23-portrait" onClick={()=>onOpenProfile(player.id)} title={`${player.name} Profil öffnen`}><Avatar player={player}/></button>
                      <button type="button" className="v23-player-name" onClick={()=>onOpenProfile(player.id)} title={player.name}>{player.name}</button>
                      <span className="v23-role">{positionNames[player.position]??player.position}</span>
                      <div className="v23-mini-grid">
                        {sport==="nba"?<><MiniStat label="L5" value={player.last5Avg===null?"—":short(player.last5Avg)}/><MiniStat label="Ø" value={player.avg===null?"—":short(player.avg)}/><MiniStat label="★" value={isValidNbaStars(cardStore[player.id]?.stars)?fmt(cardStore[player.id]!.stars!):"—"}/></>
                          :<><MiniStat label="Einsatz*" value={`${short(player.playProb*100)}%`} tone={player.playProb<.65?"warn":"good"}/><MiniStat label="L5" value={player.last5Avg===null?"—":short(player.last5Avg)}/><MiniStat label="Bonus" value={`+${pick?.bonusPercent??0}%`}/></>}
                      </div>
                      <div className="v23-mini-grid second"><MiniStat label="Prognose" value={pick?fmt(pick.projectedScore):"—"}/><MiniStat label="Floor" value={pick?fmt(pick.floorScore):"—"}/><MiniStat label="Ceiling" value={pick?fmt(pick.ceilingScore):"—"}/></div>
                      <div className="v23-card-match"><strong>{player.opponent?`vs ${player.opponent}`:player.team}</strong><small>{gameDate(player)?gameDate(player)!.toLocaleDateString("de-DE"):"Termin unbekannt"}{player.hasGame===false?" · kein Spiel gemeldet":""}</small></div>
                    </>:<button type="button" className="v23-card-empty-content" onClick={()=>{setActiveTeamId(team.id);setActiveSlot(index);setMsg("");}}><span className="v23-plus-ring">+</span><strong>{team.selection[index]?"Spieler nicht geladen":sport==="nba"?"Karte wählen":slotNames[slot]}</strong><small>{team.selection[index]?"Team oder Liga prüfen":"Spieler rechts auswählen"}</small></button>}
                  </article>;
                })}
              </div>
              <footer className="v23-team-footer"><span><b>{result.picks.length}/5</b> Spieler</span><span>Floor <b>{fmt(result.floorScore)}</b></span><span>Ceiling <b>{fmt(result.ceilingScore)}</b></span>{sport==="nba"&&<span>Budget <b className={result.starsUsed>16?"v23-danger":""}>{fmt(result.starsUsed)}/16 ★</b></span>}<span>Zielchance* <b>{result.targetProbability===null?"—":`${short(result.targetProbability*100)} %`}</b></span></footer>
              {active&&result.errors.length>0&&<p className="v23-team-alert">{result.errors.slice(0,2).join(" · ")}</p>}
              {active&&d&&d.issues.length>0&&<details className="v23-doctor"><summary>✦ Lineup Doctor · {d.issues.length} Hinweise</summary><div>{d.issues.slice(0,4).map(item=><p key={item.id}><b>{item.title}</b> – {item.description}</p>)}</div></details>}
              {active&&d&&d.swaps.length>0&&<details className="v23-doctor v23-doctor-swaps"><summary>✦ Lineup Doctor · {d.swaps.length} geprüfte Wechselideen</summary><div>{d.swaps.map(swap=><div className="v23-swap" key={`${swap.slotIndex}-${swap.toId}`}><span><b>{swap.fromName}</b> → <b>{swap.toName}</b><small>{swap.kind==="safer"?"Weniger Modellrisiko":swap.kind==="repair"?"Regelreparatur":"Höhere Prognose"} · {swap.delta>=0?"+":""}{fmt(swap.delta)} Punkte</small></span><button type="button" onClick={()=>select(swap.toId,swap.slotIndex,team.id)}>Wechsel übernehmen</button></div>)}</div></details>}
            </>}
          </section>;
        })}
        <button type="button" className="v23-add-team" onClick={()=>{
          if(teams.length>=6){setMsg("Maximal 6 Teams.");return;}
          const nextId=`team-${Math.max(...teams.map(t=>Number(t.id.split("-")[1])||0))+1}`;
          changeTeams(old=>[...old,{id:nextId,selection:[null,null,null,null,null],goal:null,collapsed:false}]);setActiveTeamId(nextId);
        }} disabled={teams.length>=6}>+ Neues Team hinzufügen <span>{teams.length} / 6</span></button>
        <div className="v23-team-note">Autospeicherung auf diesem Gerät · Alte V2.2-Aufstellungen werden beim ersten Öffnen übernommen. Kartenbesitz ist weiterhin manuell zu prüfen.</div>
      </div>
      <section className="v23-pool" aria-label="Spielerpool und Suche">
        <div className="v23-pool-head"><div><span className="v23-kicker">PLAYER DATABASE / SCOUTING</span><h3>Spielerpool <small>{sortedPlayers.length.toLocaleString("de-DE")} Treffer</small></h3></div><span className="v23-active-team-chip">◉ Team {teams.findIndex(t=>t.id===activeTeamId)+1} aktiv</span></div>
        <div className="v23-pool-filters"><input type="search" aria-label="Spieler oder Team suchen" placeholder="⌕  Spieler / Team / Gegner suchen …" value={query} onChange={e=>setQuery(e.target.value)}/>
          <select aria-label="Position filtern" value={position} onChange={e=>setPosition(e.target.value)}><option value="all">Alle Positionen</option>{(sport==="nba"?["G","F","C"]:["GK","DEF","MID","FWD"]).map(pos=><option key={pos} value={pos}>{positionNames[pos]}</option>)}</select>
          <select aria-label="Spieler sortieren" value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="weighted">Prognose ↓</option><option value="l5">L5 ↓</option><option value="play">Einsatzchance ↓</option>{sport==="nba"&&<><option value="stars">Sterne ↓</option><option value="value">Prognose / Stern ↓</option></>}<option value="name">Name A–Z</option></select>
          {activeSlot!==null&&<button type="button" className="v23-clear-slot" onClick={()=>setActiveSlot(null)}>Slotfilter ×</button>}
        </div>
        <div className="v23-table-scroll"><table className="v23-roster-table"><thead><tr><th>Aktion</th><th>Datum</th><th>Spieler / Team</th><th>Form (letzte Scores)</th><th>Einsatz*</th><th>L5</th><th>L10</th><th>Prognose</th><th>Floor</th><th>Ceiling</th>{sport==="nba"?<><th>Sterne</th><th>Wert/★</th></>:<th>Bonus</th>}<th>Karte</th></tr></thead>
          <tbody>{sortedPlayers.slice(0,showCount).map(p=>{
            const card=cardStore[p.id]??{};
            const stars=isValidNbaStars(card.stars)?card.stars:null;
            const selected=selectedIds.has(p.id);
            const date=gameDate(p);
            return <tr key={p.id} className={selected?"v23-roster-picked":""}>
              <td><div className="v23-row-actions"><button type="button" title={`Zu Team ${teams.findIndex(t=>t.id===activeTeamId)+1} hinzufügen`} aria-label={`${p.name} zum Team hinzufügen`} onClick={()=>select(p.id)} disabled={selected||card.excluded===true}>+</button><button type="button" title="Für den Optimizer ausschließen" aria-label={`${p.name} ${card.excluded?"freigeben":"ausschließen"}`} aria-pressed={card.excluded===true} className={card.excluded?"is-blocked":""} onClick={()=>updateCard(p.id,{excluded:!card.excluded,locked:false})}>⊘</button></div></td>
              <td className="v23-date">{date?date.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit"}):"—"}<small>{date?"Datum bekannt":"Nicht verfügbar"}</small></td>
              <td><div className="v23-roster-person"><button type="button" className="v23-roster-avatar" onClick={()=>onOpenProfile(p.id)}><Avatar player={p}/></button><div><button type="button" className="v23-roster-name" onClick={()=>onOpenProfile(p.id)}>{p.name}</button><small>{p.team} · {p.position} {p.opponent?`· vs ${p.opponent}`:""}</small><button type="button" className={`v23-inline-fav ${favoriteSet.has(p.id)?"is-on":""}`} onClick={()=>onToggleFavorite(p.id)}>{favoriteSet.has(p.id)?"★ Auf Watchlist":"☆ Merken"}</button></div></div></td>
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
        <div className="v23-pool-foot"><span>Die angezeigte Einsatzwahrscheinlichkeit, Floor/Ceiling und Zielchance sind <b>Modellschätzungen</b>, keine offiziellen Sorare-Werte. Datum ohne verlässliche Uhrzeit.</span><button type="button" onClick={()=>{
          if(!currentResult?.picks.length){setMsg("Zum Speichern zuerst Spieler auswählen.");return;}
          onSavePredictions(currentResult.picks.map(p=>p.player));setMsg("Prognosen des aktiven Teams im Forecast Lab gespeichert.");
        }}>Prognosen sichern ↗</button></div>
      </section>
    </div>
  </div>;
}

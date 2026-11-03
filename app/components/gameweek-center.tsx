"use client";

import {useEffect,useMemo,useState} from "react";
import type {Forecast,Sport} from "@/lib/model";
import {canonicalNbaTeam} from "@/lib/nba-fixture-mapping";
import {arcadeBoardKey,cardsSummary,filteredFixtures,freshArcadeBoard,
  readArcadeBoard,recordArcadeOutcome,setBoardTarget,undoArcadeOutcome,
  upcomingFootballFixtures,type ArcadeBoard,type ScheduleData,type UpcomingFixture} from "@/lib/gameweek-center";

type CardRecord=Record<string,{owned?:boolean;stars?:number|null;bonusPercent?:number}>;
type Props={sport:Sport;players:Forecast[];cardStore:CardRecord;nbaSchedule:ScheduleData;
  currentTarget:number|null;onApplyTarget:(target:number)=>void;
  onOpenPlayer:(id:string)=>void;onAddPlayer:(id:string)=>void;onExploreTeam:(team:string)=>void};

const clock=(stamp?:string)=>stamp?new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit"}).format(new Date(stamp)):null;
const number=(v:number)=>v.toLocaleString("de-DE",{maximumFractionDigits:1});
function dayLabel(day:string) {
  const d=new Date(`${day}T12:00:00Z`);
  return Number.isNaN(d.getTime())?day:new Intl.DateTimeFormat("de-DE",{weekday:"short",day:"2-digit",month:"short",timeZone:"UTC"}).format(d);
}
function Avatar({p}:{p:Forecast}) {
  const [broken,setBroken]=useState(false);
  useEffect(()=>setBroken(false),[p.imageUrl]);
  return p.imageUrl&&!broken
    ? <img className="gw-player-image" alt={`Foto von ${p.name}`} src={p.imageUrl} referrerPolicy="no-referrer" loading="lazy" onError={()=>setBroken(true)}/>
    : <span className="gw-player-image gw-player-fallback">{p.name.slice(0,2).toUpperCase()}</span>;
}

export default function GameweekCenter({sport,players,cardStore,nbaSchedule,currentTarget,onApplyTarget,
  onOpenPlayer,onAddPlayer,onExploreTeam}:Props) {
  const [today,setToday]=useState("");
  const [days,setDays]=useState<3|7|14>(7);
  const [board,setBoard]=useState<ArcadeBoard>(()=>freshArcadeBoard(sport));
  const [loaded,setLoaded]=useState<Sport|null>(null);
  const [goalDraft,setGoalDraft]=useState("");
  const [message,setMessage]=useState("");
  const [selectedGame,setSelectedGame]=useState<string|null>(null);
  useEffect(()=>{
    setToday(new Date().toLocaleDateString("sv-SE"));
    setSelectedGame(null);setLoaded(null);setMessage("");
    let next=freshArcadeBoard(sport);
    try {const raw=window.localStorage.getItem(arcadeBoardKey(sport));if(raw)next=readArcadeBoard(JSON.parse(raw),sport);}catch{/* corrupted storage: retain safe default */}
    setBoard(next);setGoalDraft(next.target===null?"":String(next.target));setLoaded(sport);
  },[sport]);
  useEffect(()=>{
    if(loaded!==sport)return;
    try{window.localStorage.setItem(arcadeBoardKey(sport),JSON.stringify(board));}catch{/* unavailable browser storage */}
  },[sport,loaded,board]);
  const fixtureList=useMemo(()=>sport==="football"
    ? upcomingFootballFixtures(players,today,14)
    : nbaSchedule.fixtures,[sport,players,today,nbaSchedule.fixtures]);
  const visibleFixtures=useMemo(()=>filteredFixtures(fixtureList,today,days),[fixtureList,today,days]);
  const dateGroups=useMemo(()=>{
    const groups=new Map<string,UpcomingFixture[]>();
    for(const fixture of visibleFixtures)groups.set(fixture.date,[...(groups.get(fixture.date)??[]),fixture]);
    return [...groups.entries()];
  },[visibleFixtures]);
  const selected=fixtureList.find(f=>f.id===selectedGame)??null;
  const eligibleForGame=useMemo(()=>selected ? players.filter(p=>{
      const same=sport==="nba" ? [selected.home,selected.away].some(name=>canonicalNbaTeam(name)!==null&&canonicalNbaTeam(p.team)===canonicalNbaTeam(name))
        : p.team===selected.home||p.team===selected.away;
      return same&&p.hasGame!==false;
    })
    .sort((a,b)=>b.weighted-a.weighted).slice(0,5):[],[players,selected,sport]);
  const summary=useMemo(()=>cardsSummary(cardStore,sport,new Set(players.map(p=>p.id))),[cardStore,sport,players]);
  const validGoal=goalDraft.trim()!==""&&Number.isInteger(Number(goalDraft))&&Number(goalDraft)>0&&Number(goalDraft)<=10000;
  const editGoal=()=>{
    if(!validGoal){setMessage("Bitte ein gültiges Score-Ziel zwischen 1 und 10.000 eingeben.");return;}
    setBoard(old=>setBoardTarget(old,Number(goalDraft)));setMessage("Score-Ziel für dein persönliches Board gespeichert.");
  };
  const outcome=(result:"success"|"miss")=>{
    setBoard(old=>recordArcadeOutcome(old,result,new Date().toISOString()));
    setMessage(result==="success"?"Erfolg notiert: nächstes Level freigeschaltet. Bitte neues Score-Ziel prüfen.":
      board.lives===1?"Letztes Leben verbraucht: Level auf 1 zurückgesetzt. Eintrag kann rückgängig gemacht werden.":"Fehlversuch notiert: ein Leben abgezogen.");
  };
  return <section className="panel gw-center" id="gameweek-center" aria-labelledby="gw-title">
    <div className="gw-heading">
      <div><span className="section-kicker">02 / GAMEWEEK &amp; ARCADE CENTER</span>
        <h2 id="gw-title">Dein Command Center.</h2>
        <p>Spiele im Blick. Dein Arcade-Fortschritt. Deine Karten. Alles an einem Ort.</p></div>
      <span className="gw-version">V2.0 <span>◆</span> BOARD CONTROL</span>
    </div>
    <div className="gw-top-stats">
      <div><small>KOMMENDE PARTIEN</small><strong>{visibleFixtures.length}</strong><span>Nächste {days} Tage · geladener Bereich</span></div>
      <div><small>MEINE KARTEN</small><strong>{summary.owned}</strong><span>Im aktuellen Datensatz markiert</span></div>
      <div><small>DEIN ARCADE-LEVEL</small><strong>{board.level.toString().padStart(2,"0")}</strong><span>Persönlich gepflegt, kein Sorare-Sync</span></div>
      <div><small>SCORE-ZIEL</small><strong>{board.target===null?"—":number(board.target)}</strong><span>Frei konfigurierbar</span></div>
    </div>
    <div className="gw-columns">
      <div className="gw-column-main">
        <div className="gw-card gw-calendar">
          <div className="gw-card-header"><div><span className="gw-mini-label">MATCH CALENDAR</span><h3>Die nächsten Begegnungen</h3></div>
            <div className="gw-filter" role="group" aria-label="Spielplan-Zeitraum">
              {([3,7,14] as const).map(d=><button type="button" key={d} className={days===d?"is-active":""} aria-pressed={days===d} onClick={()=>{setDays(d);setSelectedGame(null);}}>{d}T</button>)}
            </div>
          </div>
          <p className="gw-source">{sport==="football"
            ? "Quelle: bereits geladene Sorare-Fixtures. Ohne bekannte Anstoßzeit zeigen wir nur das Datum."
            : nbaSchedule.status==="available" ? `Quelle: ${nbaSchedule.source??"Spielplan"}. Angezeigte NBA-Uhrzeiten sind deutsche Ortszeit (MEZ/MESZ).`
              : nbaSchedule.note??"Der NBA-Spielplan ist aktuell nicht verfügbar."}</p>
          {dateGroups.length>0?<div className="gw-schedule" aria-label="Kommende Spiele">
            {dateGroups.map(([date,fixtures])=><div className="gw-date-group" key={date}>
              <div className="gw-date-label"><span>{dayLabel(date)}</span><small>{fixtures.length} {fixtures.length===1?"Spiel":"Spiele"}</small></div>
              {fixtures.map(f=><button type="button" className={`gw-fixture ${selectedGame===f.id?"is-selected":""}`} key={f.id}
                aria-pressed={selectedGame===f.id} onClick={()=>setSelectedGame(selectedGame===f.id?null:f.id)}>
                <span className="gw-fixture-icon">{sport==="nba"?"◉":"⚽"}</span>
                <span className="gw-fixture-teams"><strong>{f.home}</strong><small>vs</small><strong>{f.away}</strong></span>
                <span className="gw-fixture-side">{clock(f.tipoff)?`${clock(f.tipoff)} Uhr · `:""}{f.playerIds.length?`${f.playerIds.length} Spieler`:"Details"} <span aria-hidden="true">›</span></span>
              </button>)}
            </div>)}
          </div>:<div className="gw-empty"><span aria-hidden="true">◇</span><strong>Keine bestätigten Begegnungen im geladenen Zeitraum</strong><p>{sport==="football"?
            "Die Sorare-API hat für diese Auswahl keine vollständigen kommenden Spielpaarungen geliefert. Wähle oben „Alle 4 Ligen“, um mehr Vereine zu laden. Es werden keine Termine erfunden.":
            nbaSchedule.status==="available"?"Der Kalenderfeed meldet für diesen Zeitraum keine kommenden NBA-Spiele. Prüfe den Zeitraum oder aktualisiere später erneut.":nbaSchedule.note??"NBA-Spielplan derzeit nicht verfügbar. Scores bleiben unabhängig."}</p></div>}
          {selected&&<div className="gw-game-detail"><div className="gw-game-detail-head"><div><span className="gw-mini-label">MATCHUP FOCUS</span><h4>{selected.home} – {selected.away}</h4><small>{dayLabel(selected.date)}{clock(selected.tipoff)?` · ${clock(selected.tipoff)} Uhr`:""} · {selected.source}</small></div><button type="button" className="gw-close" onClick={()=>setSelectedGame(null)} aria-label="Spieldetails schließen">×</button></div>
            {eligibleForGame.length?<div className="gw-game-players">{eligibleForGame.map(p=><div className="gw-game-player" key={p.id}>
              <Avatar p={p}/><button type="button" className="gw-game-name" onClick={()=>onOpenPlayer(p.id)}><strong>{p.name}</strong><span>{p.team} · {p.weighted>0?`${number(p.weighted)} Pkt. erwartet`:"Keine gültige Prognose"}</span></button>
              <button type="button" className="gw-mini-add" aria-label={`${p.name} ins Lineup aufnehmen`} onClick={()=>onAddPlayer(p.id)}>+</button>
            </div>)}</div>:<p className="gw-source">Im aktuell geladenen Kaderbereich sind diesen Teams keine Spieler eindeutig zugeordnet. Wähle gegebenenfalls „Alle Teams“.</p>}
            <div className="gw-detail-actions"><button type="button" onClick={()=>onExploreTeam(selected.home)}>Heimteam im Explorer</button><button type="button" onClick={()=>onExploreTeam(selected.away)}>Auswärtsteam im Explorer</button></div>
          </div>}
        </div>
        <div className="gw-card gw-collection">
          <div className="gw-card-header"><div><span className="gw-mini-label">COLLECTION PULSE</span><h3>Deine Karten – auf einen Blick</h3></div><span className="gw-collection-glyph">◈</span></div>
          <div className="gw-collection-stats"><div><strong>{summary.owned}</strong><small>Markierte Karten</small></div><div><strong>{summary.withBonus}</strong><small>Mit Kartenbonus</small></div><div><strong>{sport==="nba"?summary.missingStars:"5"}</strong><small>{sport==="nba"?"Sternwerte fehlen":"Positionen im Lineup"}</small></div></div>
          {sport==="nba"&&summary.missingStars>0&&<p className="gw-collection-warning">{summary.missingStars} deiner markierten NBA-Karten haben noch keinen gültigen offiziellen oder manuellen Sternwert. Der 16-Sterne-Optimizer kann sie bis dahin nicht berücksichtigen.</p>}
          <p className="gw-source">NBA-Sterne stammen wenn verfügbar aus dem separaten Sorare-Sync, sonst aus deinen lokalen Einträgen. Kartenbesitz und Boni bleiben manuell; kein automatischer Kartensync.</p>
          <div className="gw-actions"><a href="#spieler">Karten im Explorer verwalten <span>↗</span></a><a href="#lineup-builder">Zum Lineup Studio <span>↗</span></a></div>
        </div>
      </div>
      <aside className="gw-card gw-board">
        <div className="gw-card-header"><div><span className="gw-mini-label">ARCADE BOARD / DEIN FORTSCHRITT</span><h3>Road to the next level</h3></div><span className="gw-level-mark">LVL {board.level}</span></div>
        <div className="gw-level-hero"><span>NÄCHSTES ZIEL</span><strong>{board.target===null?"—":number(board.target)} <small>PKT.</small></strong><p>{board.completed} erfolgreiche Levels · {board.attempts} Versuche dokumentiert</p></div>
        <div className="gw-lives-head"><strong>Verbleibende Leben</strong><span>{board.lives} / {board.maxLives}</span></div>
        <div className="gw-lives" aria-label={`${board.lives} von ${board.maxLives} Leben verfügbar`}>{Array.from({length:board.maxLives},(_,i)=><span className={i<board.lives?"active":""} key={i} aria-hidden="true">♥</span>)}</div>
        <div className="gw-goal-edit"><label htmlFor="gw-goal">Score-Ziel für dieses Board</label>
          <div><input id="gw-goal" type="number" min="1" max="10000" step="1" value={goalDraft} placeholder="Zielpunkte" onChange={e=>setGoalDraft(e.target.value)}/><button type="button" disabled={!validGoal} onClick={editGoal}>Speichern</button></div></div>
        <button type="button" className="gw-primary" disabled={board.target===null} onClick={()=>{if(board.target!==null){onApplyTarget(board.target);setMessage("Score-Ziel in den Lineup Builder übernommen.");}}}>Ziel im Lineup Builder verwenden <span>↗</span></button>
        <div className="gw-board-actions"><button type="button" className="gw-success" onClick={()=>outcome("success")}>✓ Erfolg vermerken</button><button type="button" className="gw-miss" onClick={()=>outcome("miss")}>– Fehlversuch</button></div>
        <div className="gw-board-footer"><button type="button" disabled={!board.history.length} onClick={()=>{setBoard(old=>undoArcadeOutcome(old));setMessage("Letzte Ergebnis-Eingabe rückgängig gemacht.");}}>↶ Letzte Eingabe rückgängig</button><span>Nur in deinem Browser</span></div>
        {message&&<p className="gw-message" role="status">{message}</p>}
        {board.history.length>0&&<div className="gw-history"><span className="gw-mini-label">LETZTE EINTRÄGE</span>{board.history.slice(-3).reverse().map((e,i)=><div key={`${e.at}-${i}`}><span>{e.result==="success"?"✓":"–"} Level {e.levelBefore}</span><small>{e.result==="success"?"Erfolg":"Fehlversuch"}</small></div>)}</div>}
        <p className="gw-board-note"><strong>Hinweis:</strong> Das ist dein persönlicher Arcade-Tracker, keine Verbindung zu Sorare-Levels. Für Fußball sind vier Leben je Level üblich. Score-Ziele und Sonderregeln bitte anhand deines aktuellen Boards kontrollieren. NBA-Regeln werden hier nicht als offiziell bestätigt ausgegeben.</p>
      </aside>
    </div>
  </section>;
}

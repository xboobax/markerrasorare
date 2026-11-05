"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {collectionKey,safeCollection,activeCollectionCards} from '@/lib/my-collection';
import type {FootballLeagueKey,FootballLiveGame,FootballLiveGameDetail,FootballLivePlayer,FootballScoreEstimate} from '@/lib/football-live-core';
import {FOOTBALL_COMPETITIONS,footballCompetitionGroup,isFootballCompetitionFilter,isNationalFootballLeague,type FootballCompetitionFilter,type FootballCompetitionGroup} from '@/lib/football-competitions';
import {SORARE_AA_MATRIX} from '@/lib/sorare-football-scoring';
import {footballFormationLayout,footballDisplayedMinutes} from '@/lib/football-live-formation';
import {matchSorarePlayer,type OfficialFootballPlayerScore,type OfficialFootballPlayerPhoto} from '@/lib/football-live-sorare';
const todayBerlin=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const shift=(day:string,n:number)=>new Date(Date.parse(day+'T12:00:00Z')+86400000*n).toISOString().slice(0,10);
const fmt=(n:number|null,decimals=1)=>n===null?'–':n.toLocaleString('de-DE',{maximumFractionDigits:decimals,minimumFractionDigits:decimals});
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const short=(s:string)=>s.split(' ').slice(-1)[0];
const time=(s:string)=>new Date(s).toLocaleTimeString('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit'});
const GROUPS:{key:FootballCompetitionGroup;label:string}[]=[{key:'clubs',label:'Alle Clubspiele'},{key:'leagues',label:'Ligen'},{key:'europe',label:'Europapokal'},{key:'international',label:'Länderspiele'}];
const posRank=(raw:string|null)=>{const p=(raw||'').toUpperCase();if(/^GK|GOAL/.test(p))return 1;if(/^(DEF|D|CB|LB|RB|WB)/.test(p))return 2;if(/^(MID|M|DM|CM|AM)/.test(p))return 3;if(/^(FWD|F|ST|ATT|W)/.test(p))return 4;return 5;};
const gameLabel=(g:FootballLiveGame)=>g.status==='live'?`${g.statusText}${g.clock?' · '+g.clock:''}`:g.status==='final'?'FINAL':g.status==='delayed'?'Unterbrochen / verschoben':time(g.date);
function TeamLogo({url,abbr}:{url:string|null;abbr:string}){return <span className="live-logo">{url?<img src={url} alt="" loading="lazy"/>:abbr.slice(0,3)}</span>}
function Avatar({url,name,fallbackUrl}:{url:string|null;name:string;fallbackUrl?:string|null}){
  const [src,setSrc]=useState<string|null>(url);
  useEffect(()=>{setSrc(url)},[url]);
  const broken=()=>setSrc(old=>old===url&&fallbackUrl&&fallbackUrl!==url?fallbackUrl:null);
  return <span className="live-avatar"><span className="live-avatar-fallback">{name.slice(0,1).toUpperCase()}</span>{src&&<img src={src} alt="" loading="lazy" decoding="async" onError={broken}/>}</span>;
}
async function read<T>(path:string,signal:AbortSignal):Promise<T>{const r=await fetch(path,{signal,cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error||`HTTP ${r.status}`);return data as T}
const matrixLabel:Record<string,string>={
  yellowCards:'Gelbe Karten',foulsCommitted:'Fouls',wasFouled:'Gefoult worden',errorLeadsToShot:'Fehler vor Schuss',
  cleanSheetDefender:'Clean Sheet (DEF)',goalsConceded:'Gegentore',effectiveClearances:'Effektive Klärungen',
  wonTackles:'Gewonnene Tackles',blockedCrosses:'Blockierte Flanken',outfieldBlocks:'Blocks',
  possessionLost:'Ballverluste',possessionWon:'Ballgewinne',duelsLost:'Verlorene Duelle',duelsWon:'Gewonnene Duelle',
  interceptionsWon:'Interceptions',bigChancesCreated:'Großchancen kreiert',attemptedAssists:'Assist-Versuche',
  accuratePasses:'Erfolgreiche Pässe',finalThirdPasses:'Pässe ins letzte Drittel',
  accurateLongBalls:'Erfolgreiche lange Bälle',longPassesIntoOpposition:'Lange Bälle in Gegnerhälfte',
  missedPasses:'Fehlpässe',shotsOnTarget:'Schüsse aufs Tor',wonContests:'Gewonnene Dribblings',
  penaltyAreaEntries:'Strafraumaktionen',missedPenalties:'Elfmeter verschossen',bigChancesMissed:'Großchance vergeben',
  saves:'Paraden',savesInBox:'Paraden im Strafraum',goodHighClaims:'Hohe Bälle gesichert',punches:'Faustabwehren',
  diveSaves:'Flugparaden',diveCatches:'Gefangene Flugbälle',crossesNotClaimed:'Flanke nicht gesichert',
  sixSecondViolations:'Torwart-Zeitspiel',gkSmothers:'Torwart rettet Ball',accurateKeeperSweepers:'Sweeper-Aktionen',
  penaltiesWonScoredAA:'Elfmeter herausgeholt (verwandelt)'
};
function FootballStatBreakdown({score}:{score:FootballScoreEstimate|null}){
  if(!score)return <p className="live-muted">Noch keine auswertbaren Live-Ereignisse verfügbar.</p>;
  return <div className="live-stat-inspection">
    <p className="live-hint">AA aus bekannten Quellenwerten: <strong>{fmt(score.observedAllAround)}</strong> ·
      Bewertete Felder: {score.knownAA} / {score.requiredAA}. Kein offizieller Gesamt-Score bei unvollständigen Daten.</p>
    <div className="live-breakdown">{score.contributions.filter(c=>c.value!==0).map(c=><div key={c.key}><span>{matrixLabel[c.key]??c.key}</span><b>{c.value}</b><small>{c.weight>0?'+':''}{fmt(c.points)}</small></div>)}
      {score.multiBonus!==null&&score.multiBonus>0&&<div><span>Double-/Triple-Stat-Bonus</span><b>1</b><small>+{fmt(score.multiBonus)}</small></div>}
      {!score.contributions.some(c=>c.value!==0)&&!(score.multiBonus!==null&&score.multiBonus>0)&&<p className="live-muted">Noch keine bewertbaren Einzelaktionen gemeldet.</p>}</div>
    <details><summary>Fehlende Daten ({score.missingAA.length} AA · {score.missingDecisive.length} DS)</summary>
      <p className="live-caption">{[...score.missingAA,...score.missingDecisive].map(k=>matrixLabel[k]||k).join(' · ')||'Alle Felder vorhanden (noch nicht mit Sorare abgeglichen).'}</p></details>
  </div>;
}
function ScoringRules(){return <details className="live-scoring-rules"><summary>Offizielle Standard-Scoringmatrix · Positionen & Punktewerte</summary><div className="live-roster-scroll">
  <table><thead><tr><th>Aktion</th><th>TW</th><th>DEF</th><th>MID</th><th>FWD</th></tr></thead><tbody>
  {Object.entries(SORARE_AA_MATRIX).map(([name,values])=><tr key={name}><td>{matrixLabel[name]??name}</td>{values.map((value,i)=><td key={i}>{value>0?'+':''}{fmt(value,2)}</td>)}</tr>)}
  </tbody></table></div>
  <p className="live-caption">Standardregeln ohne zeitlich begrenzte Event-Sonderfaktoren. DS-Level: −3=0, −2=5, −1=15, 0=35, +1=60, +2=70, +3=80, +4=90, +5=100. Clean Sheet erfordert mindestens 60 Minuten. Multi-Stats: Double-Double +4, Triple-Double +6, Triple-Triple +12 (nur höchster Bonus). Kartenbonus separat.</p>
  </details>}

const scoreColor=(value:number|null)=>value===null?'unknown':value>=70?'elite':value>=60?'great':value>=50?'good':value>=35?'mid':'low';
function OfficialScore({value,status}:{value:number|null;status?:string}){return <span className={`foot-official-score ${scoreColor(value)}`} title={value===null?'Noch kein verifizierter Sorare-Spielerwert verfügbar':`Sorare ${status||'Live'} · ohne Kartenbonus`}>{value!==null?fmt(value):'–'}</span>;}
export default function FootballLiveCenter({initialFilter='clubs'}:{initialFilter?:string}){
  const initialLeague=initialFilter;
  const [day,setDay]=useState(todayBerlin),[league,setLeague]=useState<FootballCompetitionFilter>(isFootballCompetitionFilter(initialLeague)?initialLeague:'clubs'),[games,setGames]=useState<FootballLiveGame[]>([]),[eventId,setEventId]=useState('');
  const group=footballCompetitionGroup(league);
  const selectCompetition=(filter:FootballCompetitionFilter)=>{setLeague(filter);setSelectedPlayer(null);};
  const choices=FOOTBALL_COMPETITIONS.filter(item=>group==='clubs'?item.group!=='international':item.group===group);
  const [detail,setDetail]=useState<FootballLiveGameDetail|null>(null),[scheduleError,setScheduleError]=useState(''),[detailError,setDetailError]=useState('');
  const [feedWarning,setFeedWarning]=useState<string|null>(null),[loading,setLoading]=useState(true),[section,setSection]=useState<'all'|'mine'>('all'),[selectedPlayer,setSelectedPlayer]=useState<FootballLivePlayer|null>(null);
  const selectedGameRef=useRef<string>('');
  const [myCards,setMyCards]=useState<Map<string,number|null>|null>(null);
  const [activeSetName,setActiveSetName]=useState<string|null>(null);
  const [projections,setProjections]=useState<Map<string,{pp:number|null;q80:number|null;quality:string}>|null>(null);
  const [projectionError,setProjectionError]=useState(''),[loadingPP,setLoadingPP]=useState(false);
  const [sorareScores,setSorareScores]=useState<OfficialFootballPlayerScore[]>([]);
  const [sorarePhotos,setSorarePhotos]=useState<OfficialFootballPlayerPhoto[]>([]);
  const [sorareStatus,setSorareStatus]=useState<'loading'|'matched'|'unmatched'|'not-connected'|'error'>('loading');
  const [sorareMessage,setSorareMessage]=useState('');
  const scoreboardPending=useRef<string|null>(null);
  const selectedGame=games.find(g=>g.id===eventId)??games[0]??null;selectedGameRef.current=selectedGame?.id??'';
  const refreshGames=useCallback(async(signal:AbortSignal)=>{
    const key=`${day}:${league}`;if(scoreboardPending.current===key)return;scoreboardPending.current=key;
    try{const data=await read<{games:FootballLiveGame[];warning:string|null}>(`/api/football-live/scoreboard?date=${day}&league=${league}`,signal);if(!signal.aborted){setGames(data.games);setFeedWarning(data.warning);setScheduleError('');setLoading(false);}}
    catch(e){if(!signal.aborted){setScheduleError(e instanceof Error?e.message:'Unbekannter Fehler');setLoading(false);}}
    finally{if(scoreboardPending.current===key)scoreboardPending.current=null;}
  },[day,league]);
  useEffect(()=>{const c=new AbortController();setLoading(true);setGames([]);setEventId('');setDetail(null);void refreshGames(c.signal);const timer=setInterval(()=>{if(!document.hidden)void refreshGames(c.signal)},league==='international'?120000:90000);const resume=()=>{if(!document.hidden)void refreshGames(c.signal)};document.addEventListener('visibilitychange',resume);return ()=>{c.abort();clearInterval(timer);document.removeEventListener('visibilitychange',resume)};},[refreshGames]);
  useEffect(()=>{if(!selectedGame){setDetail(null);return;}const id=selectedGame.id,controller=new AbortController();let pending=false;setDetail(prev=>prev?.game.id===id?prev:null);setDetailError('');const refresh=async()=>{if(pending)return;pending=true;try{const result=await read<FootballLiveGameDetail>(`/api/football-live/game?event=${id}&league=${selectedGame.leagueKey}`,controller.signal);if(!controller.signal.aborted){setDetail(result);setDetailError('');}}catch(e){if(!controller.signal.aborted)setDetailError(e instanceof Error?e.message:'Spieldetails nicht verfügbar')}finally{pending=false}};void refresh();const timer=selectedGame.status==='final'?null:setInterval(()=>{if(!document.hidden)void refresh()},selectedGame.status==='live'?25000:75000);const resume=()=>{if(!document.hidden)void refresh()};document.addEventListener('visibilitychange',resume);return ()=>{controller.abort();if(timer)clearInterval(timer);document.removeEventListener('visibilitychange',resume)};},[selectedGame?.id,selectedGame?.status,selectedGame?.leagueKey]);
  useEffect(()=>{
    if(!selectedGame){setSorareScores([]);setSorarePhotos([]);return;}
    const controller=new AbortController();let pending=false;
    setSorareScores([]);setSorarePhotos([]);setSorareStatus('loading');setSorareMessage('');
    const refresh=async()=>{
      if(pending)return;pending=true;
      try{
        const data=await read<{status:'matched'|'unmatched'|'not-connected'|'error';scores:OfficialFootballPlayerScore[];photos:OfficialFootballPlayerPhoto[];message:string}>(`/api/football-live/sorare-scores?event=${selectedGame.id}&league=${selectedGame.leagueKey}`,controller.signal);
        if(!controller.signal.aborted){setSorareScores(data.scores||[]);setSorarePhotos(data.photos||[]);setSorareStatus(data.status);setSorareMessage(data.message||'');}
      }catch(e){if(!controller.signal.aborted){setSorareStatus('error');setSorareMessage(e instanceof Error?e.message:'Sorare-Abruf nicht erreichbar');}}
      finally{pending=false}
    };
    void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh()},selectedGame.status==='live'?60000:180000);
    return ()=>{controller.abort();clearInterval(timer)};
  },[selectedGame?.id,selectedGame?.leagueKey,selectedGame?.status]);
  useEffect(()=>{let mounted=true;void(async()=>{try{const r=await fetch('/api/auth/sorare/status',{cache:'no-store'});if(!r.ok)return;const s=await r.json() as {connected?:boolean;slug?:string};if(!s.connected||!s.slug)return;const cache=safeCollection(JSON.parse(localStorage.getItem(collectionKey(s.slug))||'null'),s.slug);if(!cache?.complete)return;const map=new Map<string,number|null>();for(const card of activeCollectionCards(cache,'football')){const key=norm(card.playerName);if(!key)continue;const prev=map.get(key);if(!map.has(key)||(card.bonusPercent??-1)>(prev??-1))map.set(key,card.bonusPercent??null);}if(mounted){setMyCards(map);setActiveSetName(cache.activeFootballSet?.name??null);}}catch{}})();return ()=>{mounted=false};},[]);
  const projectionGameKey=selectedGame?.id??'';useEffect(()=>{setProjections(null);setProjectionError('');},[projectionGameKey]);
  const loadPP=async()=>{if(!selectedGame||loadingPP||isNationalFootballLeague(selectedGame.leagueKey))return;setLoadingPP(true);setProjectionError('');try{const data=await read<{players:Array<{name:string;pp:number|null;q80:number|null;quality:string}>}>(`/api/football-live/projections?away=${encodeURIComponent(selectedGame.away.name)}&home=${encodeURIComponent(selectedGame.home.name)}`,new AbortController().signal);if(selectedGameRef.current===projectionGameKey){const map=new Map<string,{pp:number|null;q80:number|null;quality:string}>();for(const p of data.players)map.set(norm(p.name),{pp:p.pp,q80:p.q80,quality:p.quality});setProjections(map)}}catch(e){setProjectionError(e instanceof Error?e.message:'Modellprognosen nicht erreichbar')}finally{setLoadingPP(false)}};
  const current=detail?.game.id===selectedGame?.id?detail:null;const game=current?.game??selectedGame,all=current?.players??[],plays=current?.plays??[];
  const teams=useMemo(()=>game?[game.away,game.home].map(team=>({team,players:all.filter(p=>p.teamId===team.id).sort((a,b)=>Number(b.starter)-Number(a.starter)||posRank(a.position)-posRank(b.position)||a.name.localeCompare(b.name))})):[],[game,all]);
  const rosterNames=useMemo(()=>all.map(p=>p.name),[all]);
  const playerScores=useMemo(()=>new Map(all.map(p=>[p.id,matchSorarePlayer(p.name,sorareScores,rosterNames)])),[all,rosterNames,sorareScores]);
  const playerPhotos=useMemo(()=>new Map(all.map(p=>[p.id,matchSorarePlayer(p.name,sorarePhotos,rosterNames)?.url??null])),[all,rosterNames,sorarePhotos]);
  const matchedScoreCount=[...playerScores.values()].filter(Boolean).length;
  const matchedPhotoCount=[...playerPhotos.values()].filter(Boolean).length;
  const scoreFor=(p:FootballLivePlayer):OfficialFootballPlayerScore|null=>playerScores.get(p.id)??null;
  const photoFor=(p:FootballLivePlayer):string|null=>playerPhotos.get(p.id)??null;
  const minutesFor=(p:FootballLivePlayer)=>game?footballDisplayedMinutes(p,game):{minutes:null,estimated:false};
  const owned=useMemo(()=>all.filter(p=>myCards?.has(norm(p.name))),[all,myCards]);const showPlayer=selectedPlayer?all.find(p=>p.id===selectedPlayer.id)??selectedPlayer:null;const updated=current?time(current.updatedAt):'–';
  return <section className="live-wrap" aria-label="Football Live Center">
    <div className="live-head"><strong>◉ FOOTBALL LIVE CENTER</strong><span>ESPN Gamecast · letzter Abruf {updated} · {game?.status==='live'?'LIVE, ca. alle 25 Sekunden':game?.status==='final'?'Spiel beendet':'Aktualisierung bei Bedarf'}</span></div>
    <div className="live-grid"><aside className="live-side"><div className="live-title"><b>SPIELAUSWAHL</b><button type="button" onClick={()=>setDay(todayBerlin())}>Heute</button></div>
      <div className="live-date"><button type="button" aria-label="Vortag" onClick={()=>setDay(d=>shift(d,-1))}>‹</button><input aria-label="Datum wählen" type="date" value={day} onChange={e=>/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)&&setDay(e.target.value)}/><button type="button" aria-label="Folgetag" onClick={()=>setDay(d=>shift(d,1))}>›</button></div>
      <div className="live-comp-groups" aria-label="Wettbewerbsgruppen">{GROUPS.map(item=><button key={item.key} type="button" onClick={()=>selectCompetition(item.key)} className={group===item.key?'active':''}>{item.label}</button>)}</div>
      <div className="live-leagues" aria-label="Einzelwettbewerbe"><button type="button" onClick={()=>selectCompetition(group)} className={league===group?'active':''}>Alle in Gruppe</button>{choices.map(item=><button key={item.key} type="button" onClick={()=>selectCompetition(item.key)} className={league===item.key?'active':''}>{item.short}</button>)}</div>
      <p className="live-comp-note">{group==='international'?'Nationalteam-Spiele einschließlich Freundschaftsspielen, Nations League und WM-/EM-Turnieren sowie Qualifikationen. Auswahl und Einsätze erst bei bestätigtem Spielkader.':'Spielstand und Teams aller gewählten Wettbewerbe; Set-Spieler werden im geladenen Kader abgeglichen.'}</p>
      {feedWarning&&<p className="live-hint">{feedWarning}</p>}{scheduleError&&<p className="live-error" role="alert">Scoreboard: {scheduleError}. {games.length?'Letzter Stand wird angezeigt.':''}</p>}
      <div className="live-games">{games.map(g=><button type="button" key={`${g.leagueKey}:${g.id}`} onClick={()=>{setEventId(g.id);setSelectedPlayer(null)}} aria-pressed={g.id===game?.id} className={`live-game ${g.id===game?.id?'active':''}`}><div><TeamLogo url={g.away.logo} abbr={g.away.abbreviation}/><span>{g.away.abbreviation}</span><b>{g.away.score??'–'} : {g.home.score??'–'}</b><span>{g.home.abbreviation}</span><TeamLogo url={g.home.logo} abbr={g.home.abbreviation}/></div><small>{g.leagueName} · {gameLabel(g)}</small></button>)}{loading&&<p className="live-muted">Spiele werden geladen …</p>}{!loading&&!games.length&&!scheduleError&&<p className="live-muted">Keine Fußballspiele für diesen Tag / Filter.</p>}</div>
    </aside><div className="live-main">{game?<> 
      <header className="live-scoreboard"><div><TeamLogo url={game.away.logo} abbr={game.away.abbreviation}/><strong>{game.away.name}</strong><b>{game.away.score??'–'}</b></div><div className="live-score-status"><small className={game.status==='live'?'is-live':''}>{game.status.toUpperCase()}</small><strong>{gameLabel(game)}</strong><span>{game.leagueName}</span></div><div><b>{game.home.score??'–'}</b><strong>{game.home.name}</strong><TeamLogo url={game.home.logo} abbr={game.home.abbreviation}/></div></header>
      {game.venue&&<p className="live-caption">Ort: {game.venue}</p>}
      {detailError&&<p className="live-error" role="alert">{detailError}. {current?'Letzte Daten bleiben erhalten.':''}</p>}{current?.warning&&<p className="live-hint">{current.warning}</p>}
      <section className="foot-tactical-panel">
        <div className="live-title"><b>AUFSTELLUNG / FORMATION</b><small>Positionen aus ESPN · Sorare-PS nur bei verifiziertem Spielabgleich</small></div>
        <div className="foot-team-headings">{teams.map(({team})=><div key={team.id}><TeamLogo url={team.logo} abbr={team.abbreviation}/><b>{team.name}</b><span>{current?.formations?.[team.id]||'Formation offen'}</span></div>)}</div>
        <div className="foot-pitch"><div className="foot-left-box"/><div className="foot-right-box"/><div className="foot-midline"/><div className="foot-circle"/>
          {teams.map(({team,players},i)=>{const layout=footballFormationLayout(players,current?.formations?.[team.id]??null,i===0?'left':'right');return <div className="foot-team-overlay" key={team.id}>
            {layout.spots.map(({player:p,x,y})=><button key={p.id} type="button" className={`foot-marker ${i===0?'is-away':'is-home'}`} style={{left:`${x}%`,top:`${y}%`}} onClick={()=>setSelectedPlayer(p)} title={`${p.name} · ${p.position||'Position offen'} · ${minutesFor(p).minutes??'–'} Minuten`}>
              <Avatar name={p.name} url={photoFor(p)??p.headshot} fallbackUrl={p.headshot}/><OfficialScore value={scoreFor(p)?.score??null} status={scoreFor(p)?.scoreStatus}/><small>{short(p.name)}</small></button>)}
            {!layout.verified&&<span className={`foot-unverified ${i===0?'away':'home'}`}>{layout.reason}<small>Spieler in der Liste darunter sichtbar</small></span>}
          </div>})}
        </div>
        <div className="foot-bench">{teams.map(({team,players})=><div key={team.id}><b>Bank · {team.name}</b><div>{players.filter(p=>!p.starter).map(p=><button key={p.id} type="button" onClick={()=>setSelectedPlayer(p)}>{short(p.name)}</button>)}{!players.some(p=>!p.starter)&&<span className="live-muted">Noch keine Bank gemeldet</span>}</div></div>)}</div>
        <div className="foot-pitch-footer"><span>● Sorare-PS ohne Kartenbonus</span><span>Spielminuten aus ESPN · ~ bedeutet berechnet</span></div>
        <details className="foot-play-drawer"><summary>PLAY-BY-PLAY · Live-Aktionen ({plays.length}) anzeigen</summary><div className="live-plays">{plays.slice(0,80).map(p=><div className={`live-play ${/goal|tor|penalty scored/i.test(p.text)?'scored':''}`} key={`${p.id}:${p.sort}`}><time>{p.minute}</time><span>{p.text}</span>{p.scoreAway!==null&&p.scoreHome!==null&&<b>{p.scoreAway}:{p.scoreHome}</b>}</div>)}{!plays.length&&<p className="live-muted">Noch keine Spielaktionen vorhanden.</p>}</div></details>
      </section>
      <section className="live-rosters"><div className="live-title"><b>LIVE BOXSCORE · SORARE-DATENPRÜFUNG</b><div><button onClick={()=>void loadPP()} disabled={loadingPP||isNationalFootballLeague(game.leagueKey)} title={isNationalFootballLeague(game.leagueKey)?'Nationalteam-PP ist ohne verifizierte Nationalteam-/Spieler-Zuordnung noch nicht verfügbar':'Aktuelle PP/Q80-Modellwerte für diese zwei Fußball-Teams auf Abruf laden'}>{loadingPP?'PP laden …':isNationalFootballLeague(game.leagueKey)?'PP national: offen':'PP/Q80 laden'}</button><button className={section==='all'?'active':''} onClick={()=>setSection('all')}>Alle Spieler</button><button className={section==='mine'?'active':''} onClick={()=>setSection('mine')}>Meine Karten ({owned.length})</button></div></div>
      {isNationalFootballLeague(game.leagueKey)&&<p className="live-hint">Länderspiel: PP/Q80 derzeit nicht als Clubprognose berechnet. Nationalteams werden nicht ohne verifizierte Spielerzuordnung mit Sorare-Clubs verwechselt. Spielaktionen, Aufstellungen und verifizierte eigene Set-Spieler bleiben sichtbar.</p>}
      <p className="foot-score-source">Sorare: {sorareStatus==='matched'?`${matchedScoreCount}/${sorareScores.length} Sorare-PS zugeordnet · ${matchedPhotoCount} Fotos zugeordnet`:sorareStatus==='loading'?'Verbindung wird geprüft …':sorareMessage||'Noch kein offizieller Spielabgleich'} · ESPN-Minuten werden separat angezeigt.</p>
      {projectionError&&<p className="live-error">PP: {projectionError}</p>}
      {projections&&<p className="live-hint">PP/Q80: aktueller Modellabruf. Sorare-PS nur bei vollständigen, positionskorrekten Statistikfeldern. Mit unvollständigen ESPN-Daten wird kein offizieller Score behauptet.</p>}
      {section==='mine'?(myCards===null?<p className="live-muted">Keine vollständig verifizierte Fußball-Sammlung im Browser. <Link href="/collection?sport=football">Sammlung öffnen ↗</Link></p>:owned.length?<><p className="live-hint">Verifizierte Karten aus dem aktiven Set{activeSetName?` (${activeSetName})`:''}. Die Zuordnung erfolgt erst nach Abgleich mit den Spielkadern.</p><div className="live-mine">{owned.map(p=><button key={p.id} onClick={()=>setSelectedPlayer(p)}><Avatar name={p.name} url={photoFor(p)??p.headshot} fallbackUrl={p.headshot}/><strong>{p.name}</strong><span>Sorare-PS: {fmt(scoreFor(p)?.score??null)} {myCards.get(norm(p.name))!==null?`· Karte +${fmt(myCards.get(norm(p.name))??null)} %`:''}</span></button>)}</div></>:<p className="live-muted">Keine eindeutig zugeordneten eigenen Set-Spieler im bestätigten Kader dieses Spiels. Für unbestätigte Kader gibt es keine automatische Länderspiel-Zuordnung.</p>):<div className="live-roster-tables">{teams.map(({team,players})=><div key={team.id} className="live-roster-team"><h3><TeamLogo url={team.logo} abbr={team.abbreviation}/>{team.name}</h3><div className="live-roster-scroll"><table><thead><tr><th>Spieler</th><th>MIN</th><th>G</th><th>A</th><th>SOT</th><th>SV</th><th>TKL</th><th>INT</th><th>CLR</th><th>PP</th><th>Q80</th><th title="Offiziell über Sorare abgeglichen, sofern verfügbar">Sorare PS</th></tr></thead><tbody>{players.map(p=><tr key={p.id} className={myCards?.has(norm(p.name))?'mine':''}><td><button onClick={()=>setSelectedPlayer(p)} type="button"><Avatar name={p.name} url={photoFor(p)??p.headshot} fallbackUrl={p.headshot}/><span>{p.shortName}{p.starter&&<small>Starter</small>}</span></button></td><td title={minutesFor(p).estimated?"Aus Ein-/Auswechslung und Matchuhr abgeleitet":"ESPN-Spielzeit"}>{minutesFor(p).estimated?"~":""}{fmt(minutesFor(p).minutes,0)}</td><td>{p.stats?.goals??'–'}</td><td>{p.stats?.assists??'–'}</td><td>{p.stats?.shotsOnTarget??'–'}</td><td>{p.stats?.saves??'–'}</td><td>{p.stats?.tacklesWon??'–'}</td><td>{p.stats?.interceptions??'–'}</td><td>{p.stats?.clearances??'–'}</td><td>{fmt(projections?.get(norm(p.name))?.pp??null)}</td><td>{fmt(projections?.get(norm(p.name))?.q80??null)}</td><td><OfficialScore value={scoreFor(p)?.score??null} status={scoreFor(p)?.scoreStatus}/></td></tr>)}{!players.length&&<tr><td colSpan={12}>Noch kein Live-Boxscore verfügbar.</td></tr>}</tbody></table></div></div>)}</div>}
      <ScoringRules/>
      </section><p className="live-disclaimer">ESPN-Webfeed (inoffiziell). PP/Q80 sind Modellprognosen, keine Live-Resultate. Spieler-Scores werden nur nach eindeutigem Spielabgleich aus der Sorare-API angezeigt; ansonsten –. ESPN-Minuten können mit ~ angenähert sein. Eine AA-Teilsumme ist KEIN Sorare-Score. Karten-/Captain-Boni separat.</p>
      </>:<p className="live-muted">{loading?'Lade Fußball-Spielplan …':'Wähle ein Fußballspiel aus.'}</p>}</div></div>
    {showPlayer&&<div className="live-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedPlayer(null)}}><section className="live-player-modal" role="dialog" aria-modal="true" aria-label={`Live-Daten ${showPlayer.name}`}><div className="live-modal-head"><Avatar name={showPlayer.name} url={photoFor(showPlayer)??showPlayer.headshot} fallbackUrl={showPlayer.headshot}/><div><h2>{showPlayer.name}</h2><small>{showPlayer.position||'Spieler'} · {minutesFor(showPlayer).minutes!==null?(minutesFor(showPlayer).estimated?'~':'')+fmt(minutesFor(showPlayer).minutes,0)+' Minuten':'Spielzeit unbekannt'}</small></div><button onClick={()=>setSelectedPlayer(null)} aria-label="Schließen">✕</button></div><div className="live-modal-metrics"><div>Sorare PS <strong>{fmt(scoreFor(showPlayer)?.score??null)}</strong></div><div>Minuten <strong>{minutesFor(showPlayer).estimated?"~":""}{fmt(minutesFor(showPlayer).minutes,0)}</strong></div><div>PP <strong>{fmt(projections?.get(norm(showPlayer.name))?.pp??null)}</strong></div></div><FootballStatBreakdown score={showPlayer.score}/><p className="live-caption">PP ist nur nach dem optionalen Modellabruf verfügbar. Im Fußball werden fehlende Scoringkategorien nicht als Null gezählt. Der offizielle PS wird ausschließlich nach Sorare-Spielabgleich angezeigt; andernfalls bleibt er leer. AA-Teilsummen sind keine Sorare-Player-Scores.</p></section></div>}
  </section>
}

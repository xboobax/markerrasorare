import {calculateSorareFootballMatrix,type SorareScoringInputs,type SorareFootballPosition,type SorareOfficialMatrixOutput} from './sorare-football-scoring';
import {footballCompetition,type FootballLeagueKey} from './football-competitions';
export type {FootballLeagueKey} from './football-competitions';

/**
 * MarkErras Football Live Center - best-effort ESPN normalization.
 * Football live scores are explicitly provisional because free live feeds do not
 * expose the full Sorare all-around matrix. We therefore show a transparent
 * partial Sorare estimate based on the available event/stat subset.
 */
export type FootballLiveGameStatus='scheduled'|'live'|'final'|'delayed';
export type FootballLiveGame={id:string;leagueKey:FootballLeagueKey;leagueName:string;date:string;home:{id:string;name:string;abbreviation:string;logo:string|null;score:number|null};away:{id:string;name:string;abbreviation:string;logo:string|null;score:number|null};status:FootballLiveGameStatus;statusText:string;period:number;clock:string;lastUpdated:string|null;venue:string|null};
export type FootballLiveStats={minutes:number|null;goals:number;assists:number;shotsOnTarget:number;saves:number;clearances:number;tacklesWon:number;interceptions:number;chancesCreated:number;crossesCompleted:number;duelsWon:number;foulsWon:number;yellowCards:number;redCards:number;ownGoals:number;goalsConceded:number;penaltiesSaved:number;penaltiesMissed:number;sorareEvents?:SorareScoringInputs;reportedFields?:string[]};
export type FootballScoreEstimate=SorareOfficialMatrixOutput & {cleanSheet:boolean|null;source:'INCOMPLETE_ESPN'|'UNVERIFIED_COMPLETE';};
export type FootballLivePlayer={id:string;name:string;shortName:string;headshot:string|null;teamId:string;starter:boolean;played:boolean;position:string|null;stats:FootballLiveStats|null;score:FootballScoreEstimate|null;status:string|null};
export type FootballLivePlay={id:string;minute:string;text:string;teamId:string|null;type:string|null;scoreHome:number|null;scoreAway:number|null;sort:number};
export type FootballLiveGameDetail={game:FootballLiveGame;players:FootballLivePlayer[];plays:FootballLivePlay[];source:'ESPN Gamecast';updatedAt:string;warning:string|null};
const obj=(x:unknown):Record<string,any>=>x&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,any>:{};
const arr=(x:unknown):any[]=>Array.isArray(x)?x:[];
const str=(x:unknown):string=>typeof x==='string'?x.trim():'';
const numeric=(x:unknown):number|null=>{
  if(typeof x==='number')return Number.isFinite(x)?x:null;
  if(typeof x==='string'&&x.trim()!==''){const n=Number(x.replace(',','.'));return Number.isFinite(n)?n:null;}
  return null;
};
const count=(x:unknown)=>Math.max(0,numeric(x)??0);
const validPhoto=(url:unknown):string|null=>typeof url==='string'&&/^https:\/\//.test(url)&&url.length<700?url:null;
const extractTeam=(competitor:unknown)=>{
  const c=obj(competitor),team=obj(c.team);
  return {id:str(team.id),name:str(team.displayName)||str(team.name)||'Team unbekannt',abbreviation:str(team.abbreviation)||str(team.shortDisplayName)||str(team.name).slice(0,3).toUpperCase(),logo:validPhoto(team.logo)||validPhoto(arr(team.logos)[0]?.href),score:numeric(c.score)};
};
export function footballStatusFromEspn(competition:unknown):FootballLiveGameStatus{
  const state=obj(competition),status=obj(state.status),s=obj(status.type);
  const key=`${str(s.name)} ${str(s.state)} ${str(s.description)} ${str(s.detail)} ${str(s.shortDetail)}`.toLowerCase();
  if(s.completed===true||/final|full time|after extra time|penalties/.test(key))return 'final';
  if(/inprogress|in progress|in-progress|halftime|second half|first half|live/.test(key)||s.state==='in')return 'live';
  if(/postpon|delay|cancel|suspend|abandon/.test(key))return 'delayed';
  return 'scheduled';
}
export function parseEspnFootballGame(event:unknown,updatedAt:string,leagueKey:FootballLeagueKey):FootballLiveGame|null{
  const e=obj(event),comp=obj(arr(e.competitions)[0]);
  const competitors=arr(comp.competitors);
  const home=competitors.find(c=>obj(c).homeAway==='home'),away=competitors.find(c=>obj(c).homeAway==='away');
  const id=str(e.id);
  if(!/^\d{6,14}$/.test(id)||!home||!away)return null;
  const date=str(e.date)||str(comp.date);
  if(!/^\d{4}-\d{2}-\d{2}T/.test(date)||!Number.isFinite(Date.parse(date)))return null;
  const status=comp.status??e.status;const ty=obj(obj(status).type);const venue=obj(arr(comp.venue?.fullName?[comp.venue]:arr(comp.venues))[0]);
  return {id,leagueKey,leagueName:footballCompetition(leagueKey).name,date,home:extractTeam(home),away:extractTeam(away),status:footballStatusFromEspn({status}),
    statusText:str(ty.shortDetail)||str(ty.detail)||str(ty.description)||'Termin',period:count(obj(status).period),clock:str(obj(status).displayClock),lastUpdated:updatedAt,venue:str(venue.fullName)||str(obj(comp.venue).fullName)||null};
}
export function parseEspnFootballScoreboard(payload:unknown,updatedAt:string,leagueKey:FootballLeagueKey):FootballLiveGame[]{
  const events=arr(obj(payload).events);if(!Array.isArray(obj(payload).events))throw new Error('ESPN-Scoreboard ohne Spieleliste.');
  const seen=new Set<string>();
  return events.map(e=>parseEspnFootballGame(e,updatedAt,leagueKey)).filter((g):g is FootballLiveGame=>{if(!g||seen.has(g.id))return false;seen.add(g.id);return true;}).sort((a,b)=>a.date.localeCompare(b.date));
}
export function parseFootballStatMinutes(value:unknown):number|null{
  if(typeof value==='number'&&Number.isFinite(value)&&value>=0)return value;
  const s=str(value);if(!s||s==='--'||s==='DNP')return null;
  const mm=s.match(/^(\d{1,3}):(\d\d)$/);if(mm)return Number(mm[1])+Number(mm[2])/60;
  const quoted=s.match(/^(\d{1,3})(?:\+\d+)?'?$/);if(quoted)return Number(quoted[1]);
  const n=numeric(s);return n!==null&&n>=0?n:null;
}
const aliases:Record<Exclude<keyof FootballLiveStats,'sorareEvents'|'reportedFields'>,string[]>= {
  minutes:['MIN','MINUTES'],goals:['G','GLS','GOALS'],assists:['A','AST','ASSISTS'],shotsOnTarget:['SOG','SOT','SHOTSONTARGET','SHOTS ON TARGET'],saves:['SV','SAVES'],clearances:['CLR','CLEARANCES'],tacklesWon:['TCKL','TKL','TACKLES WON','TACKLES'],interceptions:['INT','INTERCEPTIONS'],chancesCreated:['CC','CHANCES CREATED'],crossesCompleted:['CCR','CROSSES COMPLETED','ACCURATE CROSSES'],duelsWon:['DW','DUELS WON'],foulsWon:['FW','FOULS WON'],yellowCards:['YC','YELLOW CARDS'],redCards:['RC','RED CARDS'],ownGoals:['OG','OWN GOALS'],goalsConceded:['GC','GOALS CONCEDED'],penaltiesSaved:['PS','PENS SAVED','PENALTIES SAVED'],penaltiesMissed:['PM','PENS MISSED','PENALTIES MISSED']
};
const defaultFootballStats=():FootballLiveStats=>({minutes:null,goals:0,assists:0,shotsOnTarget:0,saves:0,clearances:0,tacklesWon:0,interceptions:0,chancesCreated:0,crossesCompleted:0,duelsWon:0,foulsWon:0,yellowCards:0,redCards:0,ownGoals:0,goalsConceded:0,penaltiesSaved:0,penaltiesMissed:0});
/** Map only provider fields whose definitions clearly match the Sorare scoring event.
 * Generic clearances, total tackles or 'chances created' are NOT silently
 * accepted as effective clearances, WON tackles or big chances created.
 */
const sorareLiveAliases:Readonly<Record<keyof SorareScoringInputs,readonly string[]>>={
  goals:['G','GLS','GOALS'],assists:['A','AST','ASSISTS'],penaltiesWonScored:['PENALTIES WON SCORED'],
  clearancesOffLine:['CLEARANCE OFF THE LINE','GOAL LINE CLEARANCES'],goalkeeperCleanSheet:['GK CLEAN SHEET'],
  penaltiesSaved:['PENALTIES SAVED','PENS SAVED'],lastManTackles:['LAST MAN TACKLES'],
  redCards:['RC','RED CARDS'],ownGoals:['OG','OWN GOALS'],penaltiesConceded:['PENALTIES CONCEDED'],errorsLeadingToGoals:['ERROR LEADS TO GOAL'],
  yellowCards:['YC','YELLOW CARDS'],foulsCommitted:['FC','FOULS COMMITTED'],wasFouled:['FW','FOULS WON'],
  errorLeadsToShot:['ERROR LEADS TO SHOT'],cleanSheetDefender:['DEFENDER CLEAN SHEET'],
  goalsConceded:['GC','GOALS CONCEDED'],effectiveClearances:['EFFECTIVE CLEARANCES'],
  wonTackles:['TACKLES WON','WON TACKLES'],blockedCrosses:['CROSSES BLOCKED','BLOCKED CROSSES'],
  outfieldBlocks:['BLOCKS','OUTFIELDER BLOCKS'],possessionLost:['POSSESSION LOST'],
  possessionWon:['POSSESSION WON'],duelsLost:['DUELS LOST'],duelsWon:['DUELS WON'],
  interceptionsWon:['INTERCEPTIONS WON','INT','INTERCEPTIONS'],bigChancesCreated:['BIG CHANCES CREATED'],
  attemptedAssists:['ATTEMPTED ASSISTS','TOTAL ATTEMPTED ASSISTS'],accuratePasses:['ACCURATE PASSES','PASSES ACCURATE'],
  finalThirdPasses:['SUCCESSFUL FINAL THIRD PASSES'],accurateLongBalls:['ACCURATE LONG BALLS'],
  longPassesIntoOpposition:['LONG PASSES INTO OPPOSITION'],missedPasses:['MISSED PASSES'],
  shotsOnTarget:['SOG','SOT','SHOTS ON TARGET'],wonContests:['WON CONTESTS'],
  penaltyAreaEntries:['PENALTY AREA ENTRIES'],missedPenalties:['PM','PENALTIES MISSED'],
  bigChancesMissed:['BIG CHANCES MISSED'],saves:['SV','SAVES'],savesInBox:['SAVES IN BOX'],
  goodHighClaims:['GOOD HIGH CLAIMS'],punches:['PUNCHES'],diveSaves:['DIVE SAVES'],
  diveCatches:['DIVE CATCHES'],crossesNotClaimed:['CROSSES NOT CLAIMED'],
  sixSecondViolations:['SIX SECOND VIOLATIONS'],gkSmothers:['GK SMOTHERS'],
  accurateKeeperSweepers:['ACCURATE KEEPER SWEEPERS'],penaltiesWonScoredAA:['PENALTY WON AND SCORED AA'],netDuels:['NET DUELS'],minutesPlayed:['MIN','MINUTES']
};

export function footballStatLine(labels:unknown,values:unknown):FootballLiveStats|null{
  const columns=arr(labels).map(v=>str(v).toUpperCase().replace(/[^A-Z0-9 ]/g,'').trim());
  const fields=arr(values);if(!columns.length||!fields.length)return null;
  const stats=defaultFootballStats();
  const take=(keys:string[])=>{const idx=columns.findIndex(k=>keys.includes(k));return idx<0?null:count(fields[idx]);};
  const miIndex=columns.findIndex(k=>aliases.minutes.includes(k));stats.minutes=miIndex<0?null:parseFootballStatMinutes(fields[miIndex]);
  (Object.keys(aliases) as Array<Exclude<keyof FootballLiveStats,'sorareEvents'|'reportedFields'>>).forEach(key=>{if(key==='minutes')return;const v=take(aliases[key]);if(v!==null)stats[key]=v as never;});
  const sorareEvents:SorareScoringInputs={};
  for(const [key,keys] of Object.entries(sorareLiveAliases) as [keyof SorareScoringInputs,readonly string[]][]){
    const index=columns.findIndex(column=>keys.includes(column));
    if(index>=0){const value=numeric(fields[index]);if(value!==null&&(value>=0||key==='netDuels'))sorareEvents[key]=value;}
  }
  stats.sorareEvents=sorareEvents;
  stats.reportedFields=Object.keys(sorareEvents);
  const hasAny=(Object.keys(stats) as Array<keyof FootballLiveStats>).some(key=>typeof stats[key]==='number'&&key!=='minutes'&&(stats[key] as number)>0);
  return stats.minutes!==null||hasAny||stats.reportedFields.length>0?stats:null;
}
const posOrder=(raw:string|null)=>{const p=(raw||'').toUpperCase();if(/^GK|GOAL/.test(p))return 1;if(/^(DEF|D|CB|LB|RB|WB)/.test(p))return 2;if(/^(MID|M|DM|CM|AM)/.test(p))return 3;if(/^(FWD|F|ST|ATT|W)/.test(p))return 4;return 5;};
export function sorareFootballEstimate(stats:FootballLiveStats,position:string|null):FootballScoreEstimate{
  const upper=(position||'').toUpperCase();
  const p:SorareFootballPosition=/^GK|GOAL/.test(upper)?'GK':/^(DEF|D|CB|LB|RB|WB)/.test(upper)?'DEF':/^(MID|M|DM|CM|AM)/.test(upper)?'MID':'FWD';
  // Never pretend absent fields are zero. ESPN's generic stats have not
  // established full Opta/Sorare event definitions or penalties/duel splits.
  const events:SorareScoringInputs={...(stats.sorareEvents??{}),...(stats.minutes!==null?{minutesPlayed:stats.minutes}:{})};
  const played=(stats.minutes??0)>0||Object.values(events).some(x=>typeof x==='number'&&x>0);
  const result=calculateSorareFootballMatrix(p,events,played);
  const cleanSheet: boolean|null=typeof events.goalkeeperCleanSheet==='number'
    ?events.goalkeeperCleanSheet>0
    :typeof events.cleanSheetDefender==='number'?events.cleanSheetDefender>0:null;
  return {...result,cleanSheet,source:result.completeness==='partial'?'INCOMPLETE_ESPN':'UNVERIFIED_COMPLETE'};
}

export function parseEspnFootballPlayers(raw:unknown,game:FootballLiveGame):FootballLivePlayer[]{
  const groups=arr(obj(raw).boxscore?.players);const players=new Map<string,FootballLivePlayer>();
  for(const group of groups){
    const g=obj(group),teamId=str(obj(g.team).id);if(teamId!==game.home.id&&teamId!==game.away.id)continue;
    for(const section of arr(g.statistics)){
      const sec=obj(section),labels=sec.labels??sec.names;
      for(const row of arr(sec.athletes)){
        const a=obj(row),athlete=obj(a.athlete);const id=str(athlete.id);if(!id)continue;
        const name=str(athlete.displayName)||str(athlete.fullName);if(!name)continue;
        const note=str(a.didNotPlayReason)||str(a.reason)||str(a.status);const didNotPlay=Boolean(a.didNotPlay)||/DNP|OUT|INACTIVE|DID NOT/i.test(note);
        const statPart=didNotPlay?null:footballStatLine(labels,a.stats);const base=players.get(id)??{id,name,shortName:str(athlete.shortName)||name.split(' ').slice(-1)[0],headshot:validPhoto(obj(athlete.headshot).href)||validPhoto(obj(athlete).image),teamId,starter:a.starter===true||athlete.starter===true,played:false,position:str(obj(athlete.position).abbreviation)||str(a.position)||null,stats:null,score:null,status:didNotPlay?note||'DNP':null};
        const merged=base.stats??defaultFootballStats();
        if(statPart){
          for(const key of Object.keys(merged) as Array<keyof FootballLiveStats>){
            if(key==='minutes'){merged.minutes=statPart.minutes??merged.minutes;continue;}
            if(typeof merged[key]==='number'&&typeof statPart[key]==='number')merged[key]=Math.max(merged[key] as number,statPart[key] as number) as never;
          }
        }
        merged.sorareEvents={...(merged.sorareEvents??{}),...(statPart?.sorareEvents??{})};
        merged.reportedFields=Array.from(new Set([...(merged.reportedFields??[]),...(statPart?.reportedFields??[])]));
        const played=!didNotPlay&&Boolean((merged.minutes??0)>0||merged.goals||merged.assists||merged.saves||merged.shotsOnTarget||merged.clearances||merged.tacklesWon||merged.interceptions);
        const finalStats=played||statPart?merged:null;
        const finalPosition=base.position||str(obj(athlete.position).abbreviation)||null;
        players.set(id,{...base,starter:base.starter||a.starter===true||athlete.starter===true,position:finalPosition,stats:finalStats,played,status:didNotPlay?note||'DNP':base.status,score:finalStats&&played?sorareFootballEstimate(finalStats,finalPosition):null});
      }
    }
  }
  // ESPN international / cup summaries sometimes expose confirmed lineups in
  // `rosters` while the detailed boxscore is empty until the match starts.
  // Enrich with actual roster identities but NEVER fabricate minutes or scores.
  for(const section of arr(obj(raw).rosters)){
    const group=obj(section),teamId=str(obj(group.team).id);
    if(teamId!==game.home.id&&teamId!==game.away.id)continue;
    const rows=arr(group.roster??group.athletes??group.players);
    for(const row of rows){
      const entry=obj(row),athlete=obj(entry.athlete??entry),id=str(athlete.id);
      const name=str(athlete.displayName)||str(athlete.fullName);
      if(!id||!name)continue;
      const starter=entry.starter===true||athlete.starter===true;
      const note=str(entry.didNotPlayReason)||str(entry.status);
      const existing=players.get(id);
      if(existing){
        players.set(id,{...existing,starter:existing.starter||starter,
          headshot:existing.headshot||validPhoto(obj(athlete.headshot).href)||null,
          position:existing.position||str(obj(athlete.position).abbreviation)||str(obj(entry.position).abbreviation)||null});
      }else{
        players.set(id,{id,name,shortName:str(athlete.shortName)||name.split(' ').slice(-1)[0],
          headshot:validPhoto(obj(athlete.headshot).href)||null,teamId,starter,played:false,
          position:str(obj(athlete.position).abbreviation)||str(obj(entry.position).abbreviation)||null,
          stats:null,score:null,status:note||null});
      }
    }
  }
  return Array.from(players.values()).sort((a,b)=>a.teamId.localeCompare(b.teamId)||Number(b.starter)-Number(a.starter)||posOrder(a.position)-posOrder(b.position)||a.name.localeCompare(b.name));
}
export function parseEspnFootballPlays(raw:unknown):FootballLivePlay[]{
  const r=obj(raw);
  const rows=Array.isArray(r.commentary)?r.commentary:Array.isArray(r.plays)?r.plays:arr(obj(r.commentary).items);
  const parsed:FootballLivePlay[]=[];const seen=new Set<string>();
  for(let i=0;i<rows.length;i++){
    const p=obj(rows[i]);const text=str(p.text)||str(p.description);if(!text)continue;
    const minute=str(obj(p.time).displayValue)||str(obj(p.clock).displayValue)||str(p.displayTime)||str(p.clock)||str(p.minute);
    const id=str(p.id)||str(p.sequenceNumber)||String(i),key=`${id}:${minute}`;if(seen.has(key))continue;seen.add(key);
    parsed.push({id,minute:text&&minute?minute:minute||'–',text:text.slice(0,400),teamId:str(obj(p.team).id)||null,type:str(obj(p.type).text)||str(p.type)||null,scoreHome:numeric(p.homeScore),scoreAway:numeric(p.awayScore),sort:numeric(p.sequenceNumber)??numeric(p.timestamp)??i});
  }
  return parsed.sort((a,b)=>b.sort-a.sort).slice(0,180);
}
export function parseEspnFootballSummary(raw:unknown,eventId:string,updatedAt:string,leagueKey:FootballLeagueKey):FootballLiveGameDetail{
  const r=obj(raw),header=obj(r.header),comp=obj(arr(header.competitions)[0]);
  const game=parseEspnFootballGame({id:header.id??eventId,date:comp.date??header.date,competitions:[comp]},updatedAt,leagueKey);
  if(!game||game.id!==eventId)throw new Error('ESPN-Spieldetails sind unvollständig oder gehören zu einem anderen Spiel.');
  const players=parseEspnFootballPlayers(raw,game);
  return {game,players,plays:parseEspnFootballPlays(raw),source:'ESPN Gamecast',updatedAt,
    warning:players.length===0?'Noch keine bestätigten Spielerkader oder Live-Statistiken verfügbar.':players.every(p=>p.stats===null)?'Kaderdaten vorhanden, aber noch kein auswertbarer Live-Boxscore.':null};
}
export const footballLeagueName=(key:FootballLeagueKey)=>footballCompetition(key).name;
export {footballLeagueKeys} from './football-competitions';

import type {Forecast,Sport} from "./model";
import {canonicalNbaTeam} from "./nba-fixture-mapping";

/** Reports are independent of the Sorare score/projection model. Unknown != fit. */
export type AvailabilityStatus="out"|"doubtful"|"questionable"|"probable"|"available";
export type AvailabilitySource="ESPN"|"API-Football";
export type AvailabilityReport={
  name:string;team:string;league?:string;status:AvailabilityStatus;reason:string;
  source:AvailabilitySource;gameDate?:string;updatedAt?:string;
};
export type AvailabilitySnapshot={sport:Sport;league:string;fetchedAt:string;
  status:"available"|"partial"|"unavailable";
  sources:string[];notes:string[];reports:AvailabilityReport[];providerUpdatedAt?:string;
};
export const EMPTY_AVAILABILITY:AvailabilitySnapshot={sport:"nba",league:"",fetchedAt:"",status:"unavailable",sources:[],notes:[],reports:[]};
export const availabilityKey=(value:string)=>value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b/g,"").replace(/[^a-z0-9]/g,"");
const asObject=(x:unknown):Record<string,unknown>|null=>x!==null&&typeof x==="object"&&!Array.isArray(x)?x as Record<string,unknown>:null;
const asString=(x:unknown):string=>typeof x==="string"?x.trim():"";
const named=(x:unknown):string=>typeof x==="string"?x.trim():asString(asObject(x)?.displayName)||asString(asObject(x)?.name)||asString(asObject(x)?.type)||asString(asObject(x)?.abbreviation);
const isoTime=(x:unknown):string|undefined=>typeof x==="string"&&!Number.isNaN(Date.parse(x))?new Date(x).toISOString():undefined;

/** Never promote undocumented or missing statuses to "available". */
export function parseStatus(x:unknown):AvailabilityStatus|null {
  const label=named(x).toLowerCase().replace(/[\-_]/g," ").trim();
  if(!label)return null;
  if(/^(?:out|inactive|ruled out|will not play|not playing|missing fixture|suspended|suspension|injured reserve)$/.test(label))return "out";
  if(/(?:doubtful|unlikely to play)/.test(label))return "doubtful";
  if(/(?:questionable|day to day|game time decision|gtd|uncertain)/.test(label))return "questionable";
  if(/(?:probable|likely to play)/.test(label))return "probable";
  if(/^(?:available|active|cleared to play|will play)$/.test(label))return "available";
  return null;
}
/** Current ESPN injury feed: accept player-list and team-group formats, no name guessing. */
export function parseEspnAvailability(data:unknown,sourceLeague=""):AvailabilityReport[]{
  const output:AvailabilityReport[]=[];
  const seen=new Set<string>();
  const walk=(node:unknown,inheritedTeam:string,depth:number)=>{
    if(depth>7)return;
    if(Array.isArray(node)){for(const item of node)walk(item,inheritedTeam,depth+1);return;}
    const obj=asObject(node);if(!obj)return;
    const team=named(obj.team)||named(obj.franchise)||named(obj.teamName)||inheritedTeam;
    const player=asObject(obj.athlete)||asObject(obj.player);
    const playerName=named(player)||asString(obj.athleteName)||asString(obj.playerName);
    const ownName=asString(obj.displayName)||asString(obj.fullName)||asString(obj.name);
    const groupEntries=Array.isArray(obj.injuries)?obj.injuries:null;
    // A player wrapper may contain many injury entries; the nested row can lack athlete.
    if(groupEntries&&ownName&&!playerName&&!obj.team&&groupEntries.some(v=>asObject(v)?.status||asObject(v)?.type)){
      for(const nested of groupEntries){
        const entry=asObject(nested);if(!entry)continue;
        const status=parseStatus(entry.status??entry.injuryStatus??entry.availability??entry.type);
        if(!status)continue;
        const reason=named(entry.details)||named(entry.type)||asString(entry.description)||"Keine Angabe";
        const date=isoTime(entry.date??entry.updated??entry.lastUpdated);
        const key=availabilityKey(ownName)+"|"+availabilityKey(team)+"|"+status;
        if(!seen.has(key)){output.push({name:ownName,team,league:sourceLeague,status,reason,source:"ESPN",updatedAt:date});seen.add(key);}
      }
    }
    const status=parseStatus(obj.status??obj.injuryStatus??obj.availability);
    if(status&&playerName){
      const reason=named(obj.details)||named(obj.type)||asString(obj.description)||"Keine Angabe";
      const date=isoTime(obj.updated??obj.date??obj.lastUpdated);
      const key=availabilityKey(playerName)+"|"+availabilityKey(team)+"|"+status;
      if(!seen.has(key)){output.push({name:playerName,team,league:sourceLeague,status,reason,source:"ESPN",updatedAt:date});seen.add(key);}
    }
    for(const field of ["injuries","items","athletes","players","teams","groups","entries"]){
      const children=obj[field];if(Array.isArray(children))walk(children,team,depth+1);
    }
  };
  walk(data,"",0);
  return output;
}
/** API-Football only reports absences for specific fixtures, not a general health claim. */
export function parseApiFootballAvailability(data:unknown,league:string,today:string):AvailabilityReport[]{
  const root=asObject(data);
  const values=Array.isArray(root?.response)?root.response:[];
  const output:AvailabilityReport[]=[];
  for(const value of values){
    const row=asObject(value);if(!row)continue;
    const name=named(row.player),team=named(row.team),fixture=asObject(row.fixture);
    const fixtureDate=asString(fixture?.date).slice(0,10);
    if(!name||!team||!/^\d{4}-\d{2}-\d{2}$/.test(fixtureDate)||fixtureDate<today)continue;
    const type=named(row.type),reason=named(row.reason)||"Keine Angabe";
    let status=parseStatus(type);
    if(!status){
      // Some plans expose "Injury" / "Suspension" as the type; a dated
      // fixture absence entry is still an absence for that fixture.
      if(/^(injury|suspension)$/i.test(type))status="out";
      else continue;
    }
    output.push({name,team,league,status,reason,source:"API-Football",gameDate:fixtureDate});
  }
  return output;
}
const NBA_ABBREVIATIONS:Record<string,string>={ATL:"Atlanta Hawks",BOS:"Boston Celtics",BKN:"Brooklyn Nets",CHA:"Charlotte Hornets",
  CHI:"Chicago Bulls",CLE:"Cleveland Cavaliers",DAL:"Dallas Mavericks",DEN:"Denver Nuggets",DET:"Detroit Pistons",
  GSW:"Golden State Warriors",HOU:"Houston Rockets",IND:"Indiana Pacers",LAC:"LA Clippers",LAL:"Los Angeles Lakers",
  MEM:"Memphis Grizzlies",MIA:"Miami Heat",MIL:"Milwaukee Bucks",MIN:"Minnesota Timberwolves",NOP:"New Orleans Pelicans",
  NYK:"New York Knicks",OKC:"Oklahoma City Thunder",ORL:"Orlando Magic",PHI:"Philadelphia 76ers",PHX:"Phoenix Suns",
  POR:"Portland Trail Blazers",SAC:"Sacramento Kings",SAS:"San Antonio Spurs",TOR:"Toronto Raptors",UTA:"Utah Jazz",WAS:"Washington Wizards"};
const nbaTeam=(name:string)=>canonicalNbaTeam(name)??NBA_ABBREVIATIONS[name.trim().toUpperCase()]??null;
const sameTeam=(sport:Sport,a:string,b:string)=>{
  if(sport==="nba")return !!nbaTeam(a)&&nbaTeam(a)===nbaTeam(b);
  return availabilityKey(a)===availabilityKey(b);
};
const relativeDay=(player:Forecast):string|null=>{
  const matched=player.nextGame?.match(/^\d{4}-\d{2}-\d{2}/);
  return matched?matched[0]:player.nextGameTipoff?.slice(0,10)??null;
};
/** Strict full-name matching, plus team check when both source and player provide it.
 * Without a provider team, a non-unique player name in the loaded pool is not matched. */
export function availabilityForPlayers(players:Forecast[],reports:AvailabilityReport[],sport:Sport):Record<string,AvailabilityReport>{
  const duplicates=new Map<string,number>();
  for(const p of players){const key=availabilityKey(p.name);duplicates.set(key,(duplicates.get(key)??0)+1);}
  const found:Record<string,AvailabilityReport>={};
  for(const player of players){
    const key=availabilityKey(player.name);
    const matches=reports.filter(r=>availabilityKey(r.name)===key&&(!r.team||sameTeam(sport,player.team,r.team))&&
      (r.team||duplicates.get(key)===1)&&(!r.gameDate||!relativeDay(player)||Math.abs(Date.parse(r.gameDate)-Date.parse(relativeDay(player)!))<=86400000));
    if(!matches.length)continue;
    // Prefer the strongest warning, rather than incorrectly treating the newest non-out report as a clearance.
    const rank:Record<AvailabilityStatus,number>={out:5,doubtful:4,questionable:3,probable:2,available:1};
    matches.sort((a,b)=>rank[b.status]-rank[a.status]);
    found[player.id]=matches[0];
  }
  return found;
}
export const availabilityLabels:Record<AvailabilityStatus,string>={out:"OUT · Fällt aus",doubtful:"DOUBTFUL · Unwahrscheinlich",questionable:"QUESTIONABLE · Fraglich",probable:"PROBABLE · Wahrscheinlich",available:"AVAILABLE · Gemeldet verfügbar"};
export const availabilityTone=(status:AvailabilityStatus)=>status==="out"?"out":status==="doubtful"?"doubtful":status==="questionable"?"questionable":status==="probable"?"probable":"available";
export const isConfirmedOut=(r:AvailabilityReport|undefined)=>r?.status==="out";
export function nextRefreshMs(now:Date,tipoffs:(string|undefined)[]):number {
  const distances=tipoffs.map(x=>x?Date.parse(x)-now.getTime():Infinity).filter(n=>Number.isFinite(n)&&n>=0);
  const min=distances.length?Math.min(...distances):Infinity;
  return min<=30*60000?5*60000:min<=2*3600000?10*60000:30*60000;
}

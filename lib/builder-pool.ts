import type {Forecast,Sport} from "./model";
import type {ScheduleData} from "./gameweek-center";
import {canonicalNbaTeam} from "./nba-fixture-mapping";

export type MatchdayHorizon="today"|"tomorrow"|24|72|168|null;
export type PoolSort="raw"|"q80"|"historical70"|"weighted"|"floor"|"ceiling"|"upside"|"l5"|"l10"|"play"|"stars"|"value"|"valueFloor"|"valueCeiling"|"name"|"matchup"|"games"|"kickoff";

/** The dashboard uses German calendar days, not UTC days or 24-hour rolling windows. */
export const berlinCalendarDay=(value:Date):string=>new Intl.DateTimeFormat("sv-SE",{
  timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit",
}).format(value);
export function offsetBerlinDay(now:Date,offset=0):string{
  const local=berlinCalendarDay(now);
  const date=new Date(`${local}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate()+offset);
  return date.toISOString().slice(0,10);
}
const realDate=(value:unknown):value is string=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`))&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;
const fixtureDay=(date:string,tipoff?:string):string|null=>{
  if(tipoff){
    const t=new Date(tipoff);
    if(!Number.isFinite(t.getTime()))return null;
    return berlinCalendarDay(t);
  }
  return realDate(date)?date:null;
};
/** No match means no proof: never include a player solely because their club or forecast looks plausible. */
export function playsOnBerlinDay(player:Pick<Forecast,"id"|"team"|"hasGame"|"nextGame"|"nextGameTipoff">,
  sport:Sport,day:string,nbaSchedule:ScheduleData):boolean{
  if(!realDate(day)||player.hasGame===false)return false;
  if(sport==="nba"){
    if(nbaSchedule.status!=="available")return false;
    const team=canonicalNbaTeam(player.team);
    if(!team)return false;
    return nbaSchedule.fixtures.some(f=>{
      if(fixtureDay(f.date,f.tipoff)!==day)return false;
      const home=canonicalNbaTeam(f.home),away=canonicalNbaTeam(f.away);
      return !!home&&!!away&&home!==away&&(team===home||team===away);
    });
  }
  // Football fixture comes from Sorare's current player-nextGame payload.
  // A date without home/away team is not a confirmed match.
  const fixture=/^(\d{4}-\d{2}-\d{2})\s+(.+?)\s+-\s+(.+)$/.exec(player.nextGame?.trim()??"");
  if(!fixture||fixture[2]==="?"||fixture[3]==="?"||!realDate(fixture[1]))return false;
  return fixtureDay(fixture[1],player.nextGameTipoff)===day;
}
export const expectedFloor=(p:Forecast):number=>p.floor*p.playProb;
export const expectedCeiling=(p:Forecast):number=>p.ceiling*p.playProb;
export const expectedUpside=(p:Forecast):number=>expectedCeiling(p)-p.weighted;
/** Sort always puts missing measurements last, irrespective of direction. */
export function comparePoolValues(a:number|null|undefined,b:number|null|undefined,descending=true):number{
  const valid=(n:number|null|undefined)=>typeof n==="number"&&Number.isFinite(n);
  if(!valid(a)&&!valid(b))return 0;
  if(!valid(a))return 1;
  if(!valid(b))return -1;
  return descending?(b as number)-(a as number):(a as number)-(b as number);
}

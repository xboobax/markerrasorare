/** NBA Stars Optimizer 3.0: verified schedule gates. Never infer a match from a forecast. */
import type {Forecast} from "./model";
import type {ScheduleData,UpcomingFixture} from "./gameweek-center";
import {canonicalNbaTeam} from "./nba-fixture-mapping";
import {berlinCalendarDay,offsetBerlinDay} from "./builder-pool";

export type StarsMatchdayWindow="today"|"24h"|"tomorrow"|"7d";
export type StarsBudget=11|16;
export const isStarsBudget=(value:unknown):value is StarsBudget=>value===11||value===16;
export const starsWindowLabel=(value:StarsMatchdayWindow)=>({today:"Heute", "24h":"Nächste 24 Stunden",tomorrow:"Morgen", "7d":"Nächste 7 Tage (Spielplan)"}[value]);
const validTipoff=(text:unknown):number|null=>{
  if(typeof text!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text))return null;
  const time=Date.parse(text);
  return Number.isFinite(time)&&/([zZ]|[+-]\d{2}:\d{2})$/.test(text)?time:null;
};
const validDay=(day:unknown):day is string=>typeof day==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&new Date(`${day}T00:00:00Z`).toISOString().slice(0,10)===day;
function matchesWindow(f:UpcomingFixture,window:StarsMatchdayWindow,now:Date):boolean{
  const when=validTipoff(f.tipoff);
  const clock=now.getTime();
  if(!Number.isFinite(clock))return false;
  if(window==="24h")return when!==null&&when>=clock&&when<clock+86_400_000;
  if(window==="7d"){
    // The NBA schedule is NOT a Sorare gameweek. Treat this as a clearly labeled seven-day window.
    if(when!==null)return when>=clock&&when<clock+7*86_400_000;
    return validDay(f.date)&&f.date>=berlinCalendarDay(now)&&f.date<offsetBerlinDay(now,7);
  }
  const expectedDay=offsetBerlinDay(now,window==="tomorrow"?1:0);
  if(when!==null)return when>=clock&&berlinCalendarDay(new Date(when))===expectedDay;
  // Provider confirms the game date, but not a kickoff: allow calendar-day filtering,
  // never the rolling 24-hour filter without an actual timestamp.
  return validDay(f.date)&&f.date===expectedDay;
}
export function eligibleNbaStarsIds(players:readonly Pick<Forecast,"id"|"team">[],schedule:ScheduleData,window:StarsMatchdayWindow,now:Date):Set<string>{
  if(schedule.status!=="available"||!Number.isFinite(now.getTime()))return new Set();
  const teamIds=new Set<string>();
  for(const fixture of schedule.fixtures){
    if(!matchesWindow(fixture,window,now))continue;
    const home=canonicalNbaTeam(fixture.home),away=canonicalNbaTeam(fixture.away);
    if(!home||!away||home===away)continue;
    teamIds.add(home);teamIds.add(away);
  }
  return new Set(players.filter(p=>{
    const team=canonicalNbaTeam(p.team);
    return team!==null&&teamIds.has(team);
  }).map(p=>p.id));
}
/** Independent recheck before inserting a full lineup; no partial transfer. */
export function verifyStarsTransfer(ids:readonly string[],starValues:ReadonlyMap<string,number|null|undefined>,allowed:ReadonlySet<string>,budget:StarsBudget):string|null{
  if(ids.length!==5||new Set(ids).size!==5)return "Ein Lineup muss genau fünf unterschiedliche Spieler enthalten.";
  if(ids.some(id=>!allowed.has(id)))return "Mindestens ein Spieler hat keinen bestätigten Termin im gewählten Zeitraum oder ist ausgeschlossen.";
  let used=0;
  for(const id of ids){
    const value=starValues.get(id);
    if(typeof value!=="number"||!Number.isFinite(value)||value<1||value>5||!Number.isInteger(value*2))return "Für mindestens einen Spieler fehlen gültige Sterne.";
    used+=value;
  }
  if(used>budget+1e-8)return `Das Lineup überschreitet das ${budget}-Sterne-Limit.`;
  return null;
}

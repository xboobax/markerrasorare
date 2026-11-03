import type {Forecast,Sport} from "./model";
import type {ScheduleData,UpcomingFixture} from "./gameweek-center";
import {addIsoDays} from "./gameweek-center";
import {canonicalNbaTeam} from "./nba-fixture-mapping";
import {validDefenseRating,matchupLabel,type OpponentRatings} from "./matchups";
import {checkPartial} from "./builder-neon";
import {isValidNbaStars,type CardInput} from "./arcade";
import {normalizeManualSelection,type ManualSelection,type ManualLineupResult} from "./manual-lineup";

export type GameOpportunity={fixtureId:string;date:string;tipoff?:string;opponent:string;home:boolean;source:UpcomingFixture["source"]};
export type GameWindow=3|7|14;
export type GameCoverage={status:ScheduleData["status"];gamesByTeam:Map<string,GameOpportunity[]>;window:GameWindow;from:string;until:string};
const berlinDate=(date:Date)=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
/** Scouting window: not an official Sorare Game Week. No invented games, dates or score multipliers. */
export function nbaGameCoverage(schedule:ScheduleData,now:Date,window:GameWindow):GameCoverage{
  const from=berlinDate(now),until=addIsoDays(from,window);
  const result=new Map<string,GameOpportunity[]>();
  if(schedule.status!=="available")return {status:schedule.status,gamesByTeam:result,window,from,until};
  const seen=new Set<string>();
  for(const f of schedule.fixtures){
    const home=canonicalNbaTeam(f.home),away=canonicalNbaTeam(f.away);
    if(!home||!away||home===away||f.date<from||f.date>=until)continue;
    if(f.tipoff){const t=Date.parse(f.tipoff);if(!Number.isFinite(t)||t<now.getTime())continue;}
    const signature=`${f.date}:${home}:${away}:${f.tipoff??""}`;
    if(seen.has(signature))continue;seen.add(signature);
    const push=(team:string,opponent:string,isHome:boolean)=>{
      const list=result.get(team)??[];
      list.push({fixtureId:f.id,date:f.date,tipoff:f.tipoff,opponent,home:isHome,source:f.source});
      result.set(team,list);
    };
    push(home,away,true);push(away,home,false);
  }
  for(const games of result.values())games.sort((a,b)=>(a.tipoff??a.date).localeCompare(b.tipoff??b.date));
  return {status:schedule.status,gamesByTeam:result,window,from,until};
}
export function opportunitiesForTeam(team:string,coverage:GameCoverage):GameOpportunity[]{
  return coverage.gamesByTeam.get(canonicalNbaTeam(team)??"")??[];
}
export type MatchupAssessment={rating:number|null;label:string;tone:"easy"|"neutral"|"hard"|"unknown";source:"rated"|"missing"};
/** Only explicit 1–5 ratings; aliases are resolved without guessing team strength. */
export function assessMatchup(opponent:string|undefined,ratings:OpponentRatings,sport:Sport):MatchupAssessment{
  const fallback:MatchupAssessment={rating:null,label:"Nicht bewertet",tone:"unknown",source:"missing"};
  if(!opponent)return fallback;
  let rating=ratings[opponent];
  if(!validDefenseRating(rating)&&sport==="nba"){
    const canonical=canonicalNbaTeam(opponent);
    if(canonical){
      const matches=Object.entries(ratings).filter(([name,value])=>canonicalNbaTeam(name)===canonical&&validDefenseRating(value));
      const unique=[...new Set(matches.map(([,value])=>value))];
      if(unique.length===1)rating=unique[0];
    }
  }
  if(!validDefenseRating(rating))return fallback;
  return {rating,label:matchupLabel(rating),tone:rating<=2?"easy":rating===3?"neutral":"hard",source:"rated"};
}
export type TeamBattle={left:ManualLineupResult;right:ManualLineupResult;sharedPlayers:number;sharedNames:string[];
  deltaScore:number;deltaFloor:number;deltaCeiling:number;deltaStars:number;goalDifference:number|null};
export function compareBuilderTeams(left:ManualLineupResult,right:ManualLineupResult,leftGoal:number|null,rightGoal:number|null):TeamBattle {
  const leftIds=new Set(left.picks.map(p=>p.player.id));
  const intersection=right.picks.filter(p=>leftIds.has(p.player.id));
  return {left,right,sharedPlayers:intersection.length,sharedNames:intersection.map(p=>p.player.name),
    deltaScore:left.projectedScore-right.projectedScore,deltaFloor:left.floorScore-right.floorScore,
    deltaCeiling:left.ceilingScore-right.ceilingScore,deltaStars:left.starsUsed-right.starsUsed,
    goalDifference:leftGoal!==null&&rightGoal!==null?leftGoal-rightGoal:null};
}
/** Touch + keyboard accessible complement to HTML5 drag/drop. Copy across teams or move, strictly validating both. */
export function transferWorkspacePlayer(args:{source:ManualSelection;target:ManualSelection;sourceSlot:number;targetSlot:number;
  sameTeam:boolean;mode:"copy"|"move";sport:Sport;cards:CardInput[];sourceLocks?:string[];targetLocks?:string[]}):{
    source:ManualSelection;target:ManualSelection;reason:string|null}{
  const source=normalizeManualSelection(args.source),target=args.sameTeam?source:normalizeManualSelection(args.target);
  const fail=(reason:string)=>({source,target,reason});
  const {sourceSlot,targetSlot}=args;
  if(!Number.isInteger(sourceSlot)||sourceSlot<0||sourceSlot>4||!Number.isInteger(targetSlot)||targetSlot<0||targetSlot>4)return fail("Ungültiger Slot.");
  const playerId=source[sourceSlot];if(!playerId)return fail("Kein Spieler im Ausgangsslot.");
  if(args.sourceLocks?.includes(playerId)&&args.mode==="move")return fail("Spieler ist fixiert und darf nicht verschoben werden.");
  const displaced=target[targetSlot];
  if(displaced&&args.targetLocks?.includes(displaced))return fail("Zielspieler ist fixiert.");
  if(args.sameTeam){
    if(args.mode==="copy")return fail("Innerhalb eines Teams darf ein Spieler nicht zweimal stehen.");
    if(sourceSlot===targetSlot)return {source,target,reason:null};
    const updated=source.slice();updated[sourceSlot]=displaced;updated[targetSlot]=playerId;
    const reason=checkPartial(updated,args.cards,args.sport);
    return reason?fail(reason):{source:updated,target:updated,reason:null};
  }
  const updatedTarget=target.slice();updatedTarget[targetSlot]=playerId;
  const updatedSource=source.slice();
  if(args.mode==="move"){
    // Do not silently discard a player already occupying the destination.
    updatedSource[sourceSlot]=displaced;
  }
  if(args.mode==="copy"&&target.includes(playerId))return fail("Dieser Spieler steht bereits im Zielteam.");
  const reason=checkPartial(updatedSource,args.cards,args.sport)||checkPartial(updatedTarget,args.cards,args.sport);
  return reason?fail(reason):{source:updatedSource,target:updatedTarget,reason:null};
}
/** A descriptive opportunity flag, NOT a Sorare Arcade score boost. */
export function multiGameLabel(count:number):string {return count>=3?`${count} Spiele`:count===2?"Double Game":"1 Spiel";}

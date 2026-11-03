import {ARCADE} from "../config/divination";
import {isValidNbaStars,slotAccepts,type CardInput,type Strategy} from "./arcade";
import {evaluateManualLineup,normalizeManualSelection,type ManualSelection} from "./manual-lineup";
import {estimateTargetChance} from "./target-probability";
import type {Sport} from "./model";

export type SelectionResult={selection:ManualSelection;reason:string|null};
export type SmartFillResult=SelectionResult & {added:number};
export type QuickSwap={id:string;name:string;team:string;newScore:number;delta:number;stars:number|null};
const required=(sport:Sport):readonly string[]=>sport==="nba"?ARCADE.nba.slots:ARCADE.football.slots;
const normalizedIds=(value:ManualSelection)=>normalizeManualSelection(value);
const validStars=(card:CardInput|undefined,sport:Sport)=>sport!=="nba"||isValidNbaStars(card?.stars);
const weighted=(card:CardInput,mode:Strategy)=>{
  const p=card.player;
  const bonus=1+Math.max(0,Math.min(50,card.bonusPercent??0))/100;
  return Math.max(0,(mode==="safe"?p.floor*p.playProb:mode==="upside"?p.ceiling*p.playProb:p.weighted)*bonus);
};
/** Validate partial/manual edits without treating an intentionally incomplete five-card lineup as invalid. */
export function checkPartial(selection:ManualSelection,cards:CardInput[],sport:Sport):string|null{
  const ids=normalizedIds(selection);const byId=new Map(cards.map(c=>[c.player.id,c]));
  const seen=new Set<string>();let stars=0;
  for(let i=0;i<5;i++){
    const id=ids[i];if(!id)continue;
    if(seen.has(id))return "Ein Spieler darf im selben Team nur einmal vorkommen.";
    seen.add(id);
    const card=byId.get(id);if(!card)return "Ein ausgewählter Spieler ist im aktuellen Spielerpool nicht geladen.";
    if(!slotAccepts(required(sport)[i],card.player.position))return `Spieler passt nicht auf Slot ${i+1}.`;
    if(!validStars(card,sport))return `Für ${card.player.name} fehlt eine gültige NBA-Sternebewertung.`;
    if(sport==="nba")stars+=card.stars!;
  }
  if(sport==="nba"&&stars>ARCADE.nba.maxStars+1e-9)return `NBA-Sternelimit überschritten: ${stars.toLocaleString("de-DE")} / 16 ★.`;
  return null;
}
/** Move / swap cards, including across teams. Both sets of constraints must hold. */
export function moveBetweenSelections(args:{source:ManualSelection;target:ManualSelection;sourceSlot:number;targetSlot:number;sameTeam:boolean;sport:Sport;cards:CardInput[];sourceLocks?:string[];targetLocks?:string[]}):{source:ManualSelection;target:ManualSelection;reason:string|null}{
  const {sourceSlot,targetSlot,sameTeam,sport,cards}=args;
  const source=normalizedIds(args.source),target=sameTeam?source:normalizedIds(args.target);
  const no=(reason:string)=>({source,target,reason});
  if(!Number.isInteger(sourceSlot)||!Number.isInteger(targetSlot)||sourceSlot<0||sourceSlot>4||targetSlot<0||targetSlot>4)return no("Ungültiger Slot.");
  if(sameTeam&&sourceSlot===targetSlot)return {source,target,reason:null};
  const selected=source[sourceSlot];if(!selected)return no("Im Ausgangsslot ist kein Spieler.");
  const displaced=target[targetSlot];
  if(args.sourceLocks?.includes(selected))return no("Diesen Spieler zuerst entsperren, um ihn zu verschieben.");
  if(displaced&&args.targetLocks?.includes(displaced))return no("Der Zielspieler ist fixiert. Bitte erst entsperren.");
  if(sameTeam){
    const next=source.slice();next[sourceSlot]=displaced;next[targetSlot]=selected;
    const error=checkPartial(next,cards,sport);
    return error?no(error):{source:next,target:next,reason:null};
  }
  const nextFrom=source.slice(),nextTo=target.slice();
  nextFrom[sourceSlot]=displaced;nextTo[targetSlot]=selected;
  const error=checkPartial(nextFrom,cards,sport)||checkPartial(nextTo,cards,sport);
  return error?no(error):{source:nextFrom,target:nextTo,reason:null};
}

/** Only empty slots are filled. No manual pick or locked card is displaced or reordered.
 * Bounded beam search with explicit slot/duplicate/budget validation; target is a model estimate.
 */
export function smartFillEmptySlots(selection:ManualSelection,cards:CardInput[],sport:Sport,options:{strategy?:Strategy;targetScore?:number|null;excludedIds?:string[];maxCandidates?:number;beamWidth?:number;allowedIds?:string[]}={}):SmartFillResult{
  const current=normalizedIds(selection);const invalid=checkPartial(current,cards,sport);
  if(invalid)return {selection:current,reason:invalid,added:0};
  const open=Array.from({length:5},(_,i)=>i).filter(i=>!current[i]);
  if(!open.length)return {selection:current,reason:"Alle Slots sind bereits belegt. Für einen neuen Vorschlag nutze Quick Swap.",added:0};
  const strategy=options.strategy??"balanced";
  const byId=new Map(cards.map(c=>[c.player.id,c]));
  const excluded=new Set(options.excludedIds??[]);
  const allowed=options.allowedIds?new Set(options.allowedIds):null;
  const occupied=new Set(current.filter((id):id is string=>!!id));
  const possible=cards.filter(card=>(!allowed||allowed.has(card.player.id))&&!occupied.has(card.player.id)&&!excluded.has(card.player.id)&&card.player.hasGame!==false&&
    Number.isFinite(card.player.weighted)&&card.player.weighted>0&&validStars(card,sport));
  type State={selection:ManualSelection;used:Set<string>;stars:number;rank:number};
  const existingStars=current.reduce((sum,id)=>sum+(id&&sport==="nba"?byId.get(id)?.stars??0:0),0);
  const initialRank=current.reduce((sum,id)=>sum+(id&&byId.has(id)?weighted(byId.get(id)!,strategy):0),0);
  let beam:State[]=[{selection:current,used:new Set(occupied),stars:existingStars,rank:initialRank}];
  for(const [step,slotIndex] of open.entries()){
    const byScore=possible.filter(c=>slotAccepts(required(sport)[slotIndex],c.player.position))
      .sort((a,b)=>weighted(b,strategy)-weighted(a,strategy));
    // Include affordable high-value NBA options so an expensive top ranking cannot exhaust the budget.
    const cap=Math.max(30,Math.min(160,options.maxCandidates??100));
    const pool=sport==="nba"?[...new Map([...byScore.slice(0,cap),...byScore.slice().sort((a,b)=>(a.stars??5)-(b.stars??5)).slice(0,Math.min(35,cap))].map(c=>[c.player.id,c])).values()]
      :byScore.slice(0,cap);
    const next:State[]=[];
    for(const state of beam){
      for(const card of pool){
        if(state.used.has(card.player.id))continue;
        const starTotal=state.stars+(sport==="nba"?card.stars!:0);
        if(sport==="nba"&&starTotal+(open.length-step-1)>ARCADE.nba.maxStars+1e-9)continue;
        const result=state.selection.slice();result[slotIndex]=card.player.id;
        next.push({selection:result,used:new Set([...state.used,card.player.id]),stars:starTotal,rank:state.rank+weighted(card,strategy)});
      }
    }
    next.sort((a,b)=>b.rank-a.rank);
    beam=next.slice(0,Math.max(20,Math.min(350,options.beamWidth??220)));
    if(!beam.length)return {selection:current,reason:"Für die freien Slots wurde keine gültige Aufstellung gefunden. Prüfe Positionen, Sterne oder ausgeschlossene Spieler.",added:0};
  }
  const valid=beam.filter(item=>evaluateManualLineup(item.selection,cards,sport,options.targetScore).valid);
  if(!valid.length)return {selection:current,reason:"Die verfügbaren Spieler ergeben kein vollständig regelkonformes Team.",added:0};
  // Probability optimization: rank actual finished candidates rather than treating probabilities as additive.
  if(strategy==="target"&&options.targetScore&&options.targetScore>0){
    const objective=(item:State)=>{
      const evaluated=evaluateManualLineup(item.selection,cards,sport,options.targetScore);
      return estimateTargetChance(evaluated.picks,options.targetScore!) ?? -1;
    };
    valid.sort((a,b)=>objective(b)-objective(a));
  }
  return {selection:valid[0].selection,reason:null,added:open.length};
}

/** Show feasible improvements for a particular slot; never change a lineup silently. */
export function quickSwapsForSlot(selection:ManualSelection,slotIndex:number,cards:CardInput[],sport:Sport,excludedIds:string[]=[],limit=5):QuickSwap[]{
  const ids=normalizedIds(selection),oldId=ids[slotIndex];
  if(slotIndex<0||slotIndex>=5||!oldId)return [];
  const current=evaluateManualLineup(ids,cards,sport);
  const excluded=new Set(excludedIds),used=new Set(ids.filter((id):id is string=>!!id));
  const suggestions:QuickSwap[]=[];
  for(const card of cards){
    if(used.has(card.player.id)||excluded.has(card.player.id)||card.player.hasGame===false||
      !slotAccepts(required(sport)[slotIndex],card.player.position)||!validStars(card,sport)||
      !(card.player.weighted>0))continue;
    const updated=ids.slice();updated[slotIndex]=card.player.id;
    if(checkPartial(updated,cards,sport))continue;
    const result=evaluateManualLineup(updated,cards,sport);
    suggestions.push({id:card.player.id,name:card.player.name,team:card.player.team,
      newScore:result.projectedScore,delta:result.projectedScore-current.projectedScore,
      stars:sport==="nba"?card.stars??null:null});
  }
  return suggestions.sort((a,b)=>b.newScore-a.newScore).slice(0,Math.max(1,Math.min(12,limit)));
}

export function goalMeter(projected:number,target:number|null|undefined){
  if(!(typeof target==="number"&&Number.isFinite(target)&&target>0))return null;
  return {percentage:Math.max(0,Math.min(100,projected/target*100)),difference:projected-target,remaining:Math.max(0,target-projected)};
}

import {ARCADE} from "../config/divination";
import {isValidNbaStars,slotAccepts,type CardInput} from "./arcade";
import {emptyManualSelection,normalizeManualSelection,type ManualSelection} from "./manual-lineup";
import type {Sport} from "./model";

export type WorkspaceTeam = {id:string;selection:ManualSelection;goal:number|null;collapsed:boolean;locks:string[]};
export type WorkspaceData = {teams:WorkspaceTeam[];activeTeamId:string};
const isGoal=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v)&&v>0&&v<=10000;
export const workspaceKey=(sport:Sport)=>`markerras.sorare.builder-workspace.v23.${sport}`;
export const initialTeams=():WorkspaceTeam[]=>Array.from({length:4},(_,i)=>({id:`team-${i+1}`,selection:emptyManualSelection(),goal:null,collapsed:false,locks:[]}));
export function restoreWorkspace(raw:unknown,legacy:unknown):WorkspaceData {
  const fallback=initialTeams();
  if(raw&&typeof raw==="object"&&!Array.isArray(raw)) {
    const input=raw as {teams?:unknown;activeTeamId?:unknown};
    if(Array.isArray(input.teams)&&input.teams.length) {
      const usedIds=new Set<string>();
      const teams:WorkspaceTeam[]=input.teams.slice(0,6).map((row,index)=>{
        const obj=row&&typeof row==="object"&&!Array.isArray(row)?row as Record<string,unknown>:{};
        const parsedId=typeof obj.id==="string"&&/^team-[1-9][0-9]{0,3}$/.test(obj.id)?obj.id:`team-${index+1}`;
        const id=usedIds.has(parsedId)?`team-${index+7}`:parsedId;
        usedIds.add(id);
        return {id,selection:normalizeManualSelection(obj.selection),
          goal:isGoal(obj.goal)?obj.goal:null,collapsed:obj.collapsed===true,
          locks:Array.isArray(obj.locks)?[...new Set(obj.locks.filter((id:unknown)=>typeof id==="string"&&normalizeManualSelection(obj.selection).includes(id)))].slice(0,5) as string[]:[]};
      });
      return {teams,activeTeamId:teams.some(t=>t.id===input.activeTeamId)?String(input.activeTeamId):teams[0].id};
    }
  }
  // Preserve all V2.2 manual work on first launch: current selection + 3 saved presets.
  if(legacy&&typeof legacy==="object"&&!Array.isArray(legacy)) {
    const input=legacy as {selection?:unknown;presets?:Record<string,unknown>};
    fallback[0].selection=normalizeManualSelection(input.selection);
    for(let i=1;i<4;i++)fallback[i].selection=normalizeManualSelection(input.presets?.[String(i)]);
  }
  return {teams:fallback,activeTeamId:fallback[0].id};
}
export type PlacementResult={selection:ManualSelection;index:number|null;reason:string|null};
export function placeInTeam(selection:ManualSelection,playerId:string,cards:CardInput[],sport:Sport,requestedSlot:number|null=null):PlacementResult {
  const current=normalizeManualSelection(selection);
  const card=cards.find(c=>c.player.id===playerId);
  if(!card)return {selection:current,index:null,reason:"Spieler ist im geladenen Pool nicht verfügbar."};
  if(current.includes(playerId))return {selection:current,index:null,reason:`${card.player.name} steht bereits in diesem Team.`};
  const slots=sport==="nba"?ARCADE.nba.slots:ARCADE.football.slots;
  const free=slots.findIndex((s,i)=>!current[i]&&slotAccepts(s,card.player.position));
  const index=requestedSlot!==null&&Number.isInteger(requestedSlot)&&requestedSlot>=0&&requestedSlot<5
    ? requestedSlot:free;
  if(index<0)return {selection:current,index:null,reason:"Kein freier passender Slot in diesem Team. Wähle eine belegte Karte zum Tauschen."};
  if(!slotAccepts(slots[index],card.player.position))return {selection:current,index:null,reason:"Dieser Spieler passt nicht auf die ausgewählte Position."};
  const next=current.slice();next[index]=playerId;
  if(sport==="nba") {
    const byId=new Map(cards.map(c=>[c.player.id,c]));
    const total=next.reduce((sum,id)=>sum+(id&&isValidNbaStars(byId.get(id)?.stars)?byId.get(id)!.stars!:0),0);
    if(total>ARCADE.nba.maxStars)return {selection:current,index:null,reason:`Der Wechsel würde das NBA-Limit von 16 Sternen überschreiten (${total.toLocaleString("de-DE")} ★).`};
  }
  return {selection:next,index,reason:null};
}
export function gameDate(player:{nextGame?:string;nextGameTipoff?:string}):Date|null {
  if(player.nextGameTipoff){
    const exact=new Date(player.nextGameTipoff);
    if(Number.isFinite(exact.getTime()))return exact;
  }
  const value=player.nextGame?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(!value)return null;
  const date=new Date(`${value[1]}-${value[2]}-${value[3]}T00:00:00Z`);
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value[0]?date:null;
}
export function withinHorizon(date:Date|null,horizon:number|null,now:Date,hasTime=false):boolean {
  if(hasTime)return horizon===null?true:date!==null&&date.getTime()>=now.getTime()&&date.getTime()<=now.getTime()+horizon*3600000;
  if(horizon===null)return true;
  if(!date)return false;
  // Date-only Sorare fixtures have no verified kickoff: include the entire selected final day.
  const dayMs=24*3600*1000;
  const end=Math.ceil((now.getTime()+horizon*3600*1000)/dayMs)*dayMs;
  return date.getTime()+dayMs>=now.getTime() && date.getTime()<end;
}

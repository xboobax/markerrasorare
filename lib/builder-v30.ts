/** V3.0 strategy controls. The estimated q80 is NOT a calibrated Sorare prediction. */
import type {Sport,Forecast} from "./model";
import type {CardInput,OptimizedLineup} from "./arcade";
import {mixtureQuantile} from "./forecast-v18";

export type ProjectionMode="ps"|"q80"|"raw";
export type StackMode="none"|"defensive"|"offensive"|"team";
export type AutoPreset="balanced"|"safe"|"ceiling"|"custom";
export type BuilderV30Settings={projection:ProjectionMode;stack:StackMode;avoidOpponents:boolean;
  excludedLeagues:string[];maxUses:number;extraPosition:"ANY"|"DEF"|"MID"|"FWD";
  minProjected:number|null;preferPrimary:boolean;preferClassic:boolean;preset:AutoPreset;};
export type BuilderV30State={scope:"all"|"team";global:BuilderV30Settings;teams:Record<string,BuilderV30Settings>};
export const initialV30Settings=():BuilderV30Settings=>({projection:"ps",stack:"none",avoidOpponents:false,
  excludedLeagues:[],maxUses:6,extraPosition:"ANY",minProjected:null,preferPrimary:false,preferClassic:false,preset:"balanced"});
export const initialV30State=():BuilderV30State=>({scope:"all",global:initialV30Settings(),teams:{}});
export const v30Key=(sport:Sport)=>`markerras.sorare.builder-settings.v30.${sport}`;
const finite=(n:unknown)=>typeof n==="number"&&Number.isFinite(n);
export function normalizeV30Settings(raw:unknown):BuilderV30Settings{
  const input=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
  const defaults=initialV30Settings();
  return {...defaults,
    projection:["ps","q80","raw"].includes(String(input.projection))?input.projection as ProjectionMode:"ps",
    stack:["none","defensive","offensive","team"].includes(String(input.stack))?input.stack as StackMode:"none",
    avoidOpponents:input.avoidOpponents===true,
    excludedLeagues:Array.isArray(input.excludedLeagues)?[...new Set(input.excludedLeagues.filter((v):v is string=>typeof v==="string"&&v.length<=80))].slice(0,20):[],
    maxUses:finite(input.maxUses)?Math.max(1,Math.min(6,Math.round(input.maxUses as number))):6,
    extraPosition:["ANY","DEF","MID","FWD"].includes(String(input.extraPosition))?input.extraPosition as BuilderV30Settings["extraPosition"]:"ANY",
    minProjected:finite(input.minProjected)&&(input.minProjected as number)>0&& (input.minProjected as number)<=2000?input.minProjected as number:null,
    preferPrimary:input.preferPrimary===true,preferClassic:input.preferClassic===true,
    preset:["balanced","safe","ceiling","custom"].includes(String(input.preset))?input.preset as AutoPreset:"balanced"};
}
export function restoreV30State(raw:unknown):BuilderV30State{
  const x=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
  const teams=x.teams&&typeof x.teams==="object"&&!Array.isArray(x.teams)?x.teams as Record<string,unknown>:{};
  return {scope:x.scope==="team"?"team":"all",global:normalizeV30Settings(x.global),teams:Object.fromEntries(Object.entries(teams).filter(([id])=>/^team-[1-9]\d{0,3}$/.test(id)).slice(0,10).map(([id,v])=>[id,normalizeV30Settings(v)]))};
}
export const v30ForTeam=(state:BuilderV30State,teamId:string)=>state.scope==="all"?state.global:state.teams[teamId]??state.global;
export function presetSettings(preset:Exclude<AutoPreset,"custom">,current:BuilderV30Settings):BuilderV30Settings{
  return {...current,preset,projection:preset==="ceiling"?"q80":"ps",stack:"none",avoidOpponents:preset==="safe",minProjected:null};
}
/** V3.0 returns conditional Q80 from the unified distribution. Older models retain their legacy estimation. */
export function estimatedQ80(p:Forecast):number|null{
  const tagged=p as Forecast & {modelV3Active?:boolean;modelV3?:{applicable:boolean;q80Raw:number|null}};
  if(tagged.modelV3Active && tagged.modelV3?.applicable)return tagged.modelV3.q80Raw;
  const scores=(p.recentScores??[]).filter(v=>finite(v)&&v>=0&&v<=200);
  if(scores.length<8||p.forecastSources.length===0||!finite(p.expected)||!finite(p.variability))return null;
  return Math.max(0,mixtureQuantile(p.expected,Math.max(p.variability,4),p.playProb,.8));
}
export function projectionValue(card:CardInput,mode:ProjectionMode):number|null{
  const q80=mode==="q80"?estimatedQ80(card.player):null;
  // The Q80 shown in the table is conditional. Auto-selection should still
  // account for missed games; the legacy Q80 already contains its own DNP mass.
  const isV3=Boolean((card.player as Forecast & {modelV3Active?:boolean}).modelV3Active);
  const weighted=mode==="q80" && q80!==null && isV3?q80*card.player.playProb:
    mode==="q80"?q80:card.player.weighted;
  if(weighted===null||!finite(weighted)||weighted<=0)return null;
  return weighted*(mode==="raw"?1:1+Math.max(0,Math.min(50,card.bonusPercent??0))/100);
}
export function historical70Plus(p:Forecast):number|null{
  const scores=(p.recentScores??[]).filter(v=>finite(v)&&v>=0&&v<=200);
  return scores.length>=8?100*scores.filter(v=>v>=70).length/scores.length:null;
}
const clubKey=(s:string)=>s.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\b(fc|cf|sc|sv|afc|club)\b/g,"").replace(/[^a-z0-9]/g,"").trim();
export function opponentsAreMatched(a:Pick<Forecast,"team"|"opponent">,b:Pick<Forecast,"team"|"opponent">):boolean{
  if(!a.opponent&&!b.opponent)return false;
  const x=clubKey(a.team),y=clubKey(b.team);
  return x.length>=4&&y.length>=4&&x!==y&&((a.opponent&&clubKey(a.opponent)===y)||(b.opponent&&clubKey(b.opponent)===x))===true;
}
export function satisfiesV30Constraints(picks:{player:Forecast;slot:string}[],sport:Sport,settings:BuilderV30Settings):boolean{
  if(sport==="football"){
    const flex=picks.find(p=>p.slot==="FLEX");
    if(settings.extraPosition!=="ANY"&&flex?.player.position!==settings.extraPosition)return false;
    if(settings.stack==="defensive"&&!picks.some(g=>g.player.position==="GK"&&picks.some(d=>d.player.position==="DEF"&&clubKey(g.player.team)===clubKey(d.player.team))))return false;
    if(settings.stack==="offensive"&&!picks.some(m=>m.player.position==="MID"&&picks.some(f=>f.player.position==="FWD"&&clubKey(m.player.team)===clubKey(f.player.team))))return false;
    if(settings.stack==="team"){
      const teams=new Map<string,number>();for(const p of picks){const key=clubKey(p.player.team);teams.set(key,(teams.get(key)??0)+1);}
      if(![...teams.values()].some(n=>n>=3))return false;
    }
  }
  if(settings.avoidOpponents)for(let i=0;i<picks.length;i++)for(let j=i+1;j<picks.length;j++)if(opponentsAreMatched(picks[i].player,picks[j].player))return false;
  return true;
}
/** A lower bound can include the automatic football captain only on completed lineups. */
export function reachesV30Minimum(lineup:OptimizedLineup,sport:Sport,settings:BuilderV30Settings):boolean{
  if(settings.minProjected===null)return true;
  const captain=sport==="football"?Math.max(0,...lineup.picks.map(p=>p.player.weighted))*.5:0;
  return lineup.projectedScore+captain>=settings.minProjected;
}
export function limitLineupReuse(lines:OptimizedLineup[],maxUses:number,limit=5):OptimizedLineup[]{
  const counts=new Map<string,number>(),selected:OptimizedLineup[]=[];
  for(const line of lines){
    if(line.picks.some(p=>(counts.get(p.player.id)??0)>=maxUses))continue;
    selected.push(line);for(const pick of line.picks)counts.set(pick.player.id,(counts.get(pick.player.id)??0)+1);
    if(selected.length>=limit)break;
  }return selected;
}

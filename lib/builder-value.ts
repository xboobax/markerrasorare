import {isValidNbaStars} from "./arcade";
import type {Forecast} from "./model";

export type NbaValueMode = "all" | "projection" | "floor" | "ceiling";
type ValueData = Pick<Forecast,"weighted"|"floor"|"ceiling"|"playProb"|"forecastSources">;

/** Expected Sorare points per official/manual star. Floors and ceilings are model estimates, not guarantees. */
export function nbaValueScore(player:ValueData,stars:unknown,mode:Exclude<NbaValueMode,"all">):number|null{
  if(!isValidNbaStars(stars)||!player.forecastSources.length)return null;
  const score=mode==="floor"?player.floor*player.playProb:mode==="ceiling"?player.ceiling*player.playProb:player.weighted;
  return Number.isFinite(score)&&score>=0?score/stars:null;
}
/** Restrict to the strongest quartile among CURRENTLY ELIGIBLE players, keeping ties at the cutoff. */
export function topNbaValuePlayers<T extends ValueData&{id:string}>(players:T[],stars:Record<string,unknown>,mode:NbaValueMode):T[]{
  if(mode==="all")return players;
  const ranked=players.map(p=>({p,score:nbaValueScore(p,stars[p.id],mode)}))
    .filter((r):r is {p:T;score:number}=>r.score!==null)
    .sort((a,b)=>b.score-a.score||a.p.id.localeCompare(b.p.id));
  if(!ranked.length)return [];
  const at=Math.max(0,Math.ceil(ranked.length*.25)-1),cutoff=ranked[at].score;
  const ids=new Set(ranked.filter(r=>r.score>=cutoff-1e-9).map(r=>r.p.id));
  return players.filter(p=>ids.has(p.id));
}

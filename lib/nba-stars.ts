import {isValidNbaStars} from "./arcade";

/** Official NBA star tier, not an L10-derived guess. Null means not confirmed. */
export type NbaStarRatings = Record<string,number>;
export type NbaStarSource = "sorare" | "manual" | "missing";
export type NbaStarValue = { stars:number|null; source:NbaStarSource };
export type NbaStarSync = {
  ratings:NbaStarRatings;
  requested:number;
  received:number;
  failedChunks:number;
  fetchedAt:string;
  partial:boolean;
  source:"NBAPlayer.gameplayTierStars";
};

export function officialStarValue(value:unknown):number|null {
  return isValidNbaStars(value)?value:null;
}
export function nbaStarValue(official:unknown, manual:unknown):NbaStarValue {
  const verified=officialStarValue(official);
  if(verified!==null)return {stars:verified,source:"sorare"};
  const fallback=officialStarValue(manual);
  return fallback!==null?{stars:fallback,source:"manual"}:{stars:null,source:"missing"};
}
export function validatedRatings(raw:unknown,requested:Set<string>):NbaStarRatings {
  const out:NbaStarRatings=Object.create(null);
  if(!raw||typeof raw!=="object"||Array.isArray(raw))return out;
  for(const [slug,value] of Object.entries(raw)) {
    const stars=officialStarValue(value);
    if(requested.has(slug)&&stars!==null)out[slug]=stars;
  }
  return out;
}

import type {Sport} from "./model";
export const watchlistKey=(sport:Sport)=>`markerras.sorare.watchlist.v19.${sport}`;
export function parseWatchlist(value:unknown):string[] {
  if(!Array.isArray(value))return [];
  return [...new Set(value.filter((id):id is string=>typeof id==="string" && id.length>0 && id.length<=256))].slice(0,1000);
}
export function toggleWatchlist(watchlist:string[],id:string):string[] {
  if(!id || id.length>256)return watchlist;
  return watchlist.includes(id)?watchlist.filter(item=>item!==id):[...watchlist,id].slice(0,1000);
}

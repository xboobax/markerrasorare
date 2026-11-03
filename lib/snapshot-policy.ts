import type {Sport, Forecast} from "./model";
import {fixtureDay} from "./tracking-auto";

/** Snapshots must exist before the fixture, not after kickoff.
 * Sorare's nextGame field currently carries only a calendar date in this UI;
 * to avoid same-day leakage, automated capture requires a FUTURE date.
 */
export function automaticSnapshotCandidates<T extends Forecast>(players:T[],sport:Sport,now:Date,max=20):T[]{
  const today=now.toISOString().slice(0,10);
  if(sport!=="nba"&&sport!=="football")return [];
  const byId=new Set<string>();
  return players
    .filter(p=>Boolean(fixtureDay(p.nextGame))&&fixtureDay(p.nextGame)!>today&&
      p.hasGame!==false&&p.forecastSources.length>0&&p.expected>0&&p.playProb>0)
    .sort((a,b)=>b.weighted-a.weighted)
    .filter(p=>{if(byId.has(p.id))return false;byId.add(p.id);return true;})
    .slice(0,Math.max(0,Math.min(50,Math.floor(max))));
}

import type { Forecast, Sport } from "./model";

/** Private per-browser forecast snapshots. This is not a backend leaderboard or
 * an automatic official result reconciliation. The user enters the real score.
 */
export type TrackedPrediction = {
  key: string;
  sport: Sport;
  playerId: string;
  playerName: string;
  team: string;
  fixture: string | null;
  savedAt: string;
  predicted: number;
  playProbability: number;
  actual: number | null;
};

export function createTrackedPrediction(p: Forecast, sport: Sport, now = new Date()): TrackedPrediction {
  const fixture = p.nextGame ?? null;
  return {
    key: `${sport}:${p.id}:${fixture ?? now.toISOString().slice(0,10)}`,
    sport, playerId: p.id, playerName: p.name, team: p.team,
    fixture, savedAt: now.toISOString(), predicted: Math.round(p.weighted * 10)/10,
    playProbability: p.playProb, actual: null,
  };
}
export function upsertTracked(items: TrackedPrediction[], entry: TrackedPrediction): TrackedPrediction[] {
  if (items.some(item => item.key === entry.key)) return items;
  return [entry, ...items].slice(0, 200);
}
export function setActual(items: TrackedPrediction[], key: string, actual: number | null): TrackedPrediction[] {
  if (actual !== null && (!Number.isFinite(actual) || actual < 0 || actual > 500)) return items;
  return items.map(i => i.key === key ? {...i, actual} : i);
}
export function trackingMetrics(items: TrackedPrediction[]) {
  const done = items.filter((x): x is TrackedPrediction & {actual: number} =>
    typeof x.actual === "number" && Number.isFinite(x.actual));
  const n = done.length;
  if (!n) return {count:0, mae:null, rmse:null, bias:null};
  const errors = done.map(x => x.predicted - x.actual);
  const round = (v:number) => Math.round(v*10)/10;
  return {
    count:n,
    mae:round(errors.reduce((s,e) => s + Math.abs(e),0)/n),
    rmse:round(Math.sqrt(errors.reduce((s,e) => s + e*e,0)/n)),
    bias:round(errors.reduce((s,e) => s + e,0)/n),
  };
}

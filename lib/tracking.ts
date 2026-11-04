import type { Forecast, Sport } from "./model";
import type { AutomaticResult } from "./tracking-auto";

/** Snapshots stay in the browser. The predicted value is never recalculated
 * retroactively when today's model or player metadata changes. */
export type TrackingModelSnapshot = {
  baselinePredicted: number;
  advancedPredicted: number;
  intervalP10: number;
  intervalP90: number;
  modelVersion: "1.8.0";
  selectedMode: "classic" | "v18";
};

export type TrackedPrediction = {
  key: string;
  sport: Sport;
  playerId: string;
  playerName: string;
  team: string;
  position?: string; // frozen at snapshot time, never inferred retroactively
  fixture: string | null;
  savedAt: string;
  predicted: number;
  playProbability: number;
  actual: number | null;
  actualSource?: "manual" | "sorare";
  actualGameDate?: string;
  baselinePredicted?: number; // original V1.7 model at snapshot time
  advancedPredicted?: number; // V1.8 challenger, frozen before game
  intervalP10?: number;
  intervalP90?: number;
  modelVersion?: "1.8.0";
  selectedMode?: "classic" | "v18";
};

export function createTrackedPrediction(p: Forecast, sport: Sport, now = new Date(), comparison?: TrackingModelSnapshot): TrackedPrediction {
  const fixture = p.nextGame ?? null;
  return {
    key: `${sport}:${p.id}:${fixture ?? now.toISOString().slice(0,10)}`,
    sport, playerId: p.id, playerName: p.name, team: p.team, position:p.position,
    fixture, savedAt: now.toISOString(), predicted: Math.round(p.weighted * 10)/10,
    playProbability: p.playProb, actual: null,
    ...(comparison ? {baselinePredicted:Math.round(comparison.baselinePredicted*10)/10,
      advancedPredicted:Math.round(comparison.advancedPredicted*10)/10,
      intervalP10:Math.round(comparison.intervalP10*10)/10,
      intervalP90:Math.round(comparison.intervalP90*10)/10,
      modelVersion:comparison.modelVersion, selectedMode:comparison.selectedMode} : {}),
  };
}
export function upsertTracked(items: TrackedPrediction[], entry: TrackedPrediction): TrackedPrediction[] {
  if (items.some(item => item.key === entry.key)) return items;
  return [entry, ...items].slice(0, 1500);
}
export function setActual(items: TrackedPrediction[], key: string, actual: number | null): TrackedPrediction[] {
  if (actual !== null && (!Number.isFinite(actual) || actual < 0 || actual > 500)) return items;
  return items.map(i => i.key === key ? {...i, actual, actualSource:actual === null ? undefined : "manual",
    actualGameDate:undefined} : i);
}

/** Only populate empty results. Never overwrite an existing manual result or
 * an already reconciled official result. The snapshot's predicted value is immutable. */
export function applyOfficialResults(items: TrackedPrediction[], results: AutomaticResult[]): TrackedPrediction[] {
  const byKey = new Map(results.filter(r => Number.isFinite(r.score) && r.score >= 0 && r.score <= 500 &&
    typeof r.gameDate === "string" && Number.isFinite(Date.parse(r.gameDate)))
    .map(r => [r.key,r]));
  return items.map(i => {
    const found = byKey.get(i.key);
    if (!found || i.actual !== null) return i;
    return {...i, actual: found.score, actualSource:"sorare" as const, actualGameDate:found.gameDate};
  });
}

/** Defensive schema for local backups; never import executable or unknown fields. */
export function parseTrackingBackup(raw: unknown, sport: Sport): TrackedPrediction[] {
  const value = Array.isArray(raw) ? raw : (raw && typeof raw === "object" && "items" in raw ? (raw as any).items : null);
  if (!Array.isArray(value) || value.length > 1500) return [];
  const used = new Set<string>();
  const out: TrackedPrediction[] = [];
  for (const r of value) {
    if (!r || typeof r !== "object" || r.sport !== sport || typeof r.key !== "string" ||
      r.key.length > 500 || !r.key.startsWith(`${sport}:`) || used.has(r.key) ||
      typeof r.playerId !== "string" || !/^[a-z0-9-]{2,130}$/i.test(r.playerId) ||
      typeof r.playerName !== "string" || r.playerName.length > 160 ||
      typeof r.team !== "string" || r.team.length > 160 ||
      typeof r.savedAt !== "string" || !Number.isFinite(Date.parse(r.savedAt)) ||
      (r.fixture !== null && typeof r.fixture !== "string" && r.fixture !== undefined) ||
      (typeof r.fixture === "string" && r.fixture.length > 220) ||
      typeof r.predicted !== "number" || !Number.isFinite(r.predicted) || r.predicted < 0 || r.predicted > 500 ||
      typeof r.playProbability !== "number" || !Number.isFinite(r.playProbability) ||
      r.playProbability < 0 || r.playProbability > 1 ||
      (r.actual !== null && (typeof r.actual !== "number" || !Number.isFinite(r.actual) || r.actual < 0 || r.actual > 500))) continue;
    used.add(r.key);
    const validModel = r.modelVersion === "1.8.0" &&
      [r.baselinePredicted,r.advancedPredicted,r.intervalP10,r.intervalP90].every(x =>
        typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 500) &&
      r.intervalP10 <= r.intervalP90 && (r.selectedMode === "classic" || r.selectedMode === "v18");
    out.push({key:r.key,sport:r.sport,playerId:r.playerId,playerName:r.playerName,team:r.team,
      position:typeof r.position === "string" && /^(GK|DEF|MID|FWD|FLEX|G|F|C|ANY)$/.test(r.position) ? r.position : undefined,
      fixture:r.fixture ?? null,savedAt:r.savedAt,predicted:r.predicted,playProbability:r.playProbability,
      actual:r.actual, actualSource:r.actualSource === "sorare" || r.actualSource === "manual" ? r.actualSource : undefined,
      actualGameDate:typeof r.actualGameDate === "string" && Number.isFinite(Date.parse(r.actualGameDate)) ? r.actualGameDate : undefined,
      ...(validModel ? {baselinePredicted:r.baselinePredicted,advancedPredicted:r.advancedPredicted,
        intervalP10:r.intervalP10,intervalP90:r.intervalP90,modelVersion:r.modelVersion,selectedMode:r.selectedMode} : {})});
    if (out.length >= 1500) break;
  }
  return out;
}

export function trackingMetrics(items: TrackedPrediction[]) {
  const done = items.filter((x): x is TrackedPrediction & {actual: number} =>
    typeof x.actual === "number" && Number.isFinite(x.actual));
  const n = done.length;
  if (!n) return {count:0,mae:null,rmse:null,bias:null,officialCount:0,manualCount:0};
  const errors = done.map(x => x.predicted - x.actual);
  const round = (v:number) => Math.round(v*10)/10;
  return {
    count:n,
    mae:round(errors.reduce((s,e) => s + Math.abs(e),0)/n),
    rmse:round(Math.sqrt(errors.reduce((s,e) => s + e*e,0)/n)),
    bias:round(errors.reduce((s,e) => s + e,0)/n),
    officialCount:done.filter(x=>x.actualSource==="sorare").length,
    manualCount:done.filter(x=>x.actualSource!=="sorare").length,
  };
}
/** A conservative, advisory offset, NOT automatically applied to live forecasts.
 * Requires >=20 matched results across >=5 distinct dates to reduce overfit. */
export function calibrationSuggestion(items: TrackedPrediction[]): {count:number; offset:number; label:string} | null {
  const done = items.filter((x): x is TrackedPrediction & {actual:number} => typeof x.actual === "number" && Number.isFinite(x.actual));
  const uniqueDays = new Set(done.map(x=>x.actualGameDate?.slice(0,10) ?? x.fixture?.slice(0,10) ?? x.savedAt.slice(0,10)));
  if (done.length < 20 || uniqueDays.size < 5) return null;
  const bias = done.reduce((s,x)=>s+x.predicted-x.actual,0)/done.length;
  const offset = Math.round(Math.max(-8,Math.min(8,-bias*done.length/(done.length+40)))*10)/10;
  return {count:done.length,offset,label:offset < 0 ? "Prognose derzeit tendenziell zu hoch" : offset > 0 ? "Prognose derzeit tendenziell zu niedrig" : "Keine auffällige systematische Abweichung"};
}

/** V1.7: safe, date-specific reconciliation of official FINAL player-game scores.
 * This module is pure and can be tested without credentials or network requests.
 */
import type { TrackedPrediction } from "./tracking";

export type GameScore = { date: string; score: number; status: string };
export type AutomaticResult = { key: string; score: number; gameDate: string };
export type AutoCheckItem = Pick<TrackedPrediction, "key" | "sport" | "playerId" | "fixture" | "savedAt">;

export function fixtureDay(fixture: string | null | undefined): string | null {
  if (typeof fixture !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})(?:\s|$)/.exec(fixture);
  if (!match) return null;
  const d = new Date(match[1] + "T00:00:00Z");
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0,10) === match[1] ? match[1] : null;
}

export function pendingForAutoCheck(items: TrackedPrediction[], now = new Date()): AutoCheckItem[] {
  const today = now.toISOString().slice(0, 10);
  return items.filter(row => {
    const day = fixtureDay(row.fixture);
    if (!day || day >= today || row.actual !== null || (row.sport !== "nba" && row.sport !== "football")) return false;
    const age = now.getTime() - new Date(day + "T00:00:00Z").getTime();
    return age >= 0 && age <= 90 * 86400000 && Number.isFinite(Date.parse(row.savedAt));
  }).map(({key,sport,playerId,fixture,savedAt}) => ({key,sport,playerId,fixture,savedAt}));
}

/** A match must be FINAL, dated, unique for the stored fixture day, and
 * kick off AFTER the prediction was saved. No guessing from latest scores.
 * The UTC fixture day must match exactly; adjacent NBA games are not interchangeable.
 */
export function findFinalForSnapshot(item: AutoCheckItem, results: GameScore[]): AutomaticResult | null {
  const day = fixtureDay(item.fixture);
  if (!day || !Number.isFinite(Date.parse(item.savedAt))) return null;
  const predictionTime = Date.parse(item.savedAt);
  const candidates = results.filter(r => {
    const t = Date.parse(r.date);
    return r.status === "FINAL" && Number.isFinite(r.score) && r.score >= 0 && r.score <= 500 &&
      Number.isFinite(t) && t > predictionTime && r.date.slice(0,10) === day;
  });
  if (candidates.length !== 1) return null;
  return {key:item.key,score:candidates[0].score,gameDate:candidates[0].date};
}

/** Map only the official record fields we need. Any unknown/DNP scores stay unresolved. */
export function parseOfficialResults(nodes: unknown): GameScore[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.filter((n): n is Record<string,any> => Boolean(n) && typeof n === "object")
    .map(n => ({date:n.anyGame?.date,score:n.score,status:n.scoreStatus}))
    .filter((r): r is GameScore => typeof r.date === "string" && Number.isFinite(Date.parse(r.date)) &&
      typeof r.score === "number" && Number.isFinite(r.score) && typeof r.status === "string");
}

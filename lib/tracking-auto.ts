/** V1.7: safe, date-specific reconciliation of official FINAL player-game scores.
 * This module is pure and can be tested without credentials or network requests.
 */
import type { TrackedPrediction } from "./tracking";

export type GameScore = { date: string; score: number; status: string };
export type AutomaticResult = { key: string; score: number; gameDate: string };
export type AutoCheckItem = Pick<TrackedPrediction, "key" | "sport" | "playerId" | "fixture" | "fixtureTipoff" | "savedAt">;

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
  }).map(({key,sport,playerId,fixture,fixtureTipoff,savedAt}) => ({key,sport,playerId,fixture,fixtureTipoff,savedAt}));
}

/** Only a verified NBA UTC tipoff permits a UTC-date difference of one day.
 * Score provider timestamps may represent the fixture's local calendar day.
 * Never allow an adjacent day without the independently verified tipoff. */
export function matchingGameDay(item: Pick<AutoCheckItem,'fixture'|'fixtureTipoff'|'sport'>,date:string):boolean {
  const day=fixtureDay(item.fixture),scoreDay=date.slice(0,10);
  if(!day)return false;
  if(scoreDay===day)return true;
  if(item.sport!=='nba'||!item.fixtureTipoff||!Number.isFinite(Date.parse(item.fixtureTipoff)))return false;
  return scoreDay===item.fixtureTipoff.slice(0,10) &&
    Math.abs(Date.parse(item.fixtureTipoff)-Date.parse(`${day}T00:00:00Z`))<=36*3600000;
}
/** FINAL scores are unique for the fixture day. A verified tipoff can prove a
 * same-day snapshot was taken before kickoff even when Sorare only returns
 * a calendar date (midnight) for the score. */
export function findFinalForSnapshot(item: AutoCheckItem, results: GameScore[]): AutomaticResult | null {
  const day = fixtureDay(item.fixture);
  if (!day || !Number.isFinite(Date.parse(item.savedAt))) return null;
  const predictionTime = Date.parse(item.savedAt);
  const candidates = results.filter(r => {
    const t = Date.parse(r.date);
    const verifiedStart= item.sport==='nba' && item.fixtureTipoff && Number.isFinite(Date.parse(item.fixtureTipoff))
      ? Date.parse(item.fixtureTipoff):null;
    return r.status === "FINAL" && Number.isFinite(r.score) && r.score >= 0 && r.score <= 500 &&
      Number.isFinite(t) && matchingGameDay(item,r.date) &&
      (verifiedStart!==null ? verifiedStart>predictionTime : t>predictionTime);
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

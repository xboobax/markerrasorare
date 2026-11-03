import type { Forecast, Sport } from "./model";

/**
 * Optional scouting inputs. Values are supplied by the user or a separately
 * vetted provider, NEVER inferred from a player's team/name. An absent rating
 * is neutral and is always displayed as "unbewertet".
 */
export type ScoutInputs = {
  expectedMinutes?: number | null;
  typicalMinutes?: number | null;
  xg?: number | null;
  xa?: number | null;
};
export type OpponentRatings = Record<string, number>;
export type ScoutedForecast = Forecast & {
  opponentRating: number | null;
  matchupAdjustmentPct: number;
  minutesAdjustmentPct: number;
  expectedMinutes: number | null;
  typicalMinutes: number | null;
  xg: number | null;
  xa: number | null;
  originalWeighted: number;
};

const asPositive = (n: unknown, upper: number): number | null =>
  typeof n === "number" && Number.isFinite(n) && n > 0 && n <= upper ? n : null;
const asNonNegative = (n: unknown, upper: number): number | null =>
  typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= upper ? n : null;

export function validDefenseRating(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

export function matchupLabel(rating: number | null): string {
  return rating === 1 ? "Sehr günstig" : rating === 2 ? "Günstig" : rating === 3 ? "Neutral"
    : rating === 4 ? "Schwierig" : rating === 5 ? "Sehr schwierig" : "Unbewertet";
}

export function enrichForecast(
  base: Forecast, sport: Sport, ratings: OpponentRatings, scouting: ScoutInputs = {},
): ScoutedForecast {
  const opponentRating = base.opponent && validDefenseRating(ratings[base.opponent]) ? ratings[base.opponent] : null;
  // A clearly labeled SUBJECTIVE tier adjustment, not a measured defense model.
  // 1 = weakest defense (+10%); 5 = strongest (-10%); no rating => 0%.
  const matchupFactor = opponentRating === null ? 1 : 1 + (3 - opponentRating) * 0.05;
  const expectedMinutes = asPositive(scouting.expectedMinutes, sport === "nba" ? 60 : 130);
  const typicalMinutes = asPositive(scouting.typicalMinutes, sport === "nba" ? 60 : 130);
  // Don't divide by a made-up baseline; require BOTH numbers.
  const minutesFactor = expectedMinutes !== null && typicalMinutes !== null
    ? Math.max(0.80, Math.min(1.20, expectedMinutes / typicalMinutes)) : 1;
  const factor = matchupFactor * minutesFactor;
  const scaled = (value: number) => Math.max(0, value * factor);
  return {
    ...base,
    expected: scaled(base.expected),
    weighted: scaled(base.weighted),
    floor: scaled(base.floor),
    ceiling: scaled(base.ceiling),
    variability: scaled(base.variability),
    originalWeighted: base.weighted,
    opponentRating,
    matchupAdjustmentPct: (matchupFactor - 1) * 100,
    minutesAdjustmentPct: (minutesFactor - 1) * 100,
    expectedMinutes,
    typicalMinutes,
    xg: asNonNegative(scouting.xg, 10),
    xa: asNonNegative(scouting.xa, 10),
  };
}

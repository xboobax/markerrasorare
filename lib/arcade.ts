import type { Forecast, Sport } from "./model";
import { ARCADE } from "../config/divination";

export type CardInput = {
  player: Forecast;
  /** Real star rating for the current NBA Arcade board, entered by user. */
  stars?: number | null;
  /** Bonus on this particular card edition, in percentage points. */
  bonusPercent?: number;
  owned?: boolean;
};

export type LineupPick = {
  slot: string;
  player: Forecast;
  stars: number | null;
  bonusPercent: number;
  projectedScore: number;
};

export type OptimizedLineup = {
  picks: LineupPick[];
  projectedScore: number;
  starsUsed: number;
};

export type OptimizeOptions = {
  sport: Sport;
  ownedOnly?: boolean;
  limit?: number;
  /** Breadth-limited search rather than a promise of exact global optimum. */
  beamWidth?: number;
  maxCandidatesPerSlot?: number;
};

const footballSlots: string[] = [...ARCADE.football.slots];
const nbaSlots: string[] = [...ARCADE.nba.slots];
const clampBonus = (n: number | undefined) =>
  typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(50, n)) : 0;

export function isValidNbaStars(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) &&
    value >= 1 && value <= 5 && Number.isInteger(value * 2);
}

export function slotAccepts(slot: string, position: string): boolean {
  if (slot === "ANY") return true;
  if (slot === "FLEX") return ["DEF", "MID", "FWD"].includes(position);
  return slot === position;
}

/** A card without a known NBA star value is deliberately NOT eligible. */
export function candidateIsEligible(card: CardInput, opts: OptimizeOptions): boolean {
  if (opts.ownedOnly && !card.owned) return false;
  if (!Number.isFinite(card.player.weighted) || card.player.weighted <= 0) return false;
  if (card.player.hasGame === false) return false;
  return opts.sport !== "nba" || isValidNbaStars(card.stars);
}

/**
 * Finds legal lineups. For NBA, an exact cardinality/star-budget DP finds the
 * top-K combinations. Football uses a bounded beam search (not exact).
 * Star totals are counted as integer HALF-stars to avoid floating-point errors.
 */
export function optimizeArcadeLineups(
  cards: CardInput[],
  opts: OptimizeOptions,
): OptimizedLineup[] {
  const slots = opts.sport === "nba" ? nbaSlots : footballSlots;
  const capHalf = Number.POSITIVE_INFINITY; // NBA is solved separately with exact DP.
  const beamWidth = Math.max(5, Math.min(800, Math.floor(opts.beamWidth ?? 220)));
  const maxPerSlot = Math.max(5, Math.min(500, Math.floor(opts.maxCandidatesPerSlot ?? 100)));
  const limit = Math.max(1, Math.min(20, Math.floor(opts.limit ?? 3)));

  const clean = cards.filter((card) => candidateIsEligible(card, opts))
    .map((card) => ({
      player: card.player,
      stars: opts.sport === "nba" ? card.stars as number : null,
      bonusPercent: clampBonus(card.bonusPercent),
      projectedScore: card.player.weighted * (1 + clampBonus(card.bonusPercent) / 100),
    }));

  // NBA has five interchangeable slots. A cardinality/budget DP gives an EXACT
  // top-K answer among the entered cards, unlike beam search.
  if (opts.sport === "nba") {
    type NbaState = { picks: LineupPick[]; score: number };
    const cap = ARCADE.nba.maxStars * 2;
    const states: NbaState[][][] = Array.from({length: 6}, () =>
      Array.from({length: cap + 1}, () => []));
    states[0][0] = [{picks: [], score: 0}];
    // If a player appears multiple times, keep the best version for now.
    // Multi-edition card support should eventually use a card ID and a unique-player constraint.
    const byId = new Map<string, typeof clean[number]>();
    for (const card of clean) {
      const old = byId.get(card.player.id);
      if (!old || old.projectedScore < card.projectedScore) byId.set(card.player.id, card);
    }
    for (const card of byId.values()) {
      const stars = Math.round((card.stars as number) * 2);
      // Descending count prevents reusing the same card within one DP iteration.
      for (let count = 4; count >= 0; count--) {
        for (let spent = cap - stars; spent >= 0; spent--) {
          if (!states[count][spent].length) continue;
          const destination = states[count + 1][spent + stars];
          for (const state of states[count][spent]) {
            destination.push({
              score: state.score + card.projectedScore,
              picks: [...state.picks, {...card, slot:"ANY"}],
            });
          }
          destination.sort((a, b) => b.score - a.score);
          if (destination.length > limit) destination.length = limit;
        }
      }
    }
    const complete = states[5].flat().sort((a,b)=>b.score-a.score).slice(0, limit);
    return complete.map(r => ({
      picks: r.picks,
      projectedScore: r.score,
      starsUsed: r.picks.reduce((sum,p) => sum + (p.stars ?? 0), 0),
    }));
  }

  // Fill constrained football positions first, the free outfield slot last.
  const orderedSlots = [...slots].sort((a, b) => Number(a === "FLEX" || a === "ANY") - Number(b === "FLEX" || b === "ANY"));
  type State = { picks: LineupPick[]; used: Set<string>; halfStars: number; score: number };
  let beam: State[] = [{ picks: [], used: new Set(), halfStars: 0, score: 0 }];

  for (const slot of orderedSlots) {
    const pool = clean.filter((c) => slotAccepts(slot, c.player.position))
      .sort((a, b) => b.projectedScore - a.projectedScore)
      .slice(0, maxPerSlot);
    if (!pool.length) return [];

    const next: State[] = [];
    for (const state of beam) {
      for (const card of pool) {
        if (state.used.has(card.player.id)) continue;
        const nextHalf = state.halfStars + (card.stars === null ? 0 : card.stars * 2);
        if (nextHalf > capHalf) continue;
        const used = new Set(state.used);
        used.add(card.player.id);
        next.push({
          used,
          halfStars: nextHalf,
          score: state.score + card.projectedScore,
          picks: [...state.picks, { ...card, slot }],
        });
      }
    }
    next.sort((a, b) => b.score - a.score);
    // Diversity: one beam state per combination. Order of picks can vary.
    const seen = new Set<string>();
    beam = [];
    for (const state of next) {
      const key = [...state.used].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      beam.push(state);
      if (beam.length >= beamWidth) break;
    }
    if (!beam.length) return [];
  }

  // Preserve board-slot order in the UI.
  const results = beam.sort((a, b) => b.score - a.score).slice(0, limit);
  return results.map((r) => ({
    picks: [...r.picks].sort((a, b) => slots.indexOf(a.slot) - slots.indexOf(b.slot)),
    projectedScore: r.score,
    starsUsed: r.halfStars / 2,
  }));
}

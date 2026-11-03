import {ARCADE} from "../config/divination";
import {isValidNbaStars, slotAccepts, type CardInput, type LineupPick} from "./arcade";
import type {Sport} from "./model";
import {estimateTargetChance} from "./target-probability";

export type ManualSelection = (string | null)[];
export type ManualLineupResult = {
  slots: (LineupPick | null)[];
  picks: LineupPick[];
  complete: boolean;
  valid: boolean;
  starsUsed: number;
  projectedScore: number;
  floorScore: number;
  ceilingScore: number;
  targetProbability: number | null;
  errors: string[];
  warnings: string[];
};

export function emptyManualSelection(): ManualSelection {
  return [null, null, null, null, null];
}

/** Restore browser data defensively. Values are IDs, never executable markup. */
export function normalizeManualSelection(value: unknown): ManualSelection {
  if (!Array.isArray(value)) return emptyManualSelection();
  return Array.from({length: 5}, (_, index) =>
    typeof value[index] === "string" && value[index].length > 0 && value[index].length <= 256
      ? value[index] : null);
}

/** A manual lineup never chooses or replaces a player automatically. */
export function evaluateManualLineup(
  selection: ManualSelection, cards: CardInput[], sport: Sport, targetScore?: number | null,
): ManualLineupResult {
  const ids = normalizeManualSelection(selection);
  const required = sport === "nba" ? ARCADE.nba.slots : ARCADE.football.slots;
  const byId = new Map(cards.map(card => [card.player.id, card]));
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  const slots = ids.map((id, index): LineupPick | null => {
    if (!id) return null;
    const card = byId.get(id);
    if (!card) {
      errors.push(`Karte ${index + 1}: Spieler ist im aktuellen Datenbereich nicht geladen.`);
      return null;
    }
    const p = card.player;
    if (seen.has(id)) errors.push(`${p.name} darf nicht mehrfach aufgestellt werden.`);
    seen.add(id);
    const slot = required[index];
    if (!slotAccepts(slot, p.position)) {
      errors.push(`Karte ${index + 1}: ${p.name} ist für diesen Slot nicht spielberechtigt.`);
    }
    if (sport === "nba" && !isValidNbaStars(card.stars)) {
      errors.push(`${p.name}: Bitte gültige NBA-Sterne (1–5 in 0,5er-Schritten) eintragen.`);
    }
    if (p.hasGame === false) warnings.push(`${p.name}: aktuell kein passendes Spiel gemeldet.`);
    if (p.sampleSize === 0 && p.proj === null && p.avg === null && p.last5Avg === null && p.last10Avg === null) {
      warnings.push(`${p.name}: keine belastbaren Sorare-Scores vorhanden.`);
    }
    if (!card.owned) warnings.push(`${p.name}: Kartenbesitz nicht bestätigt.`);
    const bonusPercent = typeof card.bonusPercent === "number" && Number.isFinite(card.bonusPercent)
      ? Math.max(0, Math.min(50, card.bonusPercent)) : 0;
    const factor = 1 + bonusPercent / 100;
    return {
      slot, player: p,
      stars: sport === "nba" && isValidNbaStars(card.stars) ? card.stars : null,
      bonusPercent,
      projectedScore: p.weighted * factor,
      floorScore: p.floor * p.playProb * factor,
      ceilingScore: p.ceiling * p.playProb * factor,
      optimizeScore: p.weighted * factor,
    };
  });
  const picks = slots.filter((p): p is LineupPick => p !== null);
  const complete = ids.every(Boolean) && picks.length === 5;
  const starsUsed = picks.reduce((sum, p) => sum + (p.stars ?? 0), 0);
  if (sport === "nba" && starsUsed > ARCADE.nba.maxStars) {
    errors.push(`NBA-Sternelimit überschritten: ${starsUsed} / ${ARCADE.nba.maxStars} Sterne.`);
  }
  const valid = complete && errors.length === 0;
  const projectedScore = picks.reduce((sum, p) => sum + p.projectedScore, 0);
  const floorScore = picks.reduce((sum, p) => sum + p.floorScore, 0);
  const ceilingScore = picks.reduce((sum, p) => sum + p.ceilingScore, 0);
  const knownScores = picks.every(p => p.player.sampleSize > 0 || p.player.proj !== null ||
    p.player.avg !== null || p.player.last5Avg !== null || p.player.last10Avg !== null);
  return {
    slots, picks, complete, valid, starsUsed, projectedScore, floorScore, ceilingScore,
    errors, warnings,
    targetProbability: valid && knownScores && typeof targetScore === "number" && Number.isFinite(targetScore) && targetScore > 0
      ? estimateTargetChance(picks, targetScore) : null,
  };
}

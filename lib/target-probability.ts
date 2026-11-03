import type {LineupPick} from "./arcade";

/** Deterministic moment-matched approximation, NOT a calibrated win probability.
 * Mixture variance includes DNP risk and an assumed small shared-team covariance.
 * This replaces misleading tests against only the mean score.
 */
function normalCdf(z: number): number {
  // Abramowitz/Stegun approximation, absolute error ~1e-7.
  const abs = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * abs);
  const density = Math.exp(-0.5 * abs * abs) / Math.sqrt(2 * Math.PI);
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const upper = 1 - density * poly;
  return z >= 0 ? upper : 1 - upper;
}

export function estimateTargetChance(picks: LineupPick[], target: number): number | null {
  if (!Number.isFinite(target) || target <= 0 || picks.length !== 5) return null;
  const mean = picks.reduce((s, p) => s + p.projectedScore, 0);
  let variance = 0;
  for (const p of picks) {
    const playProb = Math.max(0, Math.min(1, p.player.playProb));
    const factor = 1 + p.bonusPercent / 100;
    const conditionalMean = p.player.expected * factor;
    const conditionalSd = Math.max(2, p.player.variability * factor);
    variance += playProb * conditionalSd ** 2 + playProb * (1 - playProb) * conditionalMean ** 2;
  }
  // Conservative small positive correlation for same-team players. Assumed, not measured.
  for (let i = 0; i < picks.length; i++) for (let j = i + 1; j < picks.length; j++) {
    if (picks[i].player.team !== picks[j].player.team) continue;
    const a = picks[i], b = picks[j];
    const sdA = a.player.variability * (1 + a.bonusPercent / 100);
    const sdB = b.player.variability * (1 + b.bonusPercent / 100);
    variance += 2 * 0.10 * a.player.playProb * b.player.playProb * sdA * sdB;
  }
  const sd = Math.sqrt(Math.max(variance, 0));
  if (sd < 0.0001) return mean >= target ? 1 : 0;
  return Math.min(1, Math.max(0, 1 - normalCdf((target - mean) / sd)));
}

export type Sport = "football" | "nba";

export type Player = {
  id: string;
  name: string;
  team: string;
  teamSlug?: string;
  position: string;            // football: GK/DEF/MID/FWD; nba: G/F/C
  imageUrl?: string | null;    // Bild-URL vom Datenanbieter, nie aus Namen geraten
  avg: number | null;
  averageL5?: number | null;
  averageL10?: number | null;
  proj: number | null;
  recentScores?: number[];     // bis zu 10 historische Sorare-Scores
  last5Apps: number | null;
  status: string;
  playOdds: number | null;
  injuries: number;
  hasGame: boolean | null;
  nextGame?: string;
  opponent?: string;   // nächster Gegner, wenn Sorare ein Fixture liefert
};

export type Forecast = Player & {
  expected: number;             // Erwartungswert bei Einsatz
  playProb: number;             // separate Einsatzwahrscheinlichkeit
  weighted: number;             // erwartete Punkte inkl. DNP-Risiko
  last5Avg: number | null;
  last10Avg: number | null;
  floor: number;                // heuristische konditionale Bandgrenze, keine Garantie
  ceiling: number;
  variability: number;
  sampleSize: number;
  confidence: "hoch" | "mittel" | "gering"; // Datenabdeckung, keine statistische Konfidenz
};

const STATUS_PROB: Record<string, number> = {
  STARTER: 0.9, REGULAR: 0.7, SUBSTITUTE: 0.4, SUPER_SUBSTITUTE: 0.3, NOT_PLAYING: 0.05, RETIRED: 0,
};
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const mean = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;

export function playProbability(p: Player): number {
  if (p.hasGame === false) return 0;
  let prob: number;
  if (p.playOdds !== null && Number.isFinite(p.playOdds)) {
    prob = p.playOdds;
  } else {
    prob = STATUS_PROB[p.status.toUpperCase()] ?? 0.6;
    if (p.last5Apps !== null && Number.isFinite(p.last5Apps)) {
      prob = 0.5 * prob + 0.5 * (0.1 + 0.85 * clamp01(p.last5Apps / 5));
    }
  }
  if (p.injuries > 0) prob = Math.min(prob, 0.15);
  return clamp01(prob);
}

/**
 * Transparent forecast, not a trained/validated ML model. Uses only data returned
 * for the player by Sorare; no fictional opponent bonuses or injury news.
 * The score band describes form variability IF the player participates.
 */
export function forecast(p: Player): Forecast {
  const scores = (p.recentScores ?? []).filter((s): s is number =>
    typeof s === "number" && Number.isFinite(s) && s >= 0).slice(0, 10);
  const l5 = scores.slice(0, 5);
  const last5Avg = l5.length ? mean(l5) : (p.averageL5 ?? null);
  const last10Avg = scores.length ? mean(scores) : (p.averageL10 ?? p.avg);
  const entries: {value: number; weight: number}[] = [];
  if (p.proj !== null && Number.isFinite(p.proj) && p.proj >= 0) entries.push({value: p.proj, weight: 0.5});
  if (last5Avg !== null) entries.push({value: last5Avg, weight: 0.3});
  if (last10Avg !== null && Number.isFinite(last10Avg) && last10Avg >= 0) entries.push({value: last10Avg, weight: 0.2});
  const denominator = entries.reduce((sum, e) => sum + e.weight, 0);
  const expected = denominator ? entries.reduce((sum, e) => sum + e.value * e.weight, 0) / denominator : 0;
  const sampleSize = scores.length;
  const variance = scores.length > 1 ? scores.reduce((sum, s) => sum + (s - mean(scores)) ** 2, 0) / scores.length : 0;
  // With sparse data, explicitly widen uncertainty rather than pretending precision.
  const variability = Math.max(Math.sqrt(variance), expected * (sampleSize >= 5 ? 0.14 : 0.30));
  const floor = Math.max(0, expected - 0.9 * variability);
  const ceiling = expected + 1.15 * variability;
  const playProb = playProbability(p);
  const confidence = sampleSize >= 8 && p.proj !== null ? "hoch"
    : sampleSize >= 4 || p.proj !== null || last5Avg !== null || last10Avg !== null ? "mittel" : "gering";
  return {...p, expected, playProb, weighted: expected * playProb,
    last5Avg, last10Avg, floor, ceiling, variability, sampleSize, confidence};
}

/** Legacy helper retained for backwards compatibility. */
export function recommend(players: Forecast[], slots: string[]) {
  const used = new Set<string>();
  const sorted = players.filter(p => p.weighted > 0).sort((a,b) => b.weighted-a.weighted);
  const isFlex = (s: string) => s === "FLEX" || s === "ANY";
  const order = [...slots].sort((a,b) => Number(isFlex(a))-Number(isFlex(b)));
  const out: {slot:string;player?:Forecast}[] = [];
  for (const slot of order) {
    const pick = sorted.find(p => !used.has(p.id) &&
      (slot === "ANY" || (slot === "FLEX" ? p.position !== "GK" : p.position === slot)));
    if (pick) used.add(pick.id);
    out.push({slot,player:pick});
  }
  return out;
}

export type Sport = "football" | "nba";

export type Player = {
  id: string;
  name: string;
  team: string;
  teamSlug?: string;
  position: string;            // football: GK/DEF/MID/FWD, nba: G/F/C
  avg: number | null;          // Durchschnittsscore laut Sorare
  proj: number | null;         // Sorare-Projektion für die nächste Spielwoche
  last5Apps: number | null;    // Einsätze in den letzten 5 Spielen
  status: string;              // Roh-Einsatzstatus von Sorare (nur Football)
  playOdds: number | null;     // Einsatzchance 0..1 aus Sorare-Quoten (nur Football)
  injuries: number;            // Anzahl aktiver Verletzungen
  hasGame: boolean | null;     // null = unbekannt
  nextGame?: string;
};

export type Forecast = Player & { expected: number; playProb: number; weighted: number };

const STATUS_PROB: Record<string, number> = {
  STARTER: 0.9, REGULAR: 0.7, SUBSTITUTE: 0.4, SUPER_SUBSTITUTE: 0.3, NOT_PLAYING: 0.05, RETIRED: 0,
};

export function playProbability(p: Player): number {
  if (p.hasGame === false) return 0;
  let prob: number;
  if (p.playOdds !== null) {
    prob = p.playOdds;
  } else {
    prob = STATUS_PROB[p.status.toUpperCase()] ?? 0.6;
    if (p.last5Apps !== null) prob = 0.5 * prob + 0.5 * (0.1 + 0.85 * (p.last5Apps / 5));
  }
  if (p.injuries > 0) prob = Math.min(prob, 0.15);
  return Math.max(0, Math.min(1, prob));
}

export function forecast(p: Player): Forecast {
  const parts = [p.proj, p.avg].filter((x): x is number => x !== null && x > 0);
  const expected = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
  const playProb = playProbability(p);
  return { ...p, expected, playProb, weighted: expected * playProb };
}

export function recommend(players: Forecast[], slots: string[]) {
  const used = new Set<string>();
  const sorted = players.filter((p) => p.weighted > 0).sort((a, b) => b.weighted - a.weighted);
  const isFlex = (s: string) => s === "FLEX" || s === "ANY";
  const order = [...slots].sort((a, b) => Number(isFlex(a)) - Number(isFlex(b)));
  const out: { slot: string; player?: Forecast }[] = [];
  for (const slot of order) {
    const pick = sorted.find(
      (p) => !used.has(p.id) && (slot === "ANY" || (slot === "FLEX" ? p.position !== "GK" : p.position === slot))
    );
    if (pick) used.add(pick.id);
    out.push({ slot, player: pick });
  }
  return out;
}

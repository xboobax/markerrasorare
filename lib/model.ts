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
  nextGameTipoff?: string; // ISO 8601 / UTC, nur aus bestätigtem Spielplan
  opponent?: string;   // nächster Gegner, wenn Sorare ein Fixture liefert
  opponentLogoUrl?: string | null; // Nur von vertrauenswürdiger Team-API
};

export type ForecastSource = {label: string; value: number; share: number; origin: "Sorare" | "Historie"};
export type FormDirection = "steigend" | "fallend" | "stabil" | "unbekannt";

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
  forecastSources: ForecastSource[]; // tatsächlich verwendete Eingangsgrößen, auf 100 % normalisiert
  formDirection: FormDirection;
  formChangePct: number | null; // L5 gegenüber L10; kein eigener Prognosebonus
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

  // Ein einzelner hoher oder niedriger Score darf die Prognose nicht dominieren.
  // Der Einfluss von Einzelscores wächst mit der Zahl der Beobachtungen.
  // Vorliegende Sorare-Aggregate (L5/L10) dienen als eigenständige Orientierung.
  const entries: Array<{label:string;value:number;weight:number;origin: "Sorare" | "Historie"}> = [];
  const add = (label:string,value:number|null|undefined,weight:number,origin:"Sorare"|"Historie") => {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0 && weight > 0) {
      entries.push({label,value,weight,origin});
    }
  };
  add("Sorare-Projektion",p.proj,0.52,"Sorare");
  if (l5.length) add(`Letzte ${l5.length} Scores`,last5Avg,0.28*Math.min(1,l5.length/5),"Historie");
  else add("Sorare L5",p.averageL5,0.26,"Sorare");
  if (scores.length >= 8) add(`Letzte ${scores.length} Scores`,last10Avg,0.17*Math.min(1,scores.length/10),"Historie");
  else if (p.averageL10 !== null && p.averageL10 !== undefined) add("Sorare L10",p.averageL10,0.18,"Sorare");
  else if (scores.length >= 2) add(`Letzte ${scores.length} Scores (lang)`,last10Avg,0.17*scores.length/10,"Historie");
  add("Sorare-Durchschnitt",p.avg,0.20,"Sorare");
  const totalWeight = entries.reduce((sum,e)=>sum+e.weight,0);
  const expected = totalWeight ? entries.reduce((sum,e)=>sum+e.value*e.weight,0)/totalWeight : 0;
  const forecastSources:ForecastSource[] = totalWeight ? entries.map(e=>({
    label:e.label,value:e.value,share:e.weight/totalWeight,origin:e.origin,
  })) : [];

  const sampleSize = scores.length;
  const avgRaw = scores.length ? mean(scores) : 0;
  const variance = scores.length > 1 ? scores.reduce((sum,s)=>sum+(s-avgRaw)**2,0)/scores.length : 0;
  // Wenige Beobachtungen => breite Unsicherheit, nicht künstlich präzise Spanne.
  const variability = Math.max(Math.sqrt(variance),expected*(sampleSize>=8?0.14:sampleSize>=4?0.22:0.32));
  const floor = Math.max(0,expected-0.9*variability);
  const ceiling = expected+1.15*variability;
  const playProb = playProbability(p);
  const confidence = sampleSize>=8 && p.proj!==null ? "hoch"
    : sampleSize>=4 || p.proj!==null || last5Avg!==null || last10Avg!==null ? "mittel":"gering";
  // Ein Formtrend ist nur bei mindestens 8 unterscheidbaren Spielwerten sinnvoll.
  const older = scores.slice(5,10);
  const recent = scores.slice(0,5);
  const recentAvg = recent.length===5 ? mean(recent) : null;
  const olderAvg = older.length>=3 ? mean(older) : null;
  const formChangePct = recentAvg !== null && olderAvg !== null && olderAvg>0
    ? Math.max(-200,Math.min(200,(recentAvg/olderAvg-1)*100)) : null;
  const formDirection:FormDirection = formChangePct===null ? "unbekannt"
    : formChangePct>8 ? "steigend" : formChangePct < -8 ? "fallend":"stabil";
  return {...p,expected,playProb,weighted:expected*playProb,
    last5Avg,last10Avg,floor,ceiling,variability,sampleSize,confidence,
    forecastSources,formDirection,formChangePct};
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

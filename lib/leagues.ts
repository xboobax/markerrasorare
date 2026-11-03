/**
 * Football competitions that Markerras Sorare Helper supports.
 * Keep this whitelist on the SERVER so unsupported players never enter search
 * results or the line-up optimizer. Sorare supplies domesticLeague.displayName;
 * map known historical/sponsor aliases onto our four canonical names.
 */
export const FOOTBALL_LEAGUES = [
  "Bundesliga",
  "LaLiga",
  "Ligue 1",
  "Premier League",
] as const;

export type FootballLeague = (typeof FOOTBALL_LEAGUES)[number];

function normalize(value: string): string {
  return value.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Return null for any competition outside the selected four. */
export function footballLeagueFromSorare(value: unknown): FootballLeague | null {
  if (typeof value !== "string") return null;
  const name = normalize(value);
  if (/^(?:1 )?bundesliga$/.test(name)) return "Bundesliga";
  if (/^(?:la liga|laliga)(?: ea sports)?$/.test(name) || name === "primera division") return "LaLiga";
  if (/^ligue 1(?: uber eats| mcdonalds| mcdonald s)?$/.test(name)) return "Ligue 1";
  // Sorare currently labels Premier League players as "English League Players"
  // (see sorare.com/football/players/erling-haland).
  // Keep the public UI name "Premier League", and never match generic
  // "English League" to avoid accidentally including Championship teams.
  if (
    /^(?:(?:the |english )?premier league)(?: england)?$/.test(name) ||
    name === "epl" ||
    name === "english league players"
  ) return "Premier League";
  return null;
}

export function isFootballLeague(value: unknown): value is FootballLeague {
  return typeof value === "string" && FOOTBALL_LEAGUES.some((l) => l === value);
}

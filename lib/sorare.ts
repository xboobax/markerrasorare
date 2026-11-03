// Alle Sorare-Abfragen stehen nur in dieser Datei.
import { Player, Sport } from "./model";
import { footballLeagueFromSorare } from "./leagues";

const API = "https://api.sorare.com/graphql";

export async function gql(query: string, revalidate: number): Promise<any> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (process.env.SORARE_API_KEY) headers["APIKEY"] = process.env.SORARE_API_KEY;
  const res = await fetch(API, { method: "POST", headers, body: JSON.stringify({ query }), next: { revalidate } });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  const json = JSON.parse(text);
  if (json.errors) throw new Error(`HTTP 422: ${json.errors[0]?.message ?? "GraphQL-Fehler"}`);
  return json.data;
}

export type Club = { slug: string; name: string; league: string };
const validSlug = (c: Club) => /^[a-z0-9-]+$/.test(c.slug);

export async function getFootballClubs(): Promise<Club[]> {
  const d = await gql(`{ football { clubsReady { slug name domesticLeague { displayName } } } }`, 900);
  // Restrict the data source itself, not merely the visible league chips.
  // Only Bundesliga, LaLiga, Ligue 1 and Premier League clubs reach the app.
  const clubs: Club[] = [];
  for (const c of d.football.clubsReady as any[]) {
    const league = footballLeagueFromSorare(c.domesticLeague?.displayName);
    if (!league) continue;
    const club: Club = { slug: String(c.slug), name: String(c.name), league };
    if (validSlug(club)) clubs.push(club);
  }
  return clubs;
}

export async function getNbaTeams(): Promise<Club[]> {
  const d = await gql(`{ teams(first: 50, sport: NBA) { nodes { slug name ready } } }`, 3600);
  const all = (d.teams.nodes as any[]).map((t) => ({ slug: String(t.slug), name: String(t.name), league: "NBA", ready: t.ready === true }));
  // Do not exclude teams solely because Sorare labels them non-ready.
  // The search should include every team returned by the NBA team index.
  return all.map(({ slug, name, league }) => ({ slug, name, league })).filter(validSlug);
}

// Die Felder sind in Stufen angelegt: Falls Sorare ein Feld nicht (mehr) kennt,
// fällt der Abruf automatisch auf die nächstkleinere Stufe zurück.
const GAME = "activeInjuries { __typename } nextGame { date homeTeam { name } awayTeam { name } }";
// Offizielles Sorare-GraphQL-Schema (Nov. 2026): Beide Sportarten stellen
// avatarPictureUrl: String! bereit. NBAPlayer hat dagegen KEIN pictureUrl.
// Der Bildwert bleibt in jeder Fallback-Stufe enthalten, damit bei einem
// Schema-Downgrade (z.B. historische Scores) nicht sämtliche Fotos verschwinden.
// Niemals die funktionierende Score-Fallback-Logik für die Fotos aufgeben.
const FOOT_CORE = "slug displayName position playingStatus avatarPictureUrl";
const FOOT_ODDS = "nextClassicFixturePlayingStatusOdds { starterOddsBasisPoints substituteOddsBasisPoints nonPlayingOddsBasisPoints }";
const NBA_CORE = "slug displayName anyPositions avatarPictureUrl";
// Current Sorare schema (Nov 2026): Player.averageScore(type: ...) and
// rawPlayerGameScores(last: ...). Legacy lastFiveSo5AverageScore /
// lastTenPlayedSo5AverageScore are NOT Player fields and caused the UI to show
// zero data for LaLiga, Ligue 1 and Premier League when projections were null.
const FOOT_AVERAGES = `averageL5: averageScore(type: LAST_FIVE_SO5_AVERAGE_SCORE)
  averageL10: averageScore(type: LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)`;
const FOOT_RECENT = "rawPlayerGameScores(last: 10)";
// NBAPlayer does not expose the football-only rawPlayerGameScores field.
// Keep NBA averages in the first, compact roster request. Do not request
// optional injury/nextGame fields in this query: one unsupported field would
// otherwise downgrade the *entire* league to name/photo-only records.
// Source: Sorare NBAPlayer lastFiveSo5AverageScore / lastTenPlayedSo5AverageScore.
const NBA_AVERAGES = "lastFiveSo5AverageScore lastTenPlayedSo5AverageScore";
const FOOT_SCORING = `${FOOT_RECENT} ${FOOT_AVERAGES} lastFiveSo5Appearances nextClassicFixtureProjectedScore`;
const TIERS: Record<Sport, string[]> = {
  football: [
    `${FOOT_CORE} ${FOOT_SCORING} ${GAME} ${FOOT_ODDS}`,
    `${FOOT_CORE} ${FOOT_SCORING} ${FOOT_ODDS}`,
    `${FOOT_CORE} ${FOOT_SCORING}`,
    `${FOOT_CORE} ${FOOT_AVERAGES} lastFiveSo5Appearances nextClassicFixtureProjectedScore`,
    `${FOOT_CORE} ${FOOT_RECENT} nextClassicFixtureProjectedScore`,
    `${FOOT_CORE} nextClassicFixtureProjectedScore`,
    FOOT_CORE,
  ],
  nba: [
    // Prefer NBA's established L5/L10 fields. Projection fields are optional;
    // if Sorare removes one, the following tier preserves the averages.
    `${NBA_CORE} ${NBA_AVERAGES} nextDailyFixtureProjectedScore nextClassicFixtureProjectedScore lastFiveSo5Appearances`,
    `${NBA_CORE} ${NBA_AVERAGES} nextDailyFixtureProjectedScore`,
    `${NBA_CORE} ${NBA_AVERAGES}`,
    `${NBA_CORE} lastFiveSo5AverageScore`,
    `${NBA_CORE} seasonAverage`,
    NBA_CORE,
  ],
};

const FOOT_POS: Record<string, string> = { Goalkeeper: "GK", Defender: "DEF", Midfielder: "MID", Forward: "FWD" };
const num = (x: unknown): number | null => (typeof x === "number" && isFinite(x) ? x : null);

function mapPosition(sport: Sport, n: any): string {
  if (sport === "football") return FOOT_POS[n.position] ?? String(n.position ?? "?");
  const first = Array.isArray(n.anyPositions) ? n.anyPositions[0] : "";
  const raw = String(first ?? "").toLowerCase();
  if (raw.includes("guard")) return "G";
  if (raw.includes("forward")) return "F";
  if (raw.includes("center")) return "C";
  return raw || "?";
}

export function safeImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.startsWith("//") ? `https:${value}` : value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch { return null; }
}

function opponentFromFixture(team: string, home: unknown, away: unknown): string | undefined {
  const normalize = (s: string) => s.toLocaleLowerCase("de-DE").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const t = normalize(team);
  const h = typeof home === "string" ? normalize(home) : "";
  const a = typeof away === "string" ? normalize(away) : "";
  if (t && h && (t === h || (t.length >= 6 && h.includes(t)))) return typeof away === "string" ? away : undefined;
  if (t && a && (t === a || (t.length >= 6 && a.includes(t)))) return typeof home === "string" ? home : undefined;
  return undefined; // unknown team mapping: never silently guess opponent
}

function toPlayer(n: any, club: Club, sport: Sport): Player {
  const g = n.nextGame;
  const o = n.nextClassicFixturePlayingStatusOdds;
  const raw: number[] = Array.isArray(n.rawPlayerGameScores)
    ? n.rawPlayerGameScores.filter((x: unknown): x is number => typeof x === "number" && isFinite(x))
    : [];
  const avg = raw.length ? raw.reduce((a, b) => a + b, 0) / raw.length :
    num(n.averageL10) ?? num(n.averageL5) ?? num(n.lastTenPlayedSo5AverageScore) ?? num(n.lastFiveSo5AverageScore)
      ?? (sport === "nba" ? num(n.seasonAverage) : null);
  const playOdds = o
    ? Math.max(0, Math.min(1, (Number(o.starterOddsBasisPoints) + 0.6 * Number(o.substituteOddsBasisPoints)) / 10000))
    : null;
  return {
    id: String(n.slug),
    name: String(n.displayName),
    team: club.name,
    teamSlug: club.slug,
    imageUrl: safeImageUrl(n.avatarPictureUrl) ?? safeImageUrl(n.pictureUrl),
    recentScores: raw,
    position: mapPosition(sport, n),
    avg,
    averageL5: num(n.averageL5) ?? num(n.lastFiveSo5AverageScore),
    averageL10: num(n.averageL10) ?? num(n.lastTenPlayedSo5AverageScore),
    proj: num(n.nextDailyFixtureProjectedScore) ?? num(n.nextClassicFixtureProjectedScore),
    last5Apps: num(n.lastFiveSo5Appearances),
    status: String(n.playingStatus ?? ""),
    playOdds: playOdds !== null && isFinite(playOdds) ? playOdds : null,
    injuries: Array.isArray(n.activeInjuries) ? n.activeInjuries.length : 0,
    hasGame: g === undefined ? null : g !== null,
    nextGame: g ? `${String(g.date).slice(0, 10)} ${g.homeTeam?.name ?? "?"} - ${g.awayTeam?.name ?? "?"}` : undefined,
    opponent: g ? opponentFromFixture(club.name, g.homeTeam?.name, g.awayTeam?.name) : undefined,
  };
}

/** Fetch a complete current club roster instead of silently cutting off at first:100.
 * Sorare's active* connections expose cursor pagination; if the deployed schema
 * has no pageInfo field, fall back to the known legacy first-page query and
 * mark that roster as incomplete rather than advertising completeness.
 */
const rosterPageSize = (sport: Sport): number => sport === "football" ? 40 : 100;

function teamQuery(sport: Sport, slug: string, fields: string, after?: string, legacy = false): string {
  const cursor = after ? `, after: ${JSON.stringify(after)}` : "";
  const nodes = `nodes { ${fields} }`;
  const selection = legacy ? nodes : `${nodes} pageInfo { hasNextPage endCursor }`;
  return sport === "football"
    ? `{ football { club(slug: ${JSON.stringify(slug)}) { activePlayers(first: ${rosterPageSize(sport)}${cursor}) { ${selection} } } } }`
    : `{ team(slug: ${JSON.stringify(slug)}) { anyActivePlayers(first: ${rosterPageSize(sport)}${cursor}) { ${selection} } } }`;
}

/**
 * V1.4.1 hotfix: score fields are loaded with the SAME compact query as V1.3.
 * Optional pagination is checked afterwards, independently. A pageInfo schema
 * rejection can NEVER cause us to throw away otherwise valid score data.
 */
export type RosterResult = { players: Player[]; complete: boolean; scoringFieldsUnavailable?: boolean };

// Cache only real schema-validation downgrades across teams, as V1.3 did.
const workingTier: Record<Sport, number> = { football: 0, nba: 0 };
const isSchemaValidationError = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.startsWith("HTTP 422:") &&
    /cannot query field|unknown argument|unknown field|unknown type|not defined|doesn.t exist|is not a field|undefinedfield|argument .* is required|complexity|depth limit/i.test(msg);
};

async function fetchFirstPage(sport: Sport, club: Club): Promise<{players: Player[]; tier: number}> {
  let lastValidationError: unknown;
  for (let tier = workingTier[sport]; tier < TIERS[sport].length; tier++) {
    try {
      // Do not include pageInfo here: the original V1.3 query worked without it.
      const d = await gql(teamQuery(sport, club.slug, TIERS[sport][tier], undefined, true), 900);
      const connection = sport === "football" ? d.football?.club?.activePlayers : d.team?.anyActivePlayers;
      if (!connection || !Array.isArray(connection.nodes)) throw new Error(`Kein Spieler-Kader für ${club.name}`);
      workingTier[sport] = tier;
      return {players: connection.nodes.filter((n: any) => typeof n?.slug === "string").map((n: any) => toPlayer(n, club, sport)), tier};
    } catch (e) {
      // A 429/timeout/complexity error is NOT proof that a stats field is missing.
      // Do not silently downgrade those cases to stats-free player records.
      if (!isSchemaValidationError(e)) throw e;
      lastValidationError = e;
      workingTier[sport] = Math.min(tier + 1, TIERS[sport].length - 1);
    }
  }
  throw lastValidationError ?? new Error(`Sorare liefert kein unterstütztes Kaderschema für ${club.name}`);
}

export async function getTeamRoster(sport: Sport, club: Club): Promise<RosterResult> {
  const {players: firstPage, tier} = await fetchFirstPage(sport, club);
  const scoringFieldsUnavailable = tier === TIERS[sport].length - 1;
  // A page shorter than the requested size is exhausted. Most teams are here.
  if (firstPage.length < rosterPageSize(sport)) return {players:firstPage, complete:true, scoringFieldsUnavailable};

  // Retrieve pagination metadata separately with *minimal* selected fields.
  // This avoids the V1.4 regression: score fetches must never depend on pageInfo.
  try {
    const metadata = await gql(teamQuery(sport, club.slug, "slug"), 900);
    const connection = sport === "football" ? metadata.football?.club?.activePlayers : metadata.team?.anyActivePlayers;
    const initial = connection?.pageInfo;
    if (!initial || typeof initial.hasNextPage !== "boolean")
      return {players:firstPage, complete:false, scoringFieldsUnavailable};
    if (!initial.hasNextPage) return {players:firstPage, complete:true, scoringFieldsUnavailable};

    const players = [...firstPage];
    const seen = new Set(players.map(p=>p.id));
    let cursor: string | undefined = initial.endCursor;
    let complete = false;
    const usedCursors = new Set<string>();
    for (let i=1; i<25 && cursor && !usedCursors.has(cursor); i++) {
      usedCursors.add(cursor);
      const d = await gql(teamQuery(sport, club.slug, TIERS[sport][tier], cursor, false), 900);
      const conn = sport === "football" ? d.football?.club?.activePlayers : d.team?.anyActivePlayers;
      if (!conn || !Array.isArray(conn.nodes)) break;
      for (const n of conn.nodes) {
        if (typeof n?.slug !== "string" || seen.has(n.slug)) continue;
        seen.add(n.slug);
        players.push(toPlayer(n, club, sport));
      }
      if (!conn.pageInfo?.hasNextPage) { complete=true; break; }
      cursor = conn.pageInfo.endCursor;
    }
    return {players, complete, scoringFieldsUnavailable};
  } catch {
    // Keep the already fetched REAL scores even if pagination fails.
    // Explicitly mark the roster incomplete rather than reporting it as full.
    return {players:firstPage, complete:false, scoringFieldsUnavailable};
  }
}

/** Backwards-compatible array return type for existing tests/components. */
export async function getTeamPlayers(sport: Sport, club: Club): Promise<Player[]> {
  return (await getTeamRoster(sport, club)).players;
}

export async function getPlayers(sport: Sport, clubs: Club[]): Promise<{ players: Player[]; failed: number; incomplete: number; noScoreFields: number }> {
  const players: Player[] = [];
  let failed = 0;
  let incomplete = 0;
  let noScoreFields = 0;
  const unique = new Set<string>();
  const run = async (batch: Club[]) => {
    const res = await Promise.all(batch.map(c => getTeamRoster(sport,c).catch(() => null)));
    for (const r of res) {
      if (!r) { failed++; continue; }
      if (!r.complete) incomplete++;
      if (r.scoringFieldsUnavailable) noScoreFields++;
      for (const player of r.players) {
        if (unique.has(player.id)) continue;
        unique.add(player.id);
        players.push(player);
      }
    }
  };
  // Limit concurrent API requests to avoid unnecessary 429s from Sorare.
  const queue = [...clubs];
  const concurrency = process.env.SORARE_API_KEY ? 6 : 2;
  while (queue.length) await run(queue.splice(0, concurrency));
  return {players, failed, incomplete, noScoreFields};
}

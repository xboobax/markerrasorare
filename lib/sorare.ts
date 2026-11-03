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
  const ready = all.filter((t) => t.ready);
  return (ready.length ? ready : all).map(({ slug, name, league }) => ({ slug, name, league })).filter(validSlug);
}

// Die Felder sind in Stufen angelegt: Falls Sorare ein Feld nicht (mehr) kennt,
// fällt der Abruf automatisch auf die nächstkleinere Stufe zurück.
const GAME = "activeInjuries { __typename } nextGame { date homeTeam { name } awayTeam { name } }";
const FOOT_CORE = "slug displayName position playingStatus";
const FOOT_IMAGE = 'pictureUrl(derivative: "avatar")';
// NBA photo availability depends on the current API schema. A field error
// falls back to identical stats without the photo field.
const FOOT_STATS = "rawPlayerGameScores(last: 10) lastFiveSo5Appearances nextClassicFixtureProjectedScore";
const FOOT_ODDS = "nextClassicFixturePlayingStatusOdds { starterOddsBasisPoints substituteOddsBasisPoints nonPlayingOddsBasisPoints }";
const NBA_CORE = "slug displayName anyPositions";
const NBA_IMAGE = "pictureUrl";
const NBA_STATS = "rawPlayerGameScores(last: 10) lastFiveSo5Appearances nextClassicFixtureProjectedScore nextDailyFixtureProjectedScore";
const TIERS: Record<Sport, string[]> = {
  football: [`${FOOT_CORE} ${FOOT_IMAGE} ${FOOT_STATS} ${GAME} ${FOOT_ODDS}`, `${FOOT_CORE} ${FOOT_STATS} ${GAME} ${FOOT_ODDS}`, `${FOOT_CORE} ${FOOT_STATS}`, FOOT_CORE],
  nba: [`${NBA_CORE} ${NBA_IMAGE} ${NBA_STATS} ${GAME}`, `${NBA_CORE} ${NBA_STATS} ${GAME}`, `${NBA_CORE} ${NBA_STATS}`, NBA_CORE],
};
const tier: Record<Sport, number> = { football: 0, nba: 0 };

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
  const avg = raw.length ? raw.reduce((a, b) => a + b, 0) / raw.length : null;
  const playOdds = o
    ? Math.max(0, Math.min(1, (Number(o.starterOddsBasisPoints) + 0.6 * Number(o.substituteOddsBasisPoints)) / 10000))
    : null;
  return {
    id: String(n.slug),
    name: String(n.displayName),
    team: club.name,
    teamSlug: club.slug,
    imageUrl: safeImageUrl(n.pictureUrl),
    recentScores: raw,
    position: mapPosition(sport, n),
    avg,
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

function teamQuery(sport: Sport, slug: string, fields: string): string {
  return sport === "football"
    ? `{ football { club(slug: "${slug}") { activePlayers(first: 100) { nodes { ${fields} } } } } }`
    : `{ team(slug: "${slug}") { anyActivePlayers(first: 100) { nodes { ${fields} } } } }`;
}

export async function getTeamPlayers(sport: Sport, club: Club): Promise<Player[]> {
  for (;;) {
    try {
      const d = await gql(teamQuery(sport, club.slug, TIERS[sport][tier[sport]]), 900);
      const nodes: any[] = sport === "football" ? d.football.club.activePlayers.nodes : d.team.anyActivePlayers.nodes;
      return nodes.map((n) => toPlayer(n, club, sport));
    } catch (e) {
      const msg = (e as Error).message;
      if (!msg.startsWith("HTTP 422") || tier[sport] >= TIERS[sport].length - 1) throw e;
      tier[sport]++;
    }
  }
}

export async function getPlayers(sport: Sport, clubs: Club[]): Promise<{ players: Player[]; failed: number }> {
  const players: Player[] = [];
  let failed = 0;
  const run = async (batch: Club[]) => {
    const res = await Promise.all(batch.map((c) => getTeamPlayers(sport, c).catch(() => null)));
    for (const r of res) (r ? players.push(...r) : failed++);
  };
  const queue = [...clubs];
  if (queue.length) await run(queue.splice(0, 1)); // erster Club legt die passende Feld-Stufe fest
  while (queue.length) await run(queue.splice(0, 6));
  return { players, failed };
}

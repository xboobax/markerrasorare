import { notFound } from "next/navigation";
import { gql, getFootballClubs, getNbaTeams } from "@/lib/sorare";

export const dynamic = "force-dynamic";

const BASE = "https://api.sorare.com/graphql";

async function loadSchema(): Promise<string> {
  const h: Record<string, string> = {};
  if (process.env.SORARE_API_KEY) h["APIKEY"] = process.env.SORARE_API_KEY;
  const res = await fetch(BASE + "/schema", { headers: h, cache: "no-store" });
  if (!res.ok) throw new Error(`Schema-Download: HTTP ${res.status}`);
  const raw = await res.text();
  return raw
    .replace(/"""[\s\S]*?"""/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l !== "" && !/^"[^"]*"$/.test(l))
    .join("\n");
}

function block(schema: string, name: string): string[] | null {
  const lines = schema.split("\n");
  const start = lines.findIndex((l) => new RegExp(`^(type|interface|input|enum|union) ${name}[ {=]`).test(l));
  if (start < 0) return null;
  const out = [lines[start]];
  for (let i = start + 1; i < lines.length && lines[i] !== "}"; i++) out.push(lines[i]);
  return out;
}

function withArgs(lines: string[], names: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z0-9_]+)\b/);
    if (!m || !names.includes(m[1])) continue;
    out.push(lines[i]);
    if (lines[i].includes("(") && !lines[i].includes(")")) {
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith(")")) out.push("  " + lines[j++]);
      if (j < lines.length) out.push(lines[j]);
      i = j;
    }
  }
  return out;
}

async function run(label: string, query: string, pick: (d: any) => any[]): Promise<[string, string]> {
  try {
    const d = await gql(query, 0);
    const nodes = pick(d);
    return [label, `OK, ${nodes.length} Spieler. Erste zwei: ${JSON.stringify(nodes.slice(0, 2))}`.slice(0, 900)];
  } catch (e) {
    return [label, `FEHLER: ${(e as Error).message}`];
  }
}

const foot = (slug: string, fields: string) => `{ football { club(slug: "${slug}") { activePlayers(first: 5) { nodes { ${fields} } } } } }`;
const nba = (slug: string, fields: string) => `{ team(slug: "${slug}") { anyActivePlayers(first: 5) { nodes { ${fields} } } } }`;
const fNodes = (d: any) => d.football.club.activePlayers.nodes;
const nNodes = (d: any) => d.team.anyActivePlayers.nodes;

export default async function Status() {
  if (process.env.NODE_ENV === "production") notFound();
  const key = process.env.SORARE_API_KEY;
  const results: [string, string][] = [];
  results.push(["API-Key", key ? "gesetzt" : "NICHT gesetzt"]);

  try {
    const schema = await loadSchema();
    const lines = withArgs(block(schema, "Player") ?? [], ["averageScore", "rawSo5Scores", "averageStats", "totalStats", "so5Scores"]);
    results.push(["Schema Player: averageScore und Verwandte (mit Argumenten)", lines.join("\n") || "nicht gefunden"]);
    const names = Array.from(new Set(lines.map((l) => (l.match(/^\s*type: ([A-Za-z0-9_]+)/) ?? [])[1]).filter((x): x is string => !!x)));
    for (const n of names) {
      const b = block(schema, n);
      results.push([`Schema ${n}`, b ? b.slice(0, 60).join("\n") : "nicht gefunden"]);
    }
  } catch (e) {
    results.push(["Schema", `FEHLER: ${(e as Error).message}`]);
  }

  try {
    const clubs = await getFootballClubs();
    const c = clubs.find((x) => /^premier league$/i.test(x.league)) ?? clubs[0];
    results.push(["Football-Club", `${c.name} (${c.slug})`]);
    results.push(await run("Football: Projektion, Einsätze, Status", foot(c.slug, "slug displayName position playingStatus nextClassicFixtureProjectedScore lastFiveSo5Appearances"), fNodes));
    results.push(await run("Football: rawSo5Scores", foot(c.slug, "slug rawSo5Scores"), fNodes));
    results.push(await run("Football: averageScore mit falschem Wert (Absicht, zeigt den erwarteten Typ)", foot(c.slug, "slug averageScore(type: FOO)"), fNodes));
  } catch (e) {
    results.push(["Football", `FEHLER: ${(e as Error).message}`]);
  }

  try {
    const teams = await getNbaTeams();
    const t = teams.find((x) => /lakers/i.test(x.name)) ?? teams[0];
    results.push(["NBA-Team", `${t.name} (${t.slug}), insgesamt ${teams.length} Teams`]);
    results.push(await run("NBA: Projektion, Position, Einsätze", nba(t.slug, "slug displayName anyPositions nextClassicFixtureProjectedScore nextDailyFixtureProjectedScore lastFiveSo5Appearances"), nNodes));
    results.push(await run("NBA: rawPlayerGameScores", nba(t.slug, "slug rawPlayerGameScores"), nNodes));
  } catch (e) {
    results.push(["NBA", `FEHLER: ${(e as Error).message}`]);
  }

  return (
    <main>
      <h1>Status</h1>
      <p>Technischer Test der Sorare-Abfragen. Wird später wieder entfernt.</p>
      {results.map(([n, r]) => (
        <section key={n}>
          <h3>{n}</h3>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{r}</pre>
        </section>
      ))}
    </main>
  );
}

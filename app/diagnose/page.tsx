import { notFound } from "next/navigation";
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

// Ganze Typen: Argumente zusammengezogen
function compact(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(/^([A-Za-z0-9_]+)\($/);
    if (open) {
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith(")")) j++;
      out.push(open[1] + (lines[j] ?? "").replace(/^\)/, ""));
      i = j;
      continue;
    }
    out.push(lines[i].replace(/\([^)]*\)/, ""));
  }
  return out;
}

// Einzelne Felder MIT Argumenten
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

const FULL = ["So5Root", "FixturePlayer", "Sport", "PlayerPlayingStatus", "Injury", "PlayingStatusOdds", "TeamInterface", "SearchPlayers", "SearchPlayerHit", "AnyGameInterface"];

export default async function Diagnose({ searchParams }: { searchParams: { t?: string } }) {
  if (process.env.NODE_ENV === "production") notFound();
  const sections: [string, string][] = [];
  let error = "";
  try {
    const schema = await loadSchema();
    const q = block(schema, "Query") ?? [];
    sections.push(["Query: players, teams, team, searchPlayers, so5 (mit Argumenten)", withArgs(q, ["players", "teams", "team", "searchPlayers", "so5", "anyPlayer"]).join("\n")]);
    const extra = (searchParams.t ?? "").split(",").map((n) => n.trim()).filter((n) => /^[A-Za-z0-9_]+$/.test(n));
    for (const n of [...FULL, ...extra]) {
      const b = block(schema, n);
      sections.push([n, b ? (n === "So5Root" ? b.join("\n") : compact(b).join("\n")).slice(0, 6000) : "Typ nicht vorhanden"]);
    }
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <main>
      <h1>Diagnose</h1>
      <p>Technische Übersicht der Sorare-Schnittstelle. Wird später wieder entfernt.</p>
      {error && <p>Fehler: {error}</p>}
      {sections.map(([n, r]) => (
        <section key={n}>
          <h3>{n}</h3>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{r}</pre>
        </section>
      ))}
    </main>
  );
}

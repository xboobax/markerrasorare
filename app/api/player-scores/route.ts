import { gql } from "@/lib/sorare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fetch a few completed individual scores only when the user opens a profile.
 * Do not request allPlayerGameScores for every player in each club roster;
 * that would make the landing page extremely expensive and hit Sorare limits.
 */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
  if (!/^[a-z0-9-]{2,130}$/i.test(slug)) {
    return Response.json({ error: "Ungültiger Spieler-Slug" }, { status: 400 });
  }
  try {
    const d = await gql(`{ anyPlayer(slug: ${JSON.stringify(slug)}) { allPlayerGameScores(first: 15) { nodes { score scoreStatus } } } }`, 300);
    const nodes: any[] = d.anyPlayer?.allPlayerGameScores?.nodes ?? [];
    const scores = nodes.filter(n => n?.scoreStatus === "FINAL" &&
        typeof n.score === "number" && Number.isFinite(n.score) && n.score >= 0)
      .map(n => n.score).slice(0, 10);
    return Response.json({ scores, available: Boolean(d.anyPlayer) }, { headers: { "Cache-Control": "private, max-age=120" } });
  } catch {
    return Response.json({ error: "Sorare-Einzelscores derzeit nicht abrufbar" }, { status: 503 });
  }
}

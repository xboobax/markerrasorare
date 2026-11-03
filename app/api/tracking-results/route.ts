import { gql } from "@/lib/sorare";
import { findFinalForSnapshot, parseOfficialResults, pendingForAutoCheck, type AutoCheckItem, type AutomaticResult } from "@/lib/tracking-auto";
import type { TrackedPrediction } from "@/lib/tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Small on-demand checks, triggered on dashboard visit and by button.
 * Not a background service, and no private tokens are sent to the browser.
 */
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== new URL(request.url).host) return Response.json({error:"Fremde Herkunft nicht erlaubt"},{status:403});
    if (Number(request.headers.get("content-length") ?? 0) > 25000) return Response.json({error:"Anfrage zu groß"},{status:413});
    const body = await request.json();
    if (!Array.isArray(body?.items) || body.items.length > 12) return Response.json({error:"Maximal 12 Spieler pro Prüfung"},{status:400});
    const items: AutoCheckItem[] = [];
    for (const item of body.items) {
      if (!item || (item.sport !== "nba" && item.sport !== "football") ||
        typeof item.key !== "string" || item.key.length > 500 ||
        typeof item.playerId !== "string" || !/^[a-z0-9-]{2,130}$/i.test(item.playerId) ||
        typeof item.savedAt !== "string" || !Number.isFinite(Date.parse(item.savedAt)) ||
        typeof item.fixture !== "string" || item.fixture.length > 220) {
        return Response.json({error:"Ungültige Prognose"},{status:400});
      }
      items.push({key:item.key,sport:item.sport,playerId:item.playerId,fixture:item.fixture,savedAt:item.savedAt});
    }
    // Validate on server; data in the browser may be tampered with.
    const validated = pendingForAutoCheck(items.map(item=>({...item,playerName:"",team:"",predicted:0,playProbability:0,actual:null})) as TrackedPrediction[]);
    const byPlayer = new Map<string, AutoCheckItem[]>();
    for (const i of validated) {
      const key = `${i.sport}:${i.playerId}`;
      byPlayer.set(key, [...(byPlayer.get(key) ?? []),i]);
    }
    const groups = [...byPlayer.values()];
    const matched: AutomaticResult[] = [];
    let failures = 0;
    // Sequential requests to avoid a burst of Sorare queries.
    for (const group of groups) {
      const player = group[0];
      try {
        const query = `{ anyPlayer(slug: ${JSON.stringify(player.playerId)}) { allPlayerGameScores(first: 30) { nodes { score scoreStatus anyGame { date } } } } }`;
        const data = await gql(query, 300);
        const games = parseOfficialResults(data?.anyPlayer?.allPlayerGameScores?.nodes);
        for (const item of group) {
          const result = findFinalForSnapshot(item,games);
          if (result) matched.push(result);
        }
      } catch { failures++; }
    }
    return Response.json({matched, checked:groups.length, failures}, {headers:{"Cache-Control":"private, no-store"}});
  } catch {
    return Response.json({error:"Prüfung nicht möglich"},{status:400});
  }
}

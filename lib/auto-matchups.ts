/** Optional server-side, authenticated defensive form feeds.
 * Football: API-FOOTBALL league tables, goals conceded per league match.
 * NBA: BALLDONTLIE completed regular-season games, points conceded per game.
 * These measurements are proxies, not position-vs-position defensive ratings.
 */
import type {Sport} from "./model";
import type {OpponentRatings} from "./matchups";

export type AutomaticMatchupData = {
  ratings: OpponentRatings;
  source: string | null;
  season: number;
  coverage: number;
  error: string | null;
};
type DefenseRow = {name: string; concededPerGame: number; games: number};
const norm = (s:string) => s.toLowerCase().normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").replace(/\b(fc|cf|afc|sc|club|football|de|the)\b/g, "")
  .replace(/[^a-z0-9]/g, "");

export function mapDefenseToRatings(rows: DefenseRow[], minGames = 3): OpponentRatings {
  const eligible = rows.filter(r => r.games >= minGames && Number.isFinite(r.concededPerGame) && r.concededPerGame >= 0);
  if (eligible.length < 3) return {};
  const ordered = [...eligible].sort((a,b)=>a.concededPerGame-b.concededPerGame);
  const result:OpponentRatings = {};
  ordered.forEach((r,i) => {
    // lower conceded points/goals means stronger defense (rating=5).
    // The method is a *league-relative ordinal quintile*, not a scoring prediction.
    const quintile = Math.floor((i / Math.max(1,ordered.length-1)) * 4);
    result[r.name] = 5 - quintile;
  });
  return result;
}

/** Avoid fuzzy matching to multiple teams: only return unambiguous names. */
export function alignOpponentNames(ratings: OpponentRatings, names: string[]): OpponentRatings {
  const result:OpponentRatings = {};
  const keys = Object.keys(ratings);
  for (const name of names) {
    const n = norm(name);
    if (n.length < 5) continue;
    const matches = keys.filter(k => {
      const a=norm(k);
      return a === n || (a.length >= 7 && n.length >= 7 && (a.includes(n) || n.includes(a)));
    });
    if (matches.length === 1) result[name] = ratings[matches[0]];
  }
  return result;
}

const finite = (v:unknown):number|null => typeof v === "number" && Number.isFinite(v) ? v : null;
const seasonStart = (sport:Sport, today:Date) => {
  const yr=today.getUTCFullYear(), month=today.getUTCMonth();
  return month >= (sport === "nba" ? 8 : 6) ? yr : yr-1;
};

export async function getAutomaticMatchupData(sport:Sport, today = new Date()): Promise<AutomaticMatchupData> {
  const season=seasonStart(sport,today);
  const noData=(source:string|null,error:string|null=null):AutomaticMatchupData => ({ratings:{},source,coverage:0,error,season});
  if (sport === "football") {
    const key=process.env.API_FOOTBALL_KEY;
    if (!key) return noData(null);
    try {
      const leagueIds = [78,140,61,39]; // Bundesliga, LaLiga, Ligue 1, Premier League
      const responses=await Promise.all(leagueIds.map(async league => {
        const url=`https://v3.football.api-sports.io/standings?league=${league}&season=${season}`;
        const res=await fetch(url,{headers:{"x-apisports-key":key},next:{revalidate:21600}});
        if (!res.ok) throw new Error(`API-FOOTBALL HTTP ${res.status}`);
        const data=await res.json();
        if (data.errors && Object.keys(data.errors).length) throw new Error("API-FOOTBALL verweigert die Anfrage");
        const groups:unknown[]=data.response?.[0]?.league?.standings ?? [];
        const teams=groups.flatMap(g=>Array.isArray(g)?g:[]);
        return teams.map((t:any)=>({
          name:String(t.team?.name ?? ""),
          games:Number(t.all?.played ?? 0),
          concededPerGame: Number(t.all?.goals?.against ?? NaN)/Number(t.all?.played ?? 0),
          league,
        }));
      }));
      // Percentiles separately per league rather than ranking Bundesliga against Ligue 1.
      const all:OpponentRatings={};
      for (const leagueRows of responses) Object.assign(all,mapDefenseToRatings(leagueRows));
      return {ratings:all,source:"API-FOOTBALL · Gegentore/Spiel (Ligaperzentile)",coverage:Object.keys(all).length,error:null,season};
    } catch(e) {return noData("API-FOOTBALL",e instanceof Error ? e.message : "Unbekannter Feed-Fehler");}
  }
  const key=process.env.BALLDONTLIE_API_KEY;
  if (!key) return noData(null);
  try {
    const teams=new Map<string,{sum:number;games:number}>();
    let cursor:number|null=null;
    for (let page=0;page<15;page++) {
      const params=new URLSearchParams({"seasons[]":String(season),"per_page":"100"});
      if(cursor!==null) params.set("cursor",String(cursor));
      const res=await fetch(`https://api.balldontlie.io/v1/games?${params.toString()}`,
        {headers:{Authorization:key},next:{revalidate:21600}});
      if(!res.ok) throw new Error(`BALLDONTLIE HTTP ${res.status}`);
      const json=await res.json();
      const games:Array<any>=Array.isArray(json.data)?json.data:[];
      for(const g of games) {
        // Ignore upcoming and live fixtures. Never use future points as real outcomes.
        if(!["final","closed"].includes(String(g.status_state ?? "").toLowerCase()) &&
           !/final/i.test(String(g.status ?? ""))) continue;
        const home=String(g.home_team?.full_name ?? ""),away=String(g.visitor_team?.full_name ?? "");
        const h=finite(g.home_team_score),a=finite(g.visitor_team_score);
        if(!home||!away||h===null||a===null) continue;
        const add=(name:string,conceded:number)=>{const old=teams.get(name)??{sum:0,games:0};teams.set(name,{sum:old.sum+conceded,games:old.games+1});};
        add(home,a);add(away,h);
      }
      const next=finite(json.meta?.next_cursor);
      if(!next||next===cursor) break;
      cursor=next;
    }
    const rows=[...teams.entries()].map(([name,x])=>({name,games:x.games,concededPerGame:x.sum/x.games}));
    const ratings=mapDefenseToRatings(rows,3);
    return {ratings,source:"BALLDONTLIE · gegnerische Punkte/Spiel (Ligaperzentile)",coverage:Object.keys(ratings).length,error:null,season};
  } catch(e) {return noData("BALLDONTLIE",e instanceof Error?e.message:"Unbekannter Feed-Fehler");}
}

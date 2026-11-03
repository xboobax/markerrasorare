import { getFootballClubs, getNbaTeams, getPlayers, type Club } from "@/lib/sorare";
import { forecast, type Player, type Sport } from "@/lib/model";
import ArcadeDashboard from "@/app/components/arcade-dashboard";
import { FOOTBALL_LEAGUES, isFootballLeague } from "@/lib/leagues";

export const revalidate = 300;
export const maxDuration = 60;

type Props = { searchParams: { sport?: string; league?: string; team?: string } };

export default async function Page({ searchParams }: Props) {
  const sport: Sport = searchParams.sport === "nba" ? "nba" : "football";
  let players: Player[] = [];
  let clubs: Club[] = [];
  let shownClubs: Club[] = [];
  let leagues: string[] = [];
  let league = "";
  let team = searchParams.team ?? "";
  let info = "";
  let error = "";

  try {
    clubs = sport === "football" ? await getFootballClubs() : await getNbaTeams();
    if (sport === "football") {
      // Fixed league order and strict allowlist. Invalid URL league parameters
      // fall back to Bundesliga; __all still means ONLY these four leagues.
      leagues = [...FOOTBALL_LEAGUES];
      const requested = searchParams.league;
      league = requested === "__all" || isFootballLeague(requested) ? requested : "Bundesliga";
      shownClubs = league === "__all" ? clubs : clubs.filter(c => c.league === league);
    } else {
      shownClubs = clubs;
    }
    // Ignore invalid team parameters instead of silently reporting a false zero-player result.
    if (team && !shownClubs.some(c => c.slug === team)) team = "";
    const scope = team ? shownClubs.filter(c => c.slug === team) : shownClubs;
    const response = await getPlayers(sport, scope);
    players = response.players;
    info = `${players.length} Sorare-Spieler geladen · ${scope.length - response.failed} von ${scope.length} Teams erfolgreich.`;
    if (response.failed) info += ` ${response.failed} Teams konnten derzeit nicht geladen werden; angezeigte Ergebnisse sind daher unvollständig.`;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const projected = players.map(forecast).sort((a,b)=>b.weighted-a.weighted);
  return <ArcadeDashboard
    sport={sport}
    league={league}
    leagues={leagues}
    team={team}
    clubs={shownClubs}
    players={projected}
    info={info}
    error={error}
  />;
}

import { getFootballClubs, getNbaTeams, getPlayers, type Club } from "@/lib/sorare";
import { forecast, type Player, type Sport } from "@/lib/model";
import ArcadeDashboard from "@/app/components/arcade-dashboard";
import { FOOTBALL_LEAGUES, isFootballLeague } from "@/lib/leagues";
import {getAutomaticMatchupData} from "@/lib/auto-matchups";

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
    info = `${players.length} aktive Sorare-Kaderspieler geladen · ${scope.length - response.failed} von ${scope.length} Teams erfolgreich.`;
    if (response.incomplete) info += ` ${response.incomplete} Kader nur teilweise geladen (Pagination nicht vollständig verfügbar).`;
    if (response.noScoreFields) info += ` Warnung: Bei ${response.noScoreFields} Teams hat Sorare keine unterstützten Score-Felder geliefert. Spielerprofile können dort unvollständig sein.`;
    if (sport === "football" && scope.length === 0) {
      info += " Keine Vereine für diese Liga erkannt. Bitte den Sorare-Ligaabruf prüfen.";
    }
    if (response.failed) info += ` ${response.failed} Teams konnten derzeit nicht geladen werden; angezeigte Ergebnisse sind daher unvollständig.`;
    if (players.length > 0 && !players.some(p => (p.recentScores?.length ?? 0) > 0 || p.proj !== null || p.avg !== null)) {
      error = "Spieler-Stammdaten wurden geladen, aber keine Sorare-Scores oder Prognosen. Bitte Sorare-Abfrage/API-Key kontrollieren. Diese 0,0-Werte sind KEINE gültigen Vorhersagen.";
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const projected = players.map(forecast).sort((a,b)=>b.weighted-a.weighted);
  const automaticMatchups = await getAutomaticMatchupData(sport);
  return <ArcadeDashboard
    sport={sport}
    league={league}
    leagues={leagues}
    team={team}
    clubs={shownClubs}
    players={projected}
    info={info}
    error={error}
    automaticMatchups={automaticMatchups}
  />;
}

import {loadWorkspaceData} from "@/features/core/workspace-server";
import DreamTitle from "@/features/core/dream-title";
import MatchCenter from "@/features/matches/match-center";
import NbaLiveCenter from "@/features/matches/nba-live-center";
import FootballLiveCenter from "@/features/matches/football-live-center";
export const revalidate=300;export const maxDuration=60;
export default async function MatchCenterPage({searchParams}:{searchParams:{sport?:string;league?:string;team?:string}}){
  if(searchParams.sport==="nba")return <><DreamTitle eyebrow="GAMEDAY / LIVE" title="NBA Live Match Center" description="Spielstand, Play-by-Play, Boxscore und vorläufige Sorare-Punkte – ohne zusätzlichen Sorare-Spielerabruf."/><NbaLiveCenter/></>;
  if(searchParams.sport==="football")return <><DreamTitle eyebrow="GAMEDAY / LIVE" title="Football Live Match Center" description="Live-Spielstand, Play-by-Play, Aufstellungen und Scoring-Prüfung für Bundesliga, LaLiga, Premier League, Ligue 1, Europapokal und Länderspiele."/><FootballLiveCenter initialFilter={searchParams.league}/></>;
  const data=await loadWorkspaceData(searchParams);
  return <><DreamTitle eyebrow="GAMEDAY / FIXTURES" title="Match Center" description="Spieltermine und eigene Scouting-Vorschau. Keine unbestätigten Startformationen als offizielle Aufstellungen."/>{data.error&&<p className="dream-error">{data.error}</p>}<MatchCenter sport={data.sport} players={data.players} schedule={data.nbaSchedule}/></>;
}

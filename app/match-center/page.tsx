import {loadWorkspaceData} from "@/features/core/workspace-server";
import DreamTitle from "@/features/core/dream-title";
import MatchCenter from "@/features/matches/match-center";
export const revalidate=300;export const maxDuration=60;
export default async function MatchCenterPage({searchParams}:{searchParams:{sport?:string;league?:string;team?:string}}){
  const data=await loadWorkspaceData(searchParams);
  return <><DreamTitle eyebrow="GAMEDAY / FIXTURES" title="Match Center" description="Spieltermine und eigene Scouting-Vorschau. Keine unbestätigten Startformationen als offizielle Aufstellungen."/>{data.error&&<p className="dream-error">{data.error}</p>}<MatchCenter sport={data.sport} players={data.players} schedule={data.nbaSchedule}/></>;
}

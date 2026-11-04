import {loadWorkspaceData} from "@/features/core/workspace-server";
import DreamTitle from "@/features/core/dream-title";
import PlayerExplorer from "@/features/players/player-explorer";
export const revalidate=300;export const maxDuration=60;
export default async function PlayersPage({searchParams}:{searchParams:{sport?:string;league?:string;team?:string}}){
  const data=await loadWorkspaceData(searchParams);
  return <><DreamTitle eyebrow="SCOUTING / PLAYER DATABASE" title="Player Database" description="Schnelle Suche, sortierbare Prognosen und Spielerprofile. Die Tabelle rendert nur sichtbare Zeilen."/><PlayerExplorer sport={data.sport} players={data.players} ratings={data.automaticMatchups.ratings} error={data.error} info={data.info}/></>;
}

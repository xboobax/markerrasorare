import {loadWorkspaceData} from "@/features/core/workspace-server";
import ArcadeDashboard from "@/app/components/arcade-dashboard";
import DreamTitle from "@/features/core/dream-title";
export const revalidate=300;export const maxDuration=60;
export default async function DailyMissionPage({searchParams}:{searchParams:{sport?:string;league?:string;team?:string}}){
  const data=await loadWorkspaceData(searchParams);
  return <><DreamTitle eyebrow="DAILY MISSION / SCOUTING" title="Daily Mission Center" description="Die besten Kandidaten für Fußball und NBA – mit Missionsregeln, Datenqualität und Sicherheitscheck."/><ArcadeDashboard {...data} embedded initialTab="missions"/></>;
}

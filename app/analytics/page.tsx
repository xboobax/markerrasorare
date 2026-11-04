import {loadWorkspaceData} from "@/features/core/workspace-server";
import ArcadeDashboard from "@/app/components/arcade-dashboard";
import DreamTitle from "@/features/core/dream-title";
export const revalidate=300;export const maxDuration=60;
export default async function AnalyticsPage({searchParams}:{searchParams:{sport?:string;league?:string;team?:string}}){
  const data=await loadWorkspaceData(searchParams);
  return <><DreamTitle eyebrow="INSIGHTS / PERFORMANCE" title="Analytics & Prognosen" description="Historische Scores, Modelle, Datenqualität und Prognosevergleich – transparent und ohne erfundene Trefferquoten."/><ArcadeDashboard {...data} embedded initialTab="analytics"/></>;
}

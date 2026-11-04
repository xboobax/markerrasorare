import {loadWorkspaceData} from "@/features/core/workspace-server";
import ArcadeDashboard from "@/app/components/arcade-dashboard";
export const revalidate=300;export const maxDuration=60;
export default async function LegacyPage({searchParams}:{searchParams:{sport?:string;league?:string;team?:string}}){
  const data=await loadWorkspaceData(searchParams);
  return <ArcadeDashboard {...data} legacyRoot/>;
}

import {notFound} from "next/navigation";
import {loadWorkspaceData} from "@/features/core/workspace-server";
import ArcadeDashboard from "@/app/components/arcade-dashboard";
import DreamTitle from "@/features/core/dream-title";
export const revalidate=300;
export const maxDuration=60;
export default async function BuilderPage({params,searchParams}:{params:{sport:string};searchParams:{league?:string;team?:string}}){
  if(params.sport!=="football"&&params.sport!=="nba")notFound();
  const data=await loadWorkspaceData({...searchParams,sport:params.sport});
  return <><DreamTitle eyebrow={`${params.sport==="nba"?"NBA":"FOOTBALL"} / SET BUILDER`} title={params.sport==="nba"?"NBA Set Builder":"Football Set Builder"} description={params.sport==="nba"?"Fünf Karten · Sternebudget, Value und Strategie-Profile.":"Fünf Karten · Captain · Kartenbonus · Multi-Lineup."}/><ArcadeDashboard {...data} embedded initialTab="builder"/></>;
}

import {loadWorkspaceData} from "@/features/core/workspace-server";
import ArcadeDashboard from "@/app/components/arcade-dashboard";
import DreamTitle from "@/features/core/dream-title";
export default async function CollectionPage({searchParams}:{searchParams:{sport?:string}}){
  const data=await loadWorkspaceData(searchParams,true);
  return <><DreamTitle eyebrow="SORARE / MY GALLERY" title="Meine Sammlung" description="Verbinde deine Galerie und synchronisiere Kartenboni. Für Fußball werden nur Karten des offiziell aktuellen Sets als aktiv gezählt."/><ArcadeDashboard {...data} embedded initialTab="collection"/></>;
}

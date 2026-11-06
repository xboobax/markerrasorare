import DreamTitle from "@/features/core/dream-title";
import CollectionWorkspace from "@/features/collection/collection-workspace";
/** The collection page does not need to load and score hundreds of Sorare
 * players or the full builder optimizer before the card sync can start. */
export default function CollectionPage({searchParams}:{searchParams:{sport?:string}}){
  const sport=searchParams.sport==="nba"?"nba":"football";
  return <><DreamTitle eyebrow="SORARE / MY GALLERY" title="Meine Sammlung" description="Sorare-Karten und Kartenboni synchronisieren. Nur das offizielle aktuelle Football Set zählt als aktiv."/>
    <CollectionWorkspace sport={sport}/></>;
}

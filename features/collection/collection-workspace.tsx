"use client";
import Link from "next/link";
import {useCallback} from "react";
import MySorareCollection from "@/app/components/my-sorare-collection";
import type {OwnedCollection} from "@/lib/my-collection";
import type {Sport} from "@/lib/model";
/** A light collection-only workspace: no scouting API, optimizer or live feed.
 * The shared verified collection still works in the main builder and missions. */
export default function CollectionWorkspace({sport}:{sport:Sport}){
  const onCollectionChange=useCallback((_value:OwnedCollection|null)=>{},[]);
  return <div className="dream-collection-workspace">
    <nav className="chip-strip" aria-label="Sammlung nach Sportart" style={{marginBottom:16}}>
      <Link className={sport==="football"?"chip active":"chip"} href="/collection?sport=football">⚽ Fußballkarten</Link>
      <Link className={sport==="nba"?"chip active":"chip"} href="/collection?sport=nba">◉ NBA-Karten</Link>
    </nav>
    <MySorareCollection sport={sport} onCollectionChange={onCollectionChange}/>
  </div>;
}

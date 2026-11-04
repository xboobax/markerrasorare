import type {OwnedSorareCard} from './my-collection';

/** Sort each owned asset exactly once per collection update. Historical football sets
 * are already excluded by activeCollectionCards before they reach this helper. */
export function indexCurrentCardAssets(cards:readonly OwnedSorareCard[]):Map<string,OwnedSorareCard[]>{
  const result=new Map<string,OwnedSorareCard[]>();
  for(const card of cards){
    const list=result.get(card.playerSlug);
    if(list)list.push(card);else result.set(card.playerSlug,[card]);
  }
  for(const list of result.values())list.sort((a,b)=>(b.bonusPercent??-1)-(a.bonusPercent??-1)||
    a.rarity.localeCompare(b.rarity)||String(b.seasonYear??'').localeCompare(String(a.seasonYear??'')));
  return result;
}

/** A sorting model may be expensive (game date parsing, matchup, Q80): compute
 * its value at most once per player, rather than on each sort comparison. */
export function sortPlayersWithCachedValues<T extends {id:string;name:string}>(
  entries:readonly T[],getValue:(item:T)=>number|null,compareValues:(a:number|null,b:number|null)=>number
):T[]{
  const values=new Map<string,number|null>();
  for(const p of entries)values.set(p.id,getValue(p));
  return [...entries].sort((a,b)=>compareValues(values.get(a.id)??null,values.get(b.id)??null)||a.name.localeCompare(b.name,'de'));
}

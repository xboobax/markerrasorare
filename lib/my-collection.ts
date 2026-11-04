/** Small pure helpers. A verified collection is separate from manually marked cards. */
export type OwnedSorareCard={assetId:string;slug:string;sport:"NBA"|"FOOTBALL";rarity:string;seasonYear:number|null;serialNumber:number|null;playerSlug:string;playerName:string};
export type OwnedCollection={slug:string;cards:OwnedSorareCard[];syncedAt:string;complete:boolean};
export function collectionKey(slug:string){return `markerras.sorare.verified-collection.v1.${slug}`;}
/** Preference is independent for NBA and football. It never changes or deletes saved cards. */
export function ownedViewKey(sport:"nba"|"football"){return `markerras.sorare.only-my-cards.v1.${sport}`;}
/** In verified-only mode never treat a locally checked box as proof of Sorare ownership. */
export function isInSelectedCollection(id:string,store:Record<string,{owned?:boolean}>,onlyMine:boolean,verifiedReady:boolean){
  return !onlyMine||(verifiedReady&&store[id]?.owned===true);
}
export function ownedSlugs(collection:OwnedCollection,sport:"nba"|"football"){
  return new Set(collection.cards.filter(card=>card.sport===(sport==="nba"?"NBA":"FOOTBALL")).map(card=>card.playerSlug));
}
export function mergeVerifiedOwned<T extends {owned?:boolean}>(manual:Record<string,T>,ids:Iterable<string>,verifiedComplete:boolean){
  if(!verifiedComplete)return manual;
  const out:Record<string,T>={};
  const set=new Set(ids);
  for(const [id,settings] of Object.entries(manual))out[id]={...settings,owned:set.has(id)};
  for(const id of set)if(!out[id])out[id]={owned:true} as T;
  return out;
}
export function safeCollection(input:unknown,expectedSlug:string):OwnedCollection|null{
  if(!input||typeof input!=="object")return null;
  const item=input as Partial<OwnedCollection>;
  if(item.slug!==expectedSlug||!Array.isArray(item.cards)||!item.cards.every(c=>c&&typeof c.assetId==="string"&&typeof c.playerSlug==="string"&&["NBA","FOOTBALL"].includes(c.sport)))return null;
  return {slug:item.slug,cards:item.cards,syncedAt:typeof item.syncedAt==="string"?item.syncedAt:"",complete:item.complete===true};
}

/** Small pure helpers. A verified collection is separate from manually marked cards. */
export type SorareBonusPart={key:string;title:string;bonusBasisPoints:number};
export type OwnedSorareCard={assetId:string;slug:string;sport:"NBA"|"FOOTBALL";rarity:string;seasonYear:number|null;serialNumber:number|null;playerSlug:string;playerName:string;
  /** Sorare-reported card bonuses without the separate football captain modifier. Null means missing data. */
  bonusPercent?:number|null;bonusDetails?:SorareBonusPart[];grade?:number|null};
/** Basis points are hundredths of a percent (100 bp = 1%). Never infer bonuses from rarity alone. */
export function parseSorareBonuses(input:unknown):{bonusPercent:number|null;bonusDetails:SorareBonusPart[]}{
  if(!Array.isArray(input))return {bonusPercent:null,bonusDetails:[]};
  const details:SorareBonusPart[]=[];
  for(const item of input){
    if(!item||typeof item!=="object")return {bonusPercent:null,bonusDetails:[]};
    const row=item as Partial<SorareBonusPart>;
    if(typeof row.bonusBasisPoints!=="number"||!Number.isInteger(row.bonusBasisPoints)||row.bonusBasisPoints<0||row.bonusBasisPoints>10000)return {bonusPercent:null,bonusDetails:[]};
    const key=typeof row.key==="string"?row.key:"";
    const title=typeof row.title==="string"?row.title:"";
    // The helper always applies its own fixed football captain bonus; it is never part of the card bonus.
    if(/captain|kapitän/i.test(`${key} ${title}`))continue;
    details.push({key,title,bonusBasisPoints:row.bonusBasisPoints});
  }
  const sum=details.reduce((total,p)=>total+p.bonusBasisPoints,0)/100;
  // The existing prediction model accepts card bonuses up to 50%; avoid silently clipping external data.
  return {bonusPercent:Number.isFinite(sum)&&sum<=50?Math.round(sum*100)/100:null,bonusDetails:details};
}
export function bestOwnedBonusByPlayer(collection:OwnedCollection|null,sport:"nba"|"football"){
  const result:Record<string,number>={};
  if(collection?.complete!==true)return result;
  const expectedSport=sport==="nba"?"NBA":"FOOTBALL";
  for(const card of collection.cards){
    const bonus=card.bonusPercent;
    if(card.sport!==expectedSport||!card.playerSlug||typeof bonus!=="number"||!Number.isFinite(bonus)||bonus<0||bonus>50)continue;
    result[card.playerSlug]=Math.max(result[card.playerSlug]??0,bonus);
  }
  return result;
}
/** Known Sorare values win over older manual values; manual entries are a fallback only. */
export function selectedCardBonus(card:OwnedSorareCard|null,manual:number|undefined,playerFallback=0){
  if(card&&typeof card.bonusPercent==="number"&&Number.isFinite(card.bonusPercent)&&card.bonusPercent>=0&&card.bonusPercent<=50)return {percent:card.bonusPercent,source:"sorare" as const};
  if(typeof manual==="number"&&Number.isFinite(manual)&&manual>=0&&manual<=50)return {percent:manual,source:"manual" as const};
  return {percent:playerFallback,source:"manual" as const};
}

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

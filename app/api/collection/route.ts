import {NextRequest,NextResponse} from "next/server";
import {sessionForRequest,setSessionCookie,graphQl,SorareApiError} from "@/lib/sorare-oauth-session";
import {parseSorareCardBonus} from "@/lib/my-collection";
import {safeImageUrl} from "@/lib/sorare";
export const dynamic="force-dynamic";
const QUERY=`query MarkerrasOwnedCollection($after: String, $first: Int!) {
  currentUser { slug }
  cardSet { currentSet(sport: FOOTBALL) { slug name } }
  # "cardsWhere" is a paginated root field. CurrentUser has NO "anyCards" field.
  # "ownedByMe" is scoped to the authenticated Sorare OAuth user.
  cardsWhere(first: $first, after: $after, ownedByMe: true) {
    nodes { assetId slug sport rarityTyped seasonYear serialNumber grade
      cardSet { slug name }
      bonuses { key title bonusBasisPoints }
      powerBreakdown { xpBasisPoints seasonBasisPoints collectionBasisPoints scarcityBasisPoints specialEditionCardsBasisPoints fidelityBasisPoints otherBonusBasisPoints }
      anyPlayer { slug displayName } }
    pageInfo { hasNextPage endCursor }
    totalCount
  }
}`;
// Optional pictureUrl is requested only when the deployed Sorare schema accepts
// it. A schema mismatch must NEVER break the previously reliable collection sync.
// Cache the capability per server instance; an unavailable image is not invented.
const WITH_PICTURE=QUERY.replace('nodes { assetId slug sport', 'nodes { pictureUrl(derivative: "tinified") assetId slug sport');
let pictureCapability:null|boolean=null;
/** The larger first page halves round-trips for normal collections. A Sorare
 * schema/complexity limit falls back to the proven 50-card page, without ever
 * treating a provider failure as a successful (empty) collection. */
const DEFAULT_PAGE_SIZE=100;
const FALLBACK_PAGE_SIZE=50;
const invalidPageSize=(error:unknown):boolean=>{
  if(!(error instanceof SorareApiError))return false;
  if(error.status===429||error.status>=500)return false;
  return /(?:first|page size|page limit|pagination|maximum|at most|too many|complexity|limit exceeded)/i.test(error.message)
    && /(?:first|cardsWhere|complexity|page size|pagination|limit exceeded)/i.test(error.message);
};
async function collectionPage(token:string,after:string|null,first:number){
  const vars={after,first};
  if(pictureCapability===false)return graphQl(token,QUERY,vars);
  try{
    const data=await graphQl(token,WITH_PICTURE,vars);
    pictureCapability=true;
    return data;
  }catch(error){
    const message=error instanceof Error?error.message:'';
    if(!(error instanceof SorareApiError)&&!message)return Promise.reject(error);
    // Only an unsupported GraphQL picture field/argument triggers fallback.
    // HTTP 429, auth, timeouts and all other errors keep their original meaning.
    if(!/(cannot query field|unknown argument|unknown field|field .* not defined|doesn.t exist)/i.test(message) ||
       !/pictureUrl|derivative/i.test(message))throw error;
    pictureCapability=false;
    return graphQl(token,QUERY,vars);
  }
}
export async function GET(request:NextRequest){
  const user=await sessionForRequest(request);
  if(!user)return NextResponse.json({error:"Bitte zuerst mit Sorare verbinden."},{status:401,headers:{"Cache-Control":"no-store"}});
  const after=request.nextUrl.searchParams.get("after");
  const limitParam=request.nextUrl.searchParams.get("limit");
  if(limitParam!==null&&limitParam!=="50"&&limitParam!=="100")
    return NextResponse.json({error:"Ungültige Seitengröße."},{status:400});
  let pageSize=limitParam==="50"?FALLBACK_PAGE_SIZE:DEFAULT_PAGE_SIZE;
  if(after&&after.length>1024)return NextResponse.json({error:"Ungültiger Cursor."},{status:400});
  try{
    let result:Record<string,unknown>;
    try {result=await collectionPage(user.session.accessToken,after||null,pageSize);}
    catch(e){
      if(pageSize!==DEFAULT_PAGE_SIZE||!invalidPageSize(e))throw e;
      // Only a provider-declared paging/complexity limit justifies downgrade.
      pageSize=FALLBACK_PAGE_SIZE;
      result=await collectionPage(user.session.accessToken,after||null,pageSize);
    }
    const current=result.currentUser as {slug?:string}|null;
    const data=result.cardsWhere as {nodes?:unknown[];pageInfo?:{hasNextPage?:boolean;endCursor?:string};totalCount?:number}|null;
    // Never treat a failed / partial provider response as an empty, successfully synced collection.
    if(!current?.slug||!data||!Array.isArray(data.nodes))throw new Error("Sorare hat keine lesbare Kartensammlung geliefert.");
    if(!data.pageInfo||typeof data.pageInfo.hasNextPage!=="boolean"||
      (data.pageInfo.hasNextPage&&typeof data.pageInfo.endCursor!=="string"))
      throw new Error("Sorare hat unvollständige Paginierungsdaten geliefert. Sammlung nicht als vollständig markieren.");
    const activeFootballSet=(result.cardSet as {currentSet?:{slug?:unknown;name?:unknown}|null}|null)?.currentSet;
    // The current set is supplied by Sorare, never guessed from a season year.
    // A missing set fails closed for football ownership but must not affect NBA.
    const currentFootballSet=activeFootballSet&&typeof activeFootballSet.slug==="string"&&activeFootballSet.slug.trim()
      ?{slug:activeFootballSet.slug,name:typeof activeFootballSet.name==="string"?activeFootballSet.name:activeFootballSet.slug}
      :null;
    const nodes=data.nodes!;
    const cards=nodes.filter((n):n is Record<string,unknown>=>!!n&&typeof n==="object").map(c=>{
      const p=c.anyPlayer as Record<string,unknown>|null;
      const parsed=parseSorareCardBonus(c.bonuses,c.powerBreakdown);
      return {assetId:String(c.assetId||""),slug:String(c.slug||""),sport:String(c.sport||""),rarity:String(c.rarityTyped||""),seasonYear:c.seasonYear??null,serialNumber:c.serialNumber??null,
        playerSlug:typeof p?.slug==="string"?p.slug:"",playerName:typeof p?.displayName==="string"?p.displayName:"",grade:typeof c.grade==="number"?c.grade:null,
        cardSetSlug:typeof (c.cardSet as Record<string,unknown>|null)?.slug==="string"?(c.cardSet as Record<string,unknown>).slug:null,
        cardSetName:typeof (c.cardSet as Record<string,unknown>|null)?.name==="string"?(c.cardSet as Record<string,unknown>).name:null,
        bonusPercent:parsed.bonusPercent,bonusDetails:parsed.bonusDetails,
        pictureUrl:safeImageUrl(c.pictureUrl)};
    }).filter(c=>c.assetId&&c.playerSlug&&(c.sport==="NBA"||c.sport==="FOOTBALL"));
    const res=NextResponse.json({userSlug:current.slug,cards,activeFootballSet:currentFootballSet,pageInfo:data.pageInfo,totalCount:data.totalCount??cards.length,pageSize,fetchedAt:new Date().toISOString()},{headers:{"Cache-Control":"private, no-store"}});
    if(user.changed)setSessionCookie(res,user.session);
    return res;
  }catch(e){
    const rateLimited=e instanceof SorareApiError&&e.status===429;
    const headers:Record<string,string>={"Cache-Control":"no-store"};
    if(rateLimited&&e.retryAfterSeconds!==null)headers["Retry-After"]=String(e.retryAfterSeconds);
    return NextResponse.json({error:e instanceof Error?e.message:"Kartensynchronisierung fehlgeschlagen."},{status:rateLimited?429:502,headers});
  }
}

import {NextRequest,NextResponse} from "next/server";
import {sessionForRequest,setSessionCookie,graphQl,SorareApiError} from "@/lib/sorare-oauth-session";
import {parseSorareCardBonus} from "@/lib/my-collection";
export const dynamic="force-dynamic";
const QUERY=`query MarkerrasOwnedCollection($after: String) {
  currentUser { slug }
  cardSet { currentSet(sport: FOOTBALL) { slug name } }
  # "cardsWhere" is a paginated root field. CurrentUser has NO "anyCards" field.
  # "ownedByMe" is scoped to the authenticated Sorare OAuth user.
  cardsWhere(first: 50, after: $after, ownedByMe: true) {
    nodes { assetId slug sport rarityTyped seasonYear serialNumber grade
      cardSet { slug name }
      bonuses { key title bonusBasisPoints }
      powerBreakdown { xpBasisPoints seasonBasisPoints collectionBasisPoints scarcityBasisPoints specialEditionCardsBasisPoints fidelityBasisPoints otherBonusBasisPoints }
      anyPlayer { slug displayName } }
    pageInfo { hasNextPage endCursor }
    totalCount
  }
}`;
export async function GET(request:NextRequest){
  const user=await sessionForRequest(request);
  if(!user)return NextResponse.json({error:"Bitte zuerst mit Sorare verbinden."},{status:401,headers:{"Cache-Control":"no-store"}});
  const after=request.nextUrl.searchParams.get("after");
  if(after&&after.length>1024)return NextResponse.json({error:"Ungültiger Cursor."},{status:400});
  try{
    const result=await graphQl(user.session.accessToken,QUERY,{after:after||null});
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
        bonusPercent:parsed.bonusPercent,bonusDetails:parsed.bonusDetails};
    }).filter(c=>c.assetId&&c.playerSlug&&(c.sport==="NBA"||c.sport==="FOOTBALL"));
    const res=NextResponse.json({userSlug:current.slug,cards,activeFootballSet:currentFootballSet,pageInfo:data.pageInfo,totalCount:data.totalCount??cards.length,fetchedAt:new Date().toISOString()},{headers:{"Cache-Control":"private, no-store"}});
    if(user.changed)setSessionCookie(res,user.session);
    return res;
  }catch(e){
    const rateLimited=e instanceof SorareApiError&&e.status===429;
    const headers:Record<string,string>={"Cache-Control":"no-store"};
    if(rateLimited&&e.retryAfterSeconds!==null)headers["Retry-After"]=String(e.retryAfterSeconds);
    return NextResponse.json({error:e instanceof Error?e.message:"Kartensynchronisierung fehlgeschlagen."},{status:rateLimited?429:502,headers});
  }
}

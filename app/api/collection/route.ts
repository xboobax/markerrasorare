import {NextRequest,NextResponse} from "next/server";
import {sessionForRequest,setSessionCookie,graphQl} from "@/lib/sorare-oauth-session";
import {parseSorareCardBonus} from "@/lib/my-collection";
export const dynamic="force-dynamic";
const QUERY=`query MarkerrasOwnedCollection($after: String) {
  currentUser { slug }
  # "cardsWhere" is a paginated root field. CurrentUser has NO "anyCards" field.
  # "ownedByMe" is scoped to the authenticated Sorare OAuth user.
  cardsWhere(first: 50, after: $after, ownedByMe: true) {
    nodes { assetId slug sport rarityTyped seasonYear serialNumber grade
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
    const nodes=data.nodes!;
    const cards=nodes.filter((n):n is Record<string,unknown>=>!!n&&typeof n==="object").map(c=>{
      const p=c.anyPlayer as Record<string,unknown>|null;
      const parsed=parseSorareCardBonus(c.bonuses,c.powerBreakdown);
      return {assetId:String(c.assetId||""),slug:String(c.slug||""),sport:String(c.sport||""),rarity:String(c.rarityTyped||""),seasonYear:c.seasonYear??null,serialNumber:c.serialNumber??null,
        playerSlug:typeof p?.slug==="string"?p.slug:"",playerName:typeof p?.displayName==="string"?p.displayName:"",grade:typeof c.grade==="number"?c.grade:null,
        bonusPercent:parsed.bonusPercent,bonusDetails:parsed.bonusDetails};
    }).filter(c=>c.assetId&&c.playerSlug&&(c.sport==="NBA"||c.sport==="FOOTBALL"));
    const res=NextResponse.json({userSlug:current.slug,cards,pageInfo:data.pageInfo??{hasNextPage:false,endCursor:null},totalCount:data.totalCount??cards.length,fetchedAt:new Date().toISOString()},{headers:{"Cache-Control":"private, no-store"}});
    if(user.changed)setSessionCookie(res,user.session);
    return res;
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Kartensynchronisierung fehlgeschlagen."},{status:502,headers:{"Cache-Control":"no-store"}});}
}

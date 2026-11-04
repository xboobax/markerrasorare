import {NextRequest,NextResponse} from "next/server";
import {oauthConfigured,sessionForRequest,setSessionCookie,graphQl} from "@/lib/sorare-oauth-session";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
  const user=await sessionForRequest(req);
  if(!user)return NextResponse.json({configured:oauthConfigured(),connected:false},{headers:{"Cache-Control":"no-store"}});
  try{
    const data=await graphQl(user.session.accessToken,"query MarkerrasCurrentUser { currentUser { slug nickname } }");
    const current=data.currentUser as {slug?:string;nickname?:string}|null;
    if(!current?.slug)throw new Error("No current user");
    const res=NextResponse.json({configured:true,connected:true,slug:current.slug,nickname:current.nickname||current.slug},{headers:{"Cache-Control":"no-store"}});
    if(user.changed)setSessionCookie(res,user.session);
    return res;
  }catch{
    return NextResponse.json({configured:true,connected:false,error:"Sorare ist gerade nicht erreichbar. Deine Verbindung bleibt erhalten – bitte später erneut versuchen."},{headers:{"Cache-Control":"no-store"}});
  }
}

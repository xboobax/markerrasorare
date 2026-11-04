import {NextRequest,NextResponse} from "next/server";
import {oauthConfig,sessionForRequest,expireSessionCookie,expireStateCookie} from "@/lib/sorare-oauth-session";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
  const session=await sessionForRequest(req);
  if(session){
    try{
      const cfg=oauthConfig();
      await fetch("https://api.sorare.com/oauth/revoke",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:cfg.clientId,client_secret:cfg.clientSecret,token:session.session.accessToken}).toString(),cache:"no-store",signal:AbortSignal.timeout(5000)});
    }catch{/* Local cookie is still cleared. */}
  }
  const res=NextResponse.json({disconnected:true},{headers:{"Cache-Control":"no-store"}});
  expireSessionCookie(res);expireStateCookie(res);return res;
}

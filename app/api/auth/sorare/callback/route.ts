import {NextRequest,NextResponse} from "next/server";
import {oauthConfig,unseal,STATE_COOKIE,constantEqual,tokenRequest,setSessionCookie,expireStateCookie} from "@/lib/sorare-oauth-session";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
  let origin="https://markerrasorarev1.vercel.app";
  try{origin=oauthConfig().origin;}catch{}
  const back=(reason:string)=>{const res=NextResponse.redirect(`${origin}/?sorare=${encodeURIComponent(reason)}#meine-karten`,302);expireStateCookie(res);res.headers.set("Cache-Control","no-store");return res;};
  const error=request.nextUrl.searchParams.get("error");if(error)return back("abgebrochen");
  const code=request.nextUrl.searchParams.get("code")||"";
  const state=request.nextUrl.searchParams.get("state")||"";
  const raw=unseal<{state:string;createdAt:number}>(request.cookies.get(STATE_COOKIE)?.value);
  if(!code||!state||!raw||!raw.state||!raw.createdAt||Date.now()-raw.createdAt>600000||raw.createdAt>Date.now()+60000||!constantEqual(state,raw.state))return back("sicherheitspruefung");
  try{
    const cfg=oauthConfig();
    const session=await tokenRequest({grant_type:"authorization_code",code,redirect_uri:cfg.callback});
    const res=back("verbunden");setSessionCookie(res,session);return res;
  }catch{return back("login-fehler");}
}

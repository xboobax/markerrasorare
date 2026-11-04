import {NextResponse} from "next/server";
import {randomBytes} from "node:crypto";
import {oauthConfig,seal,STATE_COOKIE,secureCookieOptions} from "@/lib/sorare-oauth-session";
export const dynamic="force-dynamic";
export async function GET(){
  try{
    const cfg=oauthConfig();
    const state=randomBytes(32).toString("base64url");
    const u=new URL("https://sorare.com/oauth/authorize");
    u.searchParams.set("client_id",cfg.clientId);
    u.searchParams.set("redirect_uri",cfg.callback);
    u.searchParams.set("response_type","code");
    u.searchParams.set("scope","");
    u.searchParams.set("state",state);
    const res=NextResponse.redirect(u,302);
    res.cookies.set(STATE_COOKIE,seal({state,createdAt:Date.now()}),secureCookieOptions(600));
    res.headers.set("Cache-Control","no-store");
    return res;
  }catch{
    return NextResponse.json({error:"Sorare-Login ist noch nicht eingerichtet. Bitte OAuth-Umgebungsvariablen in Vercel setzen."},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}

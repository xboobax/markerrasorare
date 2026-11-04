/** Sorare OAuth: server-only encrypted session. NEVER return access/refresh tokens to a browser. */
import {createCipheriv,createDecipheriv,createHash,randomBytes,timingSafeEqual} from "node:crypto";
import type {NextResponse} from "next/server";

export const SORARE_COOKIE="msh_sorare_oauth";
export const STATE_COOKIE="msh_sorare_state";
export type SorareSession={accessToken:string;refreshToken:string;expiresAt:number};
const oauthHost="https://api.sorare.com";

function secret(){
  const raw=process.env.SORARE_SESSION_SECRET;
  if(!raw||raw.length<32)throw new Error("SORARE_SESSION_SECRET muss mindestens 32 Zeichen lang sein.");
  return createHash("sha256").update(raw).digest();
}
export function oauthConfig(){
  const clientId=process.env.SORARE_OAUTH_CLIENT_ID?.trim();
  const clientSecret=process.env.SORARE_OAUTH_CLIENT_SECRET?.trim();
  const origin=(process.env.SORARE_SITE_URL||"https://markerrasorarev1.vercel.app").replace(/\/$/,"");
  const parsed=new URL(origin);
  if(parsed.protocol!=="https:"&&!(parsed.protocol==="http:"&&parsed.hostname==="localhost"))throw new Error("SORARE_SITE_URL muss HTTPS verwenden.");
  if(parsed.pathname!=="/"||parsed.search||parsed.hash)throw new Error("SORARE_SITE_URL darf nur die Domain enthalten.");
  if(!clientId||!clientSecret)throw new Error("Sorare OAuth ist noch nicht konfiguriert (Client-ID und Secret fehlen).");
  return {clientId,clientSecret,callback:`${parsed.origin}/api/auth/sorare/callback`,origin:parsed.origin};
}
export function oauthConfigured(){
  try{oauthConfig();secret();return true;}catch{return false;}
}
export function seal(payload:unknown){
  const iv=randomBytes(12); const cipher=createCipheriv("aes-256-gcm",secret(),iv);
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(payload),"utf8"),cipher.final()]);
  return [iv.toString("base64url"),cipher.getAuthTag().toString("base64url"),encrypted.toString("base64url")].join(".");
}
export function unseal<T>(value:string|undefined):T|null{
  if(!value)return null;
  try{
    const [i,t,c,...rest]=value.split(".");if(!i||!t||!c||rest.length)return null;
    const decipher=createDecipheriv("aes-256-gcm",secret(),Buffer.from(i,"base64url"));
    decipher.setAuthTag(Buffer.from(t,"base64url"));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(c,"base64url")),decipher.final()]).toString("utf8")) as T;
  }catch{return null;}
}
export function secureCookieOptions(maxAge:number){
  const isLocal=(process.env.SORARE_SITE_URL||"").startsWith("http://localhost");
  return {httpOnly:true,sameSite:"lax" as const,secure:!isLocal,path:"/",maxAge};
}
export function setSessionCookie(res:NextResponse,session:SorareSession){
  res.cookies.set(SORARE_COOKIE,seal(session),secureCookieOptions(60*60*24*14));
}
export function expireSessionCookie(res:NextResponse){res.cookies.set(SORARE_COOKIE,"",secureCookieOptions(0));}
export function expireStateCookie(res:NextResponse){res.cookies.set(STATE_COOKIE,"",secureCookieOptions(0));}
export function constantEqual(left:string,right:string){
  const a=Buffer.from(left);const b=Buffer.from(right);
  return a.length===b.length&&timingSafeEqual(a,b);
}
export function validSession(s:unknown):s is SorareSession{
  if(!s||typeof s!=="object")return false;
  const x=s as Partial<SorareSession>;
  return typeof x.accessToken==="string"&&x.accessToken.length>10&&typeof x.refreshToken==="string"&&x.refreshToken.length>10&&typeof x.expiresAt==="number";
}
export async function tokenRequest(params:Record<string,string>){
  const cfg=oauthConfig();
  const body=new URLSearchParams({client_id:cfg.clientId,client_secret:cfg.clientSecret,...params});
  const response=await fetch(`${oauthHost}/oauth/token`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:body.toString(),cache:"no-store",signal:AbortSignal.timeout(12000)});
  const data=await response.json().catch(()=>null) as Record<string,unknown>|null;
  if(!response.ok||!data||typeof data.access_token!=="string"||typeof data.refresh_token!=="string")throw new Error("Sorare hat kein gültiges OAuth-Token geliefert.");
  const expiresIn=typeof data.expires_in==="number"?data.expires_in:7200;
  return {accessToken:data.access_token,refreshToken:data.refresh_token,expiresAt:Date.now()+Math.max(60,expiresIn)*1000};
}
export async function sessionForRequest(request:Request):Promise<{session:SorareSession;changed:boolean}|null>{
  const rawCookie=request.headers.get("cookie")?.split(";").map(s=>s.trim()).find(c=>c.startsWith(`${SORARE_COOKIE}=`))?.slice(SORARE_COOKIE.length+1);
  let encoded:string|undefined;try{encoded=rawCookie?decodeURIComponent(rawCookie):undefined;}catch{return null;}
  const s=unseal<unknown>(encoded);if(!validSession(s))return null;
  if(s.expiresAt>Date.now()+120000)return {session:s,changed:false};
  if(s.expiresAt<Date.now()-14*24*60*60*1000)return null;
  try{return {session:await tokenRequest({refresh_token:s.refreshToken,grant_type:"refresh_token"}),changed:true};}
  catch{return null;}
}
export async function graphQl(token:string,query:string,variables?:Record<string,unknown>){
  const headers:Record<string,string>={"content-type":"application/json",Authorization:`Bearer ${token}`};
  if(process.env.SORARE_API_KEY?.trim())headers.APIKEY=process.env.SORARE_API_KEY.trim();
  const resp=await fetch(`${oauthHost}/graphql`,{method:"POST",headers,body:JSON.stringify({query,variables}),cache:"no-store",signal:AbortSignal.timeout(16000)});
  const json=await resp.json().catch(()=>null) as {data?:Record<string,unknown>;errors?:Array<{message?:string}>}|null;
  if(!resp.ok||!json||json.errors?.length)throw new Error(json?.errors?.[0]?.message||`Sorare-Abfrage fehlgeschlagen (${resp.status}).`);
  return json.data??{};
}

/**
 * Short-lived, account-scoped proof of a FULL Sorare sync in this browser tab.
 * A localStorage cache is NOT proof: only a collection fetched during this
 * session can be reused while navigating the new V4 multi-page shell.
 * This limits unnecessary API traffic and avoids showing the unverified warning
 * every time the user opens another Builder route.
 */
import type {OwnedCollection} from "./my-collection";

export const VERIFIED_COLLECTION_TTL_MS=15*60*1000;
type Entry={value:OwnedCollection;verifiedAt:number};
const verifiedBySlug=new Map<string,Entry>();

export function rememberVerifiedCollection(value:OwnedCollection,now=Date.now()){
  if(!value.complete||!value.slug||!Number.isFinite(now))return;
  verifiedBySlug.set(value.slug,{value,verifiedAt:now});
}
export function recentVerifiedCollection(slug:string,now=Date.now()):OwnedCollection|null{
  const entry=verifiedBySlug.get(slug);
  if(!entry)return null;
  if(!entry.value.complete||entry.value.slug!==slug||now<entry.verifiedAt||now-entry.verifiedAt>=VERIFIED_COLLECTION_TTL_MS){
    verifiedBySlug.delete(slug);
    return null;
  }
  return entry.value;
}
export function forgetVerifiedCollection(slug:string){verifiedBySlug.delete(slug);}

/** Only transient failures may be retried; schema and auth errors need action. */
export function shouldRetryCollectionResponse(status:number,error:string){
  if(status!==429&&status!==502&&status!==503&&status!==504)return false;
  if(/cannot query field|unknown argument|unknown field|syntax error|not authorized|unauthorized|permission denied|access denied|must be authenticated/i.test(error))return false;
  return true;
}
export function collectionRetryDelayMs(attempt:number,retryAfterSeconds?:number|null){
  if(typeof retryAfterSeconds==="number"&&Number.isFinite(retryAfterSeconds)&&retryAfterSeconds>=0){
    return Math.min(Math.max(retryAfterSeconds*1000,1000),30000);
  }
  return Math.min(1000*2**attempt,8000);
}

/** Keep a paginated sync alive while Next.js changes client routes. All mounts
 * for the same authenticated user await the same promise (no request storms).
 * A user disconnect cancels it explicitly. No session/token is stored here.
 */
type SyncJob={promise:Promise<OwnedCollection>;controller:AbortController};
const runningBySlug=new Map<string,SyncJob>();
export function shareCollectionSync(slug:string,load:(signal:AbortSignal)=>Promise<OwnedCollection>):Promise<OwnedCollection>{
  const running=runningBySlug.get(slug);
  if(running)return running.promise;
  const controller=new AbortController();
  const promise=Promise.resolve().then(()=>load(controller.signal));
  runningBySlug.set(slug,{promise,controller});
  // Always observe rejection from the cleanup chain (the caller receives the error).
  void promise.finally(()=>{
    if(runningBySlug.get(slug)?.promise===promise)runningBySlug.delete(slug);
  }).catch(()=>{});
  return promise;
}
export function cancelSharedCollectionSync(slug:string){
  const running=runningBySlug.get(slug);
  runningBySlug.delete(slug);
  running?.controller.abort();
}

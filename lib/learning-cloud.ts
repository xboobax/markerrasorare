/** Durable immutable prediction archive on Upstash Redis REST, no client secrets.
 * Predictions/results live under separate keys. No destructive full-list rewrites.
 */
import type {Sport} from './model';
import type {TrackedPrediction} from './tracking';
import {applyOfficialResults,parseTrackingBackup} from './tracking';
import type {AutomaticResult} from './tracking-auto';

export const cloudConfigured=()=>Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const prefix='neon:v34:learning:';
const index=(sport:Sport)=>`${prefix}index:${sport}`;
const id=(key:string)=>encodeURIComponent(key);
const snapshotKey=(key:string)=>`${prefix}snapshot:${id(key)}`;
const resultKey=(key:string)=>`${prefix}result:${id(key)}`;
const statusKey=(name:string)=>`${prefix}status:${name}`;
export type JobStatus={scope:string;at:string;ok:boolean;saved?:number;candidateCount?:number;checked?:number;matched?:number;pending?:number;failures?:number;message?:string};

async function redis(endpoint:'/'|'/pipeline',body:unknown):Promise<any> {
  const root=process.env.UPSTASH_REDIS_REST_URL;
  const token=process.env.UPSTASH_REDIS_REST_TOKEN;
  if(!root||!token)throw new Error('Learning-Datenbank nicht konfiguriert');
  const url=new URL(root);
  if(url.protocol!=='https:'||url.username||url.password)throw new Error('Ungültige Datenbank-Adresse');
  const response=await fetch(`${url.toString().replace(/\/$/,'')}${endpoint==='/'?'':'/pipeline'}`,{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(18000),
  });
  if(!response.ok)throw new Error(`Datenbank HTTP ${response.status}`);
  const payload=await response.json();
  if(payload?.error)throw new Error(`Datenbank: ${String(payload.error).slice(0,100)}`);
  return payload;
}
async function command(...args:(string|number)[]):Promise<any> {
  const data=await redis('/',args);
  return data.result;
}
async function batch(commands:(string|number)[][]):Promise<any[]> {
  if(!commands.length)return [];
  const out:any[]=[];
  for(let i=0;i<commands.length;i+=100){
    const result=await redis('/pipeline',commands.slice(i,i+100));
    if(!Array.isArray(result)||result.some(r=>r?.error))throw new Error('Datenbank-Pipeline unvollständig');
    out.push(...result.map(r=>r.result));
  }
  return out;
}
/** SET NX is the freeze boundary. ZADD NX makes retries idempotent. */
export async function freezeSnapshots(sport:Sport,rows:TrackedPrediction[]):Promise<number> {
  const clean=parseTrackingBackup(rows,sport).filter(r=>r.actual===null&&r.modelVersion==='1.8.0'&&typeof r.engineV2Predicted==='number');
  const commands: (string|number)[][]=[];
  for(const row of clean){
    commands.push(['SET',snapshotKey(row.key),JSON.stringify(row),'NX']);
    commands.push(['ZADD',index(sport),'NX',Date.parse(row.savedAt),row.key]);
  }
  const results=await batch(commands);
  return results.filter((r,i)=>i%2===0&&r==='OK').length;
}
/** Reads a bounded rolling window. Redis preserves older entries; the dashboard
 * only analyzes the latest 10,000 to bound response time and memory. */
export async function readCloudArchive(sport:Sport,limit=10000):Promise<TrackedPrediction[]> {
  const max=Math.max(1,Math.min(10000,Math.floor(limit)));
  const keys:unknown=await command('ZREVRANGE',index(sport),0,max-1);
  if(!Array.isArray(keys)||!keys.length)return [];
  const names=keys.filter((x):x is string=>typeof x==='string');
  const rows:TrackedPrediction[]=[],official:AutomaticResult[]=[];
  // Bounded response payloads are important for the large long-term archive.
  for(let from=0;from<names.length;from+=350){
    const slice=names.slice(from,from+350);
    const raw=await batch([['MGET',...slice.map(snapshotKey)],['MGET',...slice.map(resultKey)]]);
    const snapshots=Array.isArray(raw[0])?raw[0]:[];
    const results=Array.isArray(raw[1])?raw[1]:[];
    rows.push(...parseTrackingBackup(snapshots.map(v=>{try{return JSON.parse(v);}catch{return null;}}),sport));
    for(let i=0;i<slice.length;i++){
      if(typeof results[i]!=='string')continue;
      try {
        const result=JSON.parse(results[i]);
        if(Number.isFinite(result.score)&&result.score>=0&&result.score<=500&&
          typeof result.gameDate==='string'&&Number.isFinite(Date.parse(result.gameDate)))
          official.push({key:slice[i],score:result.score,gameDate:result.gameDate});
      } catch {}
    }
  }
  return applyOfficialResults(rows,official);
}
export async function freezeOfficialResults(results:AutomaticResult[]):Promise<number> {
  const safe=results.filter(r=>typeof r.key==='string'&&r.key.length<=500&&
    Number.isFinite(r.score)&&r.score>=0&&r.score<=500&&Number.isFinite(Date.parse(r.gameDate)));
  const values=await batch(safe.map(r=>['SET',resultKey(r.key),JSON.stringify({score:r.score,gameDate:r.gameDate}),'NX']));
  return values.filter(x=>x==='OK').length;
}
export async function writeJobStatus(status:JobStatus):Promise<void> {
  await command('SET',statusKey(status.scope),JSON.stringify(status),'EX',60*86400);
}
export async function readJobStatus(scopes:string[]):Promise<JobStatus[]> {
  const raw=await batch([['MGET',...scopes.map(statusKey)]]);
  const values=Array.isArray(raw[0])?raw[0]:[];
  return values.flatMap((value:unknown)=>{try{const r=JSON.parse(String(value));return r&&typeof r==='object'&&typeof r.scope==='string'?[r as JobStatus]:[];}catch{return [];}});
}

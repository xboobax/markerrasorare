/** Browser-local IndexedDB archive. No credentials and no server write endpoints.
 * Data remains on THIS device; regular JSON export is recommended.
 */
import type {Sport} from "./model";
import type {TrackedPrediction} from "./tracking";
import {parseTrackingBackup} from "./tracking";
const DATABASE="markerras-prediction-lab";
const STORE="snapshots";
const LEGACY=(sport:Sport)=>`markerras.sorare.tracking.v1.${sport}`;
const MIGRATED=(sport:Sport)=>`markerras.sorare.idb-migrated.v18.${sport}`;

function openDb():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DATABASE,1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"key"});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error??new Error("IndexedDB nicht verfügbar"));
  });
}
function resolveTx(tx:IDBTransaction):Promise<void>{
  return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error??new Error("Speichern fehlgeschlagen"));tx.onabort=()=>reject(tx.error??new Error("Transaktion abgebrochen"));});
}
function getAll(db:IDBDatabase):Promise<unknown[]>{
  return new Promise((resolve,reject)=>{
    const req=db.transaction(STORE,"readonly").objectStore(STORE).getAll();
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
export type ArchiveRead={rows:TrackedPrediction[];backend:"indexeddb"|"localStorage"};
export async function loadArchive(sport:Sport):Promise<ArchiveRead>{
  let legacy:TrackedPrediction[]=[];
  try{const raw=localStorage.getItem(LEGACY(sport));legacy=parseTrackingBackup(raw?JSON.parse(raw):[],sport);}catch{}
  if(typeof indexedDB==="undefined")return {rows:legacy,backend:"localStorage"};
  try{
    const db=await openDb();
    try{
      const stored=parseTrackingBackup(await getAll(db),sport);
      const alreadyMigrated=localStorage.getItem(MIGRATED(sport))==="yes";
      // Import legacy localStorage only on the first database migration.
      // Later imports/deletions cannot be resurrected from a stale mirror.
      // On first run, merge old localStorage records into IndexedDB. Favor an
      // already reconciled result over an unresolved duplicate.
      const seen=new Map<string,TrackedPrediction>();
      for(const row of [...(alreadyMigrated && stored.length ? [] : legacy),...stored]){
        const prev=seen.get(row.key);
        if(!prev||prev.actual===null&&row.actual!==null)seen.set(row.key,row);
      }
      const rows=[...seen.values()].sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
      const tx=db.transaction(STORE,"readwrite");
      for(const r of rows)tx.objectStore(STORE).put(r);
      await resolveTx(tx);
      try{localStorage.setItem(MIGRATED(sport),"yes");}catch{}
      return {rows,backend:"indexeddb"};
    }finally{db.close();}
  }catch{return {rows:legacy,backend:"localStorage"};}
}
export async function persistArchive(sport:Sport,rows:TrackedPrediction[]):Promise<"indexeddb"|"localStorage">{
  // Keep the established V1.7 key as a compatibility mirror when it fits.
  try{localStorage.setItem(LEGACY(sport),JSON.stringify(rows));}catch{}
  if(typeof indexedDB==="undefined")return "localStorage";
  try{
    const db=await openDb();
    try{
      const existing=parseTrackingBackup(await getAll(db),sport);
      const current=new Set(rows.map(row=>row.key));
      const tx=db.transaction(STORE,"readwrite");const store=tx.objectStore(STORE);
      for(const old of existing)if(!current.has(old.key))store.delete(old.key);
      for(const row of rows)store.put(row);
      await resolveTx(tx);
      try{localStorage.setItem(MIGRATED(sport),"yes");}catch{}
      return "indexeddb";
    }finally{db.close();}
  }catch{return "localStorage";}
}

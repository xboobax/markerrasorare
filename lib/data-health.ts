import type {Player,Sport} from "./model";

export type FetchSummary={scopeTeams:number;failedTeams:number;incompleteTeams:number;noScoreTeams:number;
  generatedAt:string;error?:string};
export type HealthMetric={key:string;label:string;count:number;percent:number;note:string};
export type DataHealth={state:"error"|"partial"|"healthy"|"empty";metrics:HealthMetric[];
  players:number;scoreless:number;warnings:string[]};
const hasScore=(p:Player)=>Boolean(p.recentScores?.length) || p.avg!==null || p.proj!==null ||
  p.averageL5!=null || p.averageL10!=null;
export function analyzeDataHealth(players:Player[],summary:FetchSummary):DataHealth {
  const total=players.length;
  const count=(predicate:(p:Player)=>boolean)=>players.filter(predicate).length;
  const metric=(key:string,label:string,predicate:(p:Player)=>boolean,note:string):HealthMetric=>{
    const amount=count(predicate);return {key,label,count:amount,percent:total?Math.round(amount/total*100):0,note};
  };
  const scoreless=count(p=>!hasScore(p));
  const metrics=[
    metric("scoring","Score-Grundlage",hasScore,"L5, L10, Rohscores, Durchschnitt oder Projektion"),
    metric("recent","Historische Einzelscores",p=>Boolean(p.recentScores?.length),"Für Formkurven; Aggregate können trotzdem vorhanden sein"),
    metric("aggregates","L5/L10-Durchschnitt",p=>p.averageL5!=null || p.averageL10!=null,"Mindestens ein offizieller Durchschnitt verfügbar"),
    metric("images","Spielerfotos",p=>Boolean(p.imageUrl),"Vom Datendienst gelieferte Bild-URL; Darstellung kann separat fehlschlagen"),
    metric("fixtures","Spielstatus bestätigt",p=>p.hasGame!==null,"Bekanntes Spiel oder ausdrücklich kein Spiel; unbekannt ≠ spielfrei"),
  ];
  const warnings:string[]=[];
  if(summary.error)warnings.push("Abruf meldet einen Fehler. Vorherige Werte dürfen nicht als aktuell betrachtet werden.");
  if(summary.failedTeams)warnings.push(`${summary.failedTeams} von ${summary.scopeTeams} Teams konnten nicht vollständig abgerufen werden.`);
  if(summary.incompleteTeams)warnings.push(`${summary.incompleteTeams} Team-Kader sind möglicherweise unvollständig (Pagination).`);
  if(summary.noScoreTeams)warnings.push(`${summary.noScoreTeams} Team-Kader kamen ohne unterstützte Score-Felder zurück.`);
  if(scoreless)warnings.push(`${scoreless} Spieler ohne verwertbare Score-Grundlage; Null ist hier keine gültige Prognose.`);
  const state:DataHealth["state"]=summary.error?"error":!total?"empty":warnings.length?"partial":"healthy";
  return {state,metrics,players:total,scoreless,warnings};
}

const SAFE_KEY=/^(?:markerras\.sorare\.(?:cards\.v1|opponent-ratings\.v1|watchlist\.v19|manual-lineup\.v1|arcade-center\.v20|auto-archive\.v18|model\.v18)\.(?:football|nba)|divisorare\.cards\.v2\.(?:football|nba))$/;
export type LocalBackup={format:"markerras-local-settings";version:1;createdAt:string;settings:Record<string,string>};
export function createLocalBackup(storage:Pick<Storage,"length"|"key"|"getItem">,createdAt:string):LocalBackup {
  const settings:Record<string,string>={};
  for(let i=0;i<storage.length;i++){
    const key=storage.key(i);
    if(!key||!SAFE_KEY.test(key))continue;
    const value=storage.getItem(key);
    if(value!==null && value.length<250_000)settings[key]=value;
  }
  return {format:"markerras-local-settings",version:1,createdAt,settings};
}
/** Validates imported keys and JSON, never imports secrets, cookies or unknown paths. */
export function parseLocalBackup(input:unknown):LocalBackup {
  if(!input || typeof input!=="object" || Array.isArray(input))throw new Error("Kein gültiges Backup");
  const x=input as Partial<LocalBackup>;
  if(x.format!=="markerras-local-settings"||x.version!==1||!x.settings||typeof x.settings!=="object"||Array.isArray(x.settings))throw new Error("Unbekanntes Backup-Format");
  const entries=Object.entries(x.settings);
  if(entries.length>30)throw new Error("Zu viele Datensätze");
  const settings:Record<string,string>={};
  let total=0;
  for(const [key,value] of entries){
    if(!SAFE_KEY.test(key)||typeof value!=="string"||value.length>250_000)throw new Error("Unerlaubter oder zu großer Eintrag");
    total+=value.length;
    if(total>1_000_000)throw new Error("Backup zu groß");
    if(key.includes("auto-archive")) {if(value!=="on"&&value!=="off")throw new Error("Ungültige Einstellung");}
    else if(key.includes("model.v18")) {if(value!=="v18"&&value!=="classic")throw new Error("Ungültige Modellauswahl");}
    else {try{JSON.parse(value);}catch{throw new Error("Beschädigter JSON-Datensatz");}}
    settings[key]=value;
  }
  if(!entries.length)throw new Error("Keine Einstellungen in dieser Sicherung");
  return {format:"markerras-local-settings",version:1,createdAt:typeof x.createdAt==="string"?x.createdAt:"",settings};
}

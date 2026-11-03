import {addIsoDays,type ScheduleData,type UpcomingFixture} from "./gameweek-center";

/** Completely separate from the stable Sorare scores / star adapters. */
const germanDay=(date:Date):string=>new Intl.DateTimeFormat("sv-SE",{
  timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit",
}).format(date);
const toIsoTimestamp=(v:unknown):string|undefined=>{
  if(typeof v!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(v))return undefined;
  const d=new Date(v);
  return Number.isFinite(d.getTime())?d.toISOString():undefined;
};
const dateOnly=(v:unknown):string=>typeof v==="string"&&/^\d{4}-\d\d-\d\d/.test(v)?v.slice(0,10):"";
const isInRange=(day:string,from:string,to:string)=>/^\d{4}-\d\d-\d\d$/.test(day)&&day>=from&&day<=to;
const isFinished=(raw:unknown)=>/final|closed|postponed|cancelled|canceled|complete/i.test(String(raw??""));
const sortFixtures=(rows:UpcomingFixture[])=>rows.sort((a,b)=>(a.tipoff??a.date).localeCompare(b.tipoff??b.date)||a.home.localeCompare(b.home));

async function fromBalldontlie(key:string,today:string,end:string):Promise<UpcomingFixture[]> {
  const fixtures:UpcomingFixture[]=[];const seen=new Set<string>();let cursor:number|null=null;
  for(let page=0;page<3;page++){
    const params=new URLSearchParams({start_date:addIsoDays(today,-1),end_date:end,per_page:"100"});
    if(cursor!==null)params.set("cursor",String(cursor));
    const res=await fetch(`https://api.balldontlie.io/v1/games?${params}`,{
      headers:{Authorization:key},next:{revalidate:1800},
    });
    if(!res.ok)throw new Error(`BALLDONTLIE HTTP ${res.status}`);
    const payload=await res.json();
    if(!payload||typeof payload!=="object"||!Array.isArray(payload.data))throw new Error("BALLDONTLIE: unbekanntes Antwortformat");
    for(const g of payload.data){
      if(!g||typeof g!=="object")continue;
      const tipoff=toIsoTimestamp(g.datetime); // g.date alone is a calendar day, not a verified tipoff
      const date=tipoff?germanDay(new Date(tipoff)):dateOnly(g.date);
      const home=typeof g.home_team?.full_name==="string"?g.home_team.full_name.trim():"";
      const away=typeof g.visitor_team?.full_name==="string"?g.visitor_team.full_name.trim():"";
      if(!isInRange(date,today,end)||!home||!away||isFinished(g.status)||isFinished(g.status_state)||g.postponed===true)continue;
      const id=`nba:bdl:${String(g.id??`${date}:${home}:${away}`)}`;
      if(seen.has(id))continue;seen.add(id);
      fixtures.push({id,date,home,away,tipoff,source:"BALLDONTLIE",playerIds:[]});
    }
    const next=Number(payload.meta?.next_cursor);
    if(!Number.isSafeInteger(next)||next<=0||next===cursor)break;
    cursor=next;
  }
  return sortFixtures(fixtures);
}

/** ESPN website feed is an unofficial, best-effort keyless fallback. Never invent a fixture. */
async function fromEspn(today:string,end:string):Promise<UpcomingFixture[]> {
  // A date-month request retrieves the month schedule (one or two requests),
  // with a date-by-date fallback in case an ESPN deployment omits month filtering.
  const months=[...new Set([addIsoDays(today,-1).slice(0,7),today.slice(0,7),end.slice(0,7)])];
  const read=async (dates:string):Promise<any[]>=>{
    const response=await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?${new URLSearchParams({dates,limit:"500"})}`,{
      headers:{Accept:"application/json"},next:{revalidate:1800},
    });
    if(!response.ok)throw new Error(`ESPN HTTP ${response.status}`);
    const payload=await response.json();
    if(!payload||typeof payload!=="object"||!Array.isArray(payload.events))throw new Error("ESPN: unbekanntes Antwortformat");
    return payload.events;
  };
  const all:any[]=[];let error:string|null=null;
  try{
    const pages=await Promise.all(months.map(month=>read(month.replace("-",""))));
    for(const page of pages)all.push(...page);
  }catch(e){error=e instanceof Error?e.message:"ESPN Fehler";}
  if(!all.length){
    // Only if monthly requests failed or returned nothing: try specific calendar days.
    const days:string[]=[];
    for(let d=addIsoDays(today,-1);d<=end;d=addIsoDays(d,1))days.push(d.replace(/-/g,""));
    const pages=await Promise.allSettled(days.map(read));
    for(const page of pages)if(page.status==="fulfilled")all.push(...page.value);
    if(!all.length)throw new Error(error??"ESPN liefert keine Spiele für den Zeitraum");
  }
  const fixtures:UpcomingFixture[]=[],seen=new Set<string>();
  for(const event of all){
    if(!event||typeof event!=="object")continue;
    const tipoff=toIsoTimestamp(event.date);
    if(!tipoff)continue; // trustworthy fixture must have a real datetime
    const day=germanDay(new Date(tipoff));
    if(!isInRange(day,today,end))continue;
    const state=event.status?.type;
    if(state?.completed===true||String(state?.state??"").toLowerCase()==="post"||
       isFinished(state?.name)||isFinished(state?.description)||isFinished(state?.detail))continue;
    const competitors=event.competitions?.[0]?.competitors;
    if(!Array.isArray(competitors))continue;
    const home=competitors.find((c:any)=>c.homeAway==="home")?.team;
    const away=competitors.find((c:any)=>c.homeAway==="away")?.team;
    const homeName=typeof home?.displayName==="string"?home.displayName.trim():"";
    const awayName=typeof away?.displayName==="string"?away.displayName.trim():"";
    if(!homeName||!awayName)continue;
    const id=`nba:espn:${String(event.id??`${day}:${homeName}:${awayName}`)}`;
    if(seen.has(id))continue;seen.add(id);
    fixtures.push({id,date:day,home:homeName,away:awayName,tipoff,source:"ESPN",playerIds:[]});
  }
  return sortFixtures(fixtures);
}

export async function getNbaGameweekSchedule(now=new Date()):Promise<ScheduleData>{
  const today=germanDay(now),end=addIsoDays(today,13);
  const key=process.env.BALLDONTLIE_API_KEY;
  let primaryError:string|null=null;
  if(key){
    try{
      const fixtures=await fromBalldontlie(key,today,end);
      if(fixtures.length)return {fixtures,status:"available",source:"BALLDONTLIE"};
      primaryError="BALLDONTLIE hat keine kommenden NBA-Spiele geliefert";
    }catch(e){primaryError=e instanceof Error?e.message:"BALLDONTLIE Fehler";}
  }
  try{
    const fixtures=await fromEspn(today,end);
    return {fixtures,status:"available",source:"ESPN",
      note:"Spielplan: ESPN (öffentlicher, nicht offiziell unterstützter Feed). Sorare-Scores und Sterne bleiben unabhängig."};
  }catch(e){
    const fallbackError=e instanceof Error?e.message:"ESPN nicht erreichbar";
    return {fixtures:[],status:key?"unavailable":"not-configured",source:null,
      note:`NBA-Spielplan derzeit nicht verfügbar. ${primaryError?`${primaryError}. `:""}${fallbackError}. Bitte später erneut prüfen; keine Termine werden erfunden.`};
  }
}

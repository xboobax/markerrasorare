import {addIsoDays,isoDay,type ScheduleData,type UpcomingFixture} from "./gameweek-center";

/** Optional, isolated schedule fetch. Never touches the tested Sorare score adapter. */
export async function getNbaGameweekSchedule(now=new Date()):Promise<ScheduleData> {
  const key=process.env.BALLDONTLIE_API_KEY;
  if (!key) return {fixtures:[],status:"not-configured",source:null,
    note:"Kein BALLDONTLIE_API_KEY eingerichtet. NBA-Spielplan derzeit nicht verfügbar."};
  try {
    const today=isoDay(now),end=addIsoDays(today,13);
    const fixtures:UpcomingFixture[]=[];
    const seen=new Set<string>();let cursor:number|null=null;
    for(let page=0;page<3;page++) {
      const params=new URLSearchParams({start_date:today,end_date:end,per_page:"100"});
      if (cursor!==null)params.set("cursor",String(cursor));
      const res=await fetch(`https://api.balldontlie.io/v1/games?${params}`,
        {headers:{Authorization:key},next:{revalidate:3600}});
      if (!res.ok)throw new Error(`HTTP ${res.status}`);
      const payload:unknown=await res.json();
      const data=payload&&typeof payload==="object" ? payload as Record<string,unknown> : {};
      const games=Array.isArray(data.data)?data.data:[];
      for(const obj of games) {
        if (!obj||typeof obj!=="object")continue;
        const g=obj as Record<string,any>;
        const date=typeof g.date==="string"?g.date.slice(0,10):"";
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<today||date>end)continue;
        const home=String(g.home_team?.full_name??"").trim();
        const away=String(g.visitor_team?.full_name??"").trim();
        if (!home||!away||/final|closed|postponed|cancel/i.test(`${String(g.status??"")} ${String(g.status_state??"")}`)||g.postponed===true) continue;
        const id=`nba:${String(g.id??`${date}:${home}:${away}`)}`;
        if(seen.has(id)) continue;seen.add(id);
        fixtures.push({id,date,home,away,source:"BALLDONTLIE",playerIds:[]});
      }
      const meta=data.meta&&typeof data.meta==="object"?data.meta as Record<string,unknown>:{};
      const next=Number(meta.next_cursor);
      if(!Number.isSafeInteger(next)||next<=0||next===cursor)break;
      cursor=next;
    }
    fixtures.sort((a,b)=>a.date.localeCompare(b.date)||a.home.localeCompare(b.home));
    return {fixtures,status:"available",source:"BALLDONTLIE"};
  } catch(e) {
    return {fixtures:[],status:"unavailable",source:"BALLDONTLIE",
      note:`NBA-Spielplan konnte nicht geladen werden (${e instanceof Error?e.message:"Netzwerkfehler"}). Scores und Lineups bleiben unverändert.`};
  }
}

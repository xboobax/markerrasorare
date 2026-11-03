/** Optional, best-effort NBA matchup evidence when BALLDONTLIE statistics are unavailable.
 * The public ESPN scoreboard feed is not officially supported. It can be missing or change.
 * ONLY completed NBA regular-season games in a recent window are accepted; never predict
 * or fabricate conceded points. Does not touch the Sorare score/star adapters.
 */
import {mapDefenseToRatings,type AutomaticMatchupData} from "./auto-matchups";
import {canonicalNbaTeam} from "./nba-fixture-mapping";
import {addIsoDays} from "./gameweek-center";
const day=(date:Date)=>date.toISOString().slice(0,10);
type ScoreRow={id:string;date:string;home:string;away:string;homePoints:number;awayPoints:number};

export function extractEspnCompletedGames(events:unknown,fromDay:string,toDay:string):ScoreRow[]{
  if(!Array.isArray(events))return [];
  const rows:ScoreRow[]=[], seen=new Set<string>();
  for(const e of events){
    if(!e||typeof e!=="object")continue;
    const event=e as any;
    if(event.status?.type?.completed!==true)continue;
    if(event.season?.type!==undefined&&Number(event.season.type)!==2)continue; // NBA regular season only
    const iso=typeof event.date==="string"?event.date:"";
    const date=iso.slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<fromDay||date>toDay)continue;
    const c=event.competitions?.[0]?.competitors;
    if(!Array.isArray(c))continue;
    const home=c.find((x:any)=>x?.homeAway==="home"),away=c.find((x:any)=>x?.homeAway==="away");
    const homeName=canonicalNbaTeam(String(home?.team?.displayName??"")),awayName=canonicalNbaTeam(String(away?.team?.displayName??""));
    const usableScore=(value:unknown):number|null=>{
      if((typeof value!=="string"&&typeof value!=="number")||String(value).trim()==="")return null;
      const score=Number(value);
      return Number.isFinite(score)&&score>=0?score:null;
    };
    const h=usableScore(home?.score),a=usableScore(away?.score);
    if(!homeName||!awayName||homeName===awayName||h===null||a===null)continue;
    const signature=String(event.id??`${date}:${homeName}:${awayName}`);
    if(seen.has(signature))continue;seen.add(signature);
    rows.push({id:signature,date,home:homeName,away:awayName,homePoints:h,awayPoints:a});
  }
  return rows;
}
export async function getEspnNbaDefenseFallback(now=new Date()):Promise<AutomaticMatchupData>{
  const year=now.getUTCFullYear(),season=now.getUTCMonth()>=8?year:year-1;
  const failed=(error:string|null):AutomaticMatchupData=>({ratings:{},source:null,coverage:0,error,season});
  const end=day(now),start=addIsoDays(end,-27);
  const months=[...new Set([start.slice(0,7),end.slice(0,7)])];
  try{
    const responses=await Promise.allSettled(months.map(async month=>{
      const url=`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?${new URLSearchParams({dates:month.replace('-',''),limit:'500'})}`;
      const res=await fetch(url,{headers:{Accept:'application/json'},next:{revalidate:21600},signal:AbortSignal.timeout(4500)});
      if(!res.ok)throw new Error(`ESPN HTTP ${res.status}`);
      const data=await res.json();
      if(!data||!Array.isArray(data.events))throw new Error('ESPN: Antwort ohne Spielereignisse');
      return extractEspnCompletedGames(data.events,start,end);
    }));
    const unique=new Map<string,ScoreRow>();
    for(const response of responses)if(response.status==='fulfilled')for(const g of response.value)unique.set(g.id,g);
    const totals=new Map<string,{conceded:number;games:number}>();
    for(const g of unique.values()){
      for(const [team,points] of [[g.home,g.awayPoints],[g.away,g.homePoints]] as const){
        const old=totals.get(team)??{conceded:0,games:0};totals.set(team,{conceded:old.conceded+points,games:old.games+1});
      }
    }
    const ratings=mapDefenseToRatings([...totals.entries()].map(([name,info])=>({name,concededPerGame:info.conceded/info.games,games:info.games})),3);
    if(!Object.keys(ratings).length)return failed('ESPN hat nicht genügend bestätigte Regular-Season-Spiele für eine defensivbasierte Bewertung geliefert.');
    return {ratings,source:'ESPN · zugelassene Punkte/Spiel (letzte 28 Tage, Ligaquintile; inoffizieller Feed)',coverage:Object.keys(ratings).length,error:null,season};
  }catch(e){return failed(e instanceof Error?e.message:'ESPN nicht verfügbar');}
}

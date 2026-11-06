import {getFootballClubs,getPlayers,type Club} from "@/lib/sorare";
import {getRegularNbaTeams} from "@/lib/regular-nba";
import {forecast,type Forecast,type Sport} from "@/lib/model";
import {FOOTBALL_LEAGUES,isFootballLeague} from "@/lib/leagues";
import {getAutomaticMatchupData} from "@/lib/auto-matchups";
import {getEspnNbaDefenseFallback} from "@/lib/nba-defense-fallback";
import {getNbaGameweekSchedule} from "@/lib/nba-gameweek-feed";
import {attachNbaFixtures} from "@/lib/nba-fixture-mapping";
import type {ScheduleData} from "@/lib/gameweek-center";
import type {FetchSummary} from "@/lib/data-health";
import type {AutomaticMatchupData} from "@/lib/auto-matchups";
export type WorkspaceData={sport:Sport;league:string;leagues:string[];team:string;clubs:Club[];players:Forecast[];info:string;error:string;automaticMatchups:AutomaticMatchupData;nbaSchedule:ScheduleData;fetchSummary:FetchSummary};
export type WorkspaceQuery={sport?:string;league?:string;team?:string};
export async function loadWorkspaceData(query:WorkspaceQuery,collectionOnly=false):Promise<WorkspaceData>{
  const sport:Sport=query.sport==="nba"?"nba":"football";
  const emptySchedule:ScheduleData={fixtures:[],status:"not-configured",source:null};
  let players:Forecast[]=[],clubs:Club[]=[],shownClubs:Club[]=[],leagues:string[]=[],league="",team=query.team??"",info="",error="";
  let fetchSummary:FetchSummary={scopeTeams:0,failedTeams:0,incompleteTeams:0,noScoreTeams:0,generatedAt:""};
  if(collectionOnly){return {sport,league,leagues,team:"",clubs,players,info,error,automaticMatchups:{ratings:{},source:null,season:0,coverage:0,error:null},nbaSchedule:emptySchedule,fetchSummary};}
  // Independent schedule and defensive-form feeds must not wait for all club
  // roster requests. The roster fetch keeps its original failure handling.
  const rosterTask=(async()=>{
    try{
      clubs=sport==="football"?await getFootballClubs():await getRegularNbaTeams();
      if(sport==="football"){
        leagues=[...FOOTBALL_LEAGUES];
        league=query.league==="__all"||isFootballLeague(query.league)?query.league:"Bundesliga";
        shownClubs=league==="__all"?clubs:clubs.filter(c=>c.league===league);
      }else shownClubs=clubs;
      if(team&&!shownClubs.some(c=>c.slug===team))team="";
      const scope=team?shownClubs.filter(c=>c.slug===team):shownClubs;
      fetchSummary.scopeTeams=scope.length;
      const response=await getPlayers(sport,scope);
      fetchSummary={...fetchSummary,failedTeams:response.failed,incompleteTeams:response.incomplete,noScoreTeams:response.noScoreFields};
      players=response.players.map(forecast).sort((a,b)=>b.weighted-a.weighted);
      info=`${players.length} Spieler · ${scope.length-response.failed}/${scope.length} Teams geladen.`;
      if(response.failed||response.incomplete)info+=` ${response.failed} Teamabrufe fehlgeschlagen, ${response.incomplete} Kader möglicherweise unvollständig.`;
      if(response.noScoreFields)info+=` Bei ${response.noScoreFields} Teams fehlen Scorefelder.`;
    }catch(e){error=e instanceof Error?e.message:String(e);fetchSummary.error=error;}
    fetchSummary.generatedAt=new Date().toISOString();
  })();
  const [_,automaticMatchups,nbaSchedule]=await Promise.all([
    rosterTask,
    getAutomaticMatchupData(sport),
    sport==="nba"?getNbaGameweekSchedule():Promise.resolve(emptySchedule),
  ]);
  const espnDefense=sport==="nba"&&automaticMatchups.coverage===0?await getEspnNbaDefenseFallback():null;
  const resolvedMatchups=espnDefense&&espnDefense.coverage>0?espnDefense:automaticMatchups;
  if(sport==="nba")players=attachNbaFixtures(players,nbaSchedule);
  return {sport,league,leagues,team,clubs:shownClubs,players,info,error,automaticMatchups:resolvedMatchups,nbaSchedule,fetchSummary};
}

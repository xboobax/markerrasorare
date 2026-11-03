import type {Forecast} from "./model";
import type {ScheduleData,UpcomingFixture} from "./gameweek-center";

/** Stable franchise names only; deliberately no substring guesses for unknown teams. */
const TEAMS:Record<string,string[]>= {
  "Atlanta Hawks":["Hawks"],
  "Boston Celtics":["Celtics"],
  "Brooklyn Nets":["Nets"],
  "Charlotte Hornets":["Hornets"],
  "Chicago Bulls":["Bulls"],
  "Cleveland Cavaliers":["Cavaliers","Cavs"],
  "Dallas Mavericks":["Mavericks","Mavs"],
  "Denver Nuggets":["Nuggets"],
  "Detroit Pistons":["Pistons"],
  "Golden State Warriors":["Warriors"],
  "Houston Rockets":["Rockets"],
  "Indiana Pacers":["Pacers"],
  "LA Clippers":["Los Angeles Clippers","Clippers"],
  "Los Angeles Lakers":["LA Lakers","Lakers"],
  "Memphis Grizzlies":["Grizzlies"],
  "Miami Heat":["Heat"],
  "Milwaukee Bucks":["Bucks"],
  "Minnesota Timberwolves":["Timberwolves","Wolves"],
  "New Orleans Pelicans":["Pelicans"],
  "New York Knicks":["Knicks"],
  "Oklahoma City Thunder":["Thunder"],
  "Orlando Magic":["Magic"],
  "Philadelphia 76ers":["76ers","Philadelphia Sixers","Sixers"],
  "Phoenix Suns":["Suns"],
  "Portland Trail Blazers":["Portland Trailblazers","Trail Blazers","Trailblazers"],
  "Sacramento Kings":["Kings"],
  "San Antonio Spurs":["Spurs"],
  "Toronto Raptors":["Raptors"],
  "Utah Jazz":["Jazz"],
  "Washington Wizards":["Wizards"],
};
const clean=(name:string)=>name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
const aliases=new Map<string,string>();
for(const [canonical,other] of Object.entries(TEAMS)){
  for(const item of [canonical,...other]){
    const key=clean(item);
    if(aliases.has(key)&&aliases.get(key)!==canonical) throw new Error(`NBA-Team-Alias ist mehrdeutig: ${item}`);
    aliases.set(key,canonical);
  }
}
export const canonicalNbaTeam=(name:string):string|null=>aliases.get(clean(name))??null;

/** Do not change scoring/availability forecasts: only append independently verified fixture metadata. */
export function attachNbaFixtures<T extends Forecast>(players:T[],schedule:ScheduleData):T[]{
  if(schedule.status!=="available"||!schedule.fixtures.length)return players;
  const earliest=new Map<string,{fixture:UpcomingFixture;opponent:string;away:boolean}>();
  for(const fixture of schedule.fixtures){
    const home=canonicalNbaTeam(fixture.home),away=canonicalNbaTeam(fixture.away);
    if(!home||!away||home===away||!/^\d{4}-\d{2}-\d{2}$/.test(fixture.date))continue;
    for(const [team,opponent,isAway] of [[home,fixture.away,false],[away,fixture.home,true]] as const){
      const old=earliest.get(team);
      const start=(f:UpcomingFixture)=>f.tipoff??`${f.date}T23:59:59Z`;
      if(!old||start(fixture)<start(old.fixture))earliest.set(team,{fixture,opponent,away:isAway});
    }
  }
  return players.map(p=>{
    const canonical=canonicalNbaTeam(p.team);
    const matched=canonical?earliest.get(canonical):undefined;
    if(!matched)return p; // unknown team or no game: never guess
    const {fixture,opponent}=matched;
    return {...p,opponent,hasGame:true,
      nextGame:`${fixture.date} ${fixture.home} - ${fixture.away}`,
      nextGameTipoff:fixture.tipoff};
  });
}

import {getNbaTeams,type Club} from "./sorare";
import {canonicalNbaTeam} from "./nba-fixture-mapping";
/** Version 4 domain adapter. Keep the verified Sorare query/scoring adapter untouched.
 * Only the 30 recognized NBA franchises may enter regular Builder, Missions,
 * Player Database and Match Center. Historical/event teams are not teams here. */
export function filterRegularNbaTeams(teams:Club[]):Club[]{
  const byFranchise=new Map<string,Club>();
  for(const team of teams){
    const canonical=canonicalNbaTeam(team.name);
    if(!canonical||!/^[a-z0-9-]+$/.test(team.slug)||byFranchise.has(canonical))continue;
    byFranchise.set(canonical,{...team,name:canonical,league:"NBA"});
  }
  return [...byFranchise.values()].sort((a,b)=>a.name.localeCompare(b.name,"en"));
}
export async function getRegularNbaTeams():Promise<Club[]>{return filterRegularNbaTeams(await getNbaTeams())}

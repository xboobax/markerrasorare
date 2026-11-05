/**
 * Supported ESPN soccer competitions. Explicit allowlist prevents caller-supplied
 * URL paths, and groups keep the live scoreboard's request fan-out bounded.
 * A live appearance is NOT proof that a match is eligible for a Sorare contest.
 */
export const FOOTBALL_COMPETITIONS = [
  {key:'eng.1',name:'Premier League',short:'Premier League',group:'leagues'},
  {key:'esp.1',name:'LaLiga',short:'LaLiga',group:'leagues'},
  {key:'ger.1',name:'Bundesliga',short:'Bundesliga',group:'leagues'},
  {key:'fra.1',name:'Ligue 1',short:'Ligue 1',group:'leagues'},
  {key:'uefa.champions',name:'Champions League',short:'Champions League',group:'europe'},
  {key:'uefa.europa',name:'Europa League',short:'Europa League',group:'europe'},
  {key:'uefa.europa.conf',name:'Conference League',short:'Conference League',group:'europe'},
  {key:'fifa.friendly',name:'Freundschaftsländerspiele',short:'Freundschaft',group:'international'},
  {key:'uefa.nations',name:'UEFA Nations League',short:'Nations League',group:'international'},
  {key:'fifa.worldq.uefa',name:'WM-Qualifikation Europa',short:'WMQ Europa',group:'international'},
  {key:'fifa.worldq.conmebol',name:'WM-Qualifikation Südamerika',short:'WMQ Südamerika',group:'international'},
  {key:'fifa.worldq.concacaf',name:'WM-Qualifikation Nord-/Mittelamerika',short:'WMQ CONCACAF',group:'international'},
  {key:'fifa.worldq.caf',name:'WM-Qualifikation Afrika',short:'WMQ Afrika',group:'international'},
  {key:'fifa.worldq.afc',name:'WM-Qualifikation Asien',short:'WMQ Asien',group:'international'},
  {key:'fifa.worldq.ofc',name:'WM-Qualifikation Ozeanien',short:'WMQ Ozeanien',group:'international'},
  {key:'fifa.world',name:'FIFA Weltmeisterschaft',short:'WM',group:'international'},
  {key:'uefa.euro',name:'UEFA Europameisterschaft',short:'EM',group:'international'},
  {key:'uefa.euroq',name:'EM-Qualifikation',short:'EM-Quali',group:'international'},
  {key:'conmebol.america',name:'Copa América',short:'Copa América',group:'international'},
  {key:'concacaf.gold',name:'CONCACAF Gold Cup',short:'Gold Cup',group:'international'},
  {key:'concacaf.nations.league',name:'CONCACAF Nations League',short:'Nations CONCACAF',group:'international'},
  {key:'caf.nations',name:'Afrika-Cup',short:'AFCON',group:'international'},
  {key:'caf.nations_qual',name:'Afrika-Cup-Qualifikation',short:'AFCON-Quali',group:'international'},
  {key:'afc.asian.cup',name:'Asienmeisterschaft',short:'Asian Cup',group:'international'},
] as const;
export type FootballLeagueKey=(typeof FOOTBALL_COMPETITIONS)[number]['key'];
export type FootballCompetitionGroup='clubs'|'leagues'|'europe'|'international';
export type FootballCompetitionFilter=FootballLeagueKey|FootballCompetitionGroup;
const keys=new Set<string>(FOOTBALL_COMPETITIONS.map(item=>item.key));
export function isFootballLeagueKey(key:string):key is FootballLeagueKey{return keys.has(key);}
export function isFootballCompetitionFilter(key:string):key is FootballCompetitionFilter{
  return isFootballLeagueKey(key)||key==='clubs'||key==='leagues'||key==='europe'||key==='international';
}
export function footballCompetition(key:FootballLeagueKey){return FOOTBALL_COMPETITIONS.find(item=>item.key===key)!;}
export function footballCompetitionsFor(filter:FootballCompetitionFilter):FootballLeagueKey[]{
  if(isFootballLeagueKey(filter))return [filter];
  return FOOTBALL_COMPETITIONS.filter(item=>filter==='clubs'?item.group!=='international':item.group===filter).map(item=>item.key);
}
export function footballCompetitionGroup(filter:FootballCompetitionFilter):FootballCompetitionGroup{
  return isFootballLeagueKey(filter)?footballCompetition(filter).group:filter;
}
export function isNationalFootballLeague(key:FootballLeagueKey){return footballCompetition(key).group==='international';}
export const footballLeagueKeys=FOOTBALL_COMPETITIONS.map(c=>c.key);

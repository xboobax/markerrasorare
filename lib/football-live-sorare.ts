/** Conservative, read-only matching of a Sorare game to a selected ESPN match.
 * No ESPN ID is ever passed as a Sorare game ID. */
export type CandidateSorareGame={id:string;date:string;homeTeam:{name:string}|null;awayTeam:{name:string}|null};
export type OfficialFootballPlayerScore={slug:string;name:string;score:number;scoreStatus:string};
const TEAM_ALIASES:Record<string,string>={
  manunited:'manchesterunited',manutd:'manchesterunited',manchesterutd:'manchesterunited',parissg:'parissaintgermain',psg:'parissaintgermain',
  bayernmunchen:'bayernmunich',bayernmunchen1899:'bayernmunich',bayern:'bayernmunich',
  tsghoffenheim:'hoffenheim','1899hoffenheim':'hoffenheim',
  bvb:'borussiadortmund',dortmund:'borussiadortmund',
  atletico:'atleticomadrid',atleticodemadrid:'atleticomadrid',
  barca:'barcelona',fcbarcelona:'barcelona',realmadricf:'realmadrid',
  internazionale:'intermilan',inter:'intermilan',
  leverkusen:'bayerleverkusen',tottenham:'tottenhamhotspur'
};
export const sorareNameKey=(name:string)=>{
  const key=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/\b(fc|cf|afc|sc|sv|club|football|the)\b/g,'').replace(/[^a-z0-9]/g,'');
  return TEAM_ALIASES[key]??key;
};
export function matchSorareGame(games:CandidateSorareGame[],target:{date:string;home:string;away:string}):CandidateSorareGame|null{
  const matched=games.filter(g=>{
    const a=sorareNameKey(g.awayTeam?.name??''),h=sorareNameKey(g.homeTeam?.name??'');
    if(!a||!h||a!==sorareNameKey(target.away)||h!==sorareNameKey(target.home))return false;
    const delta=Math.abs(Date.parse(g.date)-Date.parse(target.date));
    return Number.isFinite(delta)&&delta<=6*60*60*1000;
  });
  return matched.length===1?matched[0]:null;
}
export function parseSorareFootballScores(raw:unknown):OfficialFootballPlayerScore[]{
  if(!Array.isArray(raw))return [];
  const rows:OfficialFootballPlayerScore[]=[];
  for(const v of raw){
    if(!v||typeof v!=='object')continue;
    const item=v as Record<string,unknown>;
    const fp=item.footballPlayer&&typeof item.footballPlayer==='object'?item.footballPlayer as Record<string,unknown>:null;
    const score=item.score,slug=fp?.slug,name=fp?.displayName,scoreStatus=item.scoreStatus;
    if(typeof slug!=='string'||!/^[a-z0-9-]+$/.test(slug)||typeof name!=='string'||name.length<2)continue;
    if(typeof score!=='number'||!Number.isFinite(score)||score<0||score>100||typeof scoreStatus!=='string')continue;
    if(scoreStatus==='NO_GAME'||scoreStatus==='DID_NOT_PLAY')continue;
    rows.push({slug,name,score,scoreStatus});
  }
  const counts=new Map<string,number>();
  for(const row of rows){const key=row.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');counts.set(key,(counts.get(key)||0)+1);}
  return rows.filter(row=>{const key=row.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');return counts.get(key)===1;});
}

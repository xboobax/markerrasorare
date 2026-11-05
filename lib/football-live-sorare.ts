/** Conservative matching of an ESPN game to a Sorare game and its players.
 * The Sorare API schema is published at https://api.sorare.com/graphql/schema */
export type SorareTeamRef={name:string;slug?:string};
export type CandidateSorareGame={id:string;date:string;homeTeam:SorareTeamRef|null;awayTeam:SorareTeamRef|null};
export type SorareClubRef={name:string;slug:string};
export type OfficialFootballPlayerScore={slug:string;name:string;score:number;scoreStatus:string};
export type OfficialFootballPlayerPhoto={slug:string;name:string;url:string};
const TEAM_ALIASES:Record<string,string>={
  manunited:'manchesterunited',manutd:'manchesterunited',manchesterutd:'manchesterunited',parissg:'parissaintgermain',psg:'parissaintgermain',
  bayernmunchen:'bayernmunich',bayernmunchen1899:'bayernmunich',bayern:'bayernmunich',
  tsghoffenheim:'hoffenheim','1899hoffenheim':'hoffenheim',tsg1899hoffenheim:'hoffenheim',
  bvb:'borussiadortmund',dortmund:'borussiadortmund',
  atletico:'atleticomadrid',atleticodemadrid:'atleticomadrid',
  barca:'barcelona',fcbarcelona:'barcelona',realmadricf:'realmadrid',
  internazionale:'intermilan',inter:'intermilan',
  leverkusen:'bayerleverkusen',tottenham:'tottenhamhotspur',spurs:'tottenhamhotspur',
  mancity:'manchestercity',newcastle:'newcastleunited',westham:'westhamunited',
  brighton:'brightonandhovealbion',brightonhovealbion:'brightonandhovealbion',
  nottinghamforest:'nottinghamforest',wolves:'wolverhamptonwanderers',
  bayer04leverkusen:'bayerleverkusen',fcbayernmunchen:'bayernmunich',
  rbleipzig:'rasenballsportleipzig',
  parisgermain:'parissaintgermain',parissaintgermainfc:'parissaintgermain',
  om:'olympiquemarseille',marseille:'olympiquemarseille',
  lyon:'olympiquelyonnais',olympiquelyon:'olympiquelyonnais',
  monaco:'asmonaco',bolognafc:'bologna',
  athleticbilbao:'athleticclub',athleticclubbilbao:'athleticclub',
  realbetisbalompie:'realbetis',betis:'realbetis',
  sportingcp:'sportinglisbon',sportingportugal:'sportinglisbon',
  napoli:'sscalcionapoli',ssnapoli:'sscalcionapoli',
  acmilan:'milan',internazionalemilano:'intermilan',
  celta:'rcceltadevigo',celtavigo:'rcceltadevigo',
  roma:'asroma',sscnapoli:'sscalcionapoli',
  frankfurt:'eintrachtfrankfurt',stuttgart:'vfbstuttgart',
  mainz:'fsvmainz05',mainz05:'fsvmainz05',
  unionberlin:'unionberlin',
  stadedereims:'reims',stadereims:'reims',reims:'reims',
  ogcnice:'nice',nice:'nice',
  borussiamgladbach:'borussiamonchengladbach',monchengladbach:'borussiamonchengladbach',
  realsociedaddefutbol:'realsociedad',realsociedadfutbol:'realsociedad'
};
export const sorareNameKey=(name:string)=>{
  const key=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/\b(fc|cf|afc|sc|sv|club|football|the|de|du|del)\b/g,'').replace(/[^a-z0-9]/g,'');
  return TEAM_ALIASES[key]??key;
};
export const sorarePlayerKey=(name:string)=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
/** Resolve a real Sorare club from the public club catalog; never guess or build
 * Sorare slugs from ESPN names. If several clubs normalize to the same name,
 * decline to resolve instead of attributing a rival's photos or scores. */
export function resolveSorareClubSlug(name:string,clubs:readonly SorareClubRef[]):string|null{
  const key=sorareNameKey(name);
  if(!key||key.length<4)return null;
  const direct=clubs.filter(c=>typeof c.slug==='string'&&/^[a-z0-9-]+$/.test(c.slug)&&
    (sorareNameKey(c.name)===key||sorareNameKey(c.slug)===key));
  const slugs=[...new Set(direct.map(c=>c.slug))];
  if(slugs.length===1)return slugs[0];
  if(slugs.length>1)return null;
  // Distinctive longer variants, e.g. "Real Sociedad" / "Real Sociedad de Fútbol".
  // Do not match short names like "United", "Real", or national teams by substring.
  if(key.length<8)return null;
  const close=clubs.filter(c=>{
    const other=sorareNameKey(c.name);
    return other.length>=8&&Math.min(other.length,key.length)/Math.max(other.length,key.length)>=0.68&&
      (other.startsWith(key)||key.startsWith(other));
  });
  return close.length===1&&/^[a-z0-9-]+$/.test(close[0].slug)?close[0].slug:null;
}
/** Match only the selected home/away identity AND kickoff date. Known Sorare
 * team slugs are stronger evidence than display names, but are never inferred. */
export function matchSorareGame(
  games:CandidateSorareGame[],target:{date:string;home:string;away:string},
  verifiedSlugs?:{home?:string|null;away?:string|null}
):CandidateSorareGame|null{
  const matched=games.filter(g=>{
    const same=(candidate:SorareTeamRef|null,targetName:string,slug?:string|null)=>{
      if(!candidate)return false;
      if(slug&&candidate.slug)return candidate.slug===slug;
      return sorareNameKey(candidate.name)===sorareNameKey(targetName);
    };
    if(!same(g.homeTeam,target.home,verifiedSlugs?.home)||!same(g.awayTeam,target.away,verifiedSlugs?.away))return false;
    const delta=Math.abs(Date.parse(g.date)-Date.parse(target.date));
    return Number.isFinite(delta)&&delta<=6*60*60*1000;
  });
  return matched.length===1?matched[0]:null;
}
const safePhoto=(url:unknown):url is string=>typeof url==='string'&&/^https:\/\//.test(url)&&url.length<1000;
export const bestSorarePhoto=(data:Record<string,unknown>):string|null=>{
  for(const source of [data.avatarPictureUrl,data.fullPictureUrl,data.pictureUrl]){
    if(safePhoto(source))return source;
  }
  return null;
};
/** For player portraits, prefer Sorare's per-game player roster over ESPN's
 * missing / 404 CDN image. Both must still be matched to the verified game. */
export function parseSorareFootballPhotos(players:unknown,scores:unknown):OfficialFootballPlayerPhoto[]{
  const entries=[...(Array.isArray(players)?players:[]),...(Array.isArray(scores)?scores.map(s=>s?.footballPlayer):[])];
  const rows:OfficialFootballPlayerPhoto[]=[];const seen=new Set<string>();
  for(const entry of entries){
    if(!entry||typeof entry!=='object')continue;
    const p=entry as Record<string,unknown>;
    const url=bestSorarePhoto(p);
    if(typeof p.slug!=='string'||typeof p.displayName!=='string'||!url||seen.has(p.slug))continue;
    seen.add(p.slug);rows.push({slug:p.slug,name:p.displayName,url});
  }
  // Fail closed for duplicate full names rather than associating a portrait
  // with an athlete from the opposite team.
  const counts=new Map<string,number>();
  for(const row of rows){const k=sorarePlayerKey(row.name);counts.set(k,(counts.get(k)??0)+1);}
  return rows.filter(row=>counts.get(sorarePlayerKey(row.name))===1);
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
  for(const row of rows){const key=sorarePlayerKey(row.name);counts.set(key,(counts.get(key)||0)+1);}
  return rows.filter(row=>counts.get(sorarePlayerKey(row.name))===1);
}

/** Resolve a full name or a uniquely matching initial + surname, but never
 * attach data if two ESPN athletes or two Sorare entries could match. */
export function matchSorarePlayer<T extends {name:string}>(name:string,rows:readonly T[],rosterNames:readonly string[]):T|null{
  const key=sorarePlayerKey(name);
  if(!key||rosterNames.filter(n=>sorarePlayerKey(n)===key).length!==1)return null;
  const exact=rows.filter(r=>sorarePlayerKey(r.name)===key);
  if(exact.length===1)return exact[0];
  if(exact.length>1)return null;
  const parts=(raw:string)=>raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const query=parts(name);
  if(query.length<2)return null;
  const matches=(raw:string)=>{
    const other=parts(raw);
    return other.length>=2&&query[0][0]===other[0][0]&&query[query.length-1]===other[other.length-1];
  };
  // Require a single matching roster identity AND a single Sorare identity.
  if(rosterNames.filter(matches).length!==1)return null;
  const possible=rows.filter(r=>matches(r.name));
  return possible.length===1?possible[0]:null;
}

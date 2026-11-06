/** V4.5.16.1: Fail-closed cross-provider identity verification for archived FINAL games.
 * This code never guesses from name alone and never changes player scores or forecasts. */
import {sorareNameKey} from './football-live-sorare';
const normalizedName=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');

export type ArchivedSorareIdentity={scoreId:string;slug:string;playerName:string;gameId:string;
  date:string;home:string;away:string;team:string|null};
export type ArchivedProviderIdentity={source:string;sourceGameId:string;sourcePlayerId:string;
  playerName:string;team:string;opponent:string;date:string;scoreId:string};
export type VerifiedIdentityProposal={provider:string;providerPlayerId:string;sorareSlug:string;
  sorareScoreId:string;sorareGameId:string;sourceGameId:string};

/** Normalize club display punctuation and non-distinctive club abbreviations.
 * Do not remove descriptive city/place words, or use fuzzy/sub-string matches. */
export function clubIdentityKey(name:string):string{
  const clean=(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/&/g,' and ')
    .replace(/[^a-z0-9]+/g,' ')
    .trim().split(/\s+/).filter(token=>token&&!['fc','cf','afc','sc','sv','sk','f','c','a','s'].includes(token)).join(' ');
  const canonical=sorareNameKey(clean);
  const aliases:Record<string,string>={
    rcstrasbourgalsace:'strasbourg',rcstrasbourg:'strasbourg',
    strasbourgracing:'strasbourg',
    ofi:'oficrete',ofiheraklion:'oficrete',
    staderennes:'staderennais',stadederennes:'staderennais',rennes:'staderennais',
    ajauxerre:'auxerre',auxerre:'auxerre',
    rclens:'lens',estactroyes:'troyes',
    stadebrestois29:'brest',stadebrestois:'brest',
    puntigamersturmgraz:'sturmgraz',
    stademalherbecaen:'caen',
    bayernmuenchen:'bayernmunich',
    brightonandhovealbion:'brightonandhovealbion',
    brightonhovealbion:'brightonandhovealbion'
  };
  return aliases[canonical]??canonical;
}
export function clubsIdentical(a:string,b:string):boolean{
  const x=clubIdentityKey(a),y=clubIdentityKey(b);
  return x.length>=4&&y.length>=4&&x===y;
}

function independentlyVerified(score:ArchivedSorareIdentity,row:ArchivedProviderIdentity):boolean{
  if(!score.team||score.scoreId!==row.scoreId||!score.gameId||!score.slug||
     !score.home||!score.away||!row.sourcePlayerId||!row.sourceGameId||
     normalizedName(score.playerName).length<4||
     normalizedName(score.playerName)!==normalizedName(row.playerName))return false;
  const delta=Math.abs(Date.parse(score.date)-Date.parse(row.date));
  if(!Number.isFinite(delta)||delta>3*60*60*1000)return false;
  if(!clubsIdentical(row.team,score.team)||clubsIdentical(row.team,row.opponent)||
     clubsIdentical(score.home,score.away))return false;
  // Verify both ends of the official fixture and the side the player played for.
  if(clubsIdentical(score.team,score.home))return clubsIdentical(row.opponent,score.away);
  if(clubsIdentical(score.team,score.away))return clubsIdentical(row.opponent,score.home);
  return false;
}

/** Exactly one provider player+match per Sorare FINAL score. A different ID for
 * the same source+slug, or one provider ID assigned to two slugs, is ambiguous. */
export function verifiedIdentityProposals(
  scores:readonly ArchivedSorareIdentity[],rows:readonly ArchivedProviderIdentity[]
):VerifiedIdentityProposal[]{
  const byScore=new Map(scores.map(s=>[s.scoreId,s]));
  const scorePlayerSlugs=new Map<string,Set<string>>();
  for(const score of scores){
    const k=`${score.gameId}:${normalizedName(score.playerName)}`;
    const slugs=scorePlayerSlugs.get(k)??new Set<string>();slugs.add(score.slug);scorePlayerSlugs.set(k,slugs);
  }
  const grouped=new Map<string,ArchivedProviderIdentity[]>();
  for(const row of rows){
    const score=byScore.get(row.scoreId);
    if(!score||!independentlyVerified(score,row))continue;
    const k=`${score.scoreId}:${row.source}`;
    grouped.set(k,[...(grouped.get(k)??[]),row]);
  }
  const tentative:VerifiedIdentityProposal[]=[];
  for(const [k,choices] of grouped){
    const score=byScore.get(choices[0].scoreId)!;
    if(scorePlayerSlugs.get(`${score.gameId}:${normalizedName(score.playerName)}`)?.size!==1)continue;
    const unique=new Map(choices.map(c=>[`${c.sourceGameId}:${c.sourcePlayerId}`,c]));
    if(unique.size!==1)continue;
    const row=unique.values().next().value!;
    if(!/^[a-z0-9-]+$/.test(score.slug)||!['espn','understat'].includes(row.source))continue;
    tentative.push({provider:row.source,providerPlayerId:row.sourcePlayerId,sorareSlug:score.slug,
      sorareScoreId:score.scoreId,sorareGameId:score.gameId,sourceGameId:row.sourceGameId});
  }
  const slugByProviderId=new Map<string,Set<string>>();
  const idByProviderSlug=new Map<string,Set<string>>();
  for(const p of tentative){
    const idKey=`${p.provider}:${p.providerPlayerId}`,slugKey=`${p.provider}:${p.sorareSlug}`;
    const slugs=slugByProviderId.get(idKey)??new Set<string>();slugs.add(p.sorareSlug);slugByProviderId.set(idKey,slugs);
    const ids=idByProviderSlug.get(slugKey)??new Set<string>();ids.add(p.providerPlayerId);idByProviderSlug.set(slugKey,ids);
  }
  const uniqueProposals=new Map<string,VerifiedIdentityProposal>();
  for(const p of tentative){
    const idKey=`${p.provider}:${p.providerPlayerId}`,slugKey=`${p.provider}:${p.sorareSlug}`;
    if(slugByProviderId.get(idKey)?.size!==1||idByProviderSlug.get(slugKey)?.size!==1)continue;
    uniqueProposals.set(idKey,p);
  }
  return [...uniqueProposals.values()];
}

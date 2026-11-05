import {NextRequest,NextResponse} from 'next/server';
import {isFootballLeagueKey,type FootballLeagueKey} from '@/lib/football-competitions';
import {footballLiveGame} from '@/lib/football-live-server';
import {matchSorareGame,parseSorareFootballScores,parseSorareFootballPhotos,resolveSorareClubSlug,
  type CandidateSorareGame,type SorareClubRef} from '@/lib/football-live-sorare';
import {graphQl,sessionForRequest,setSessionCookie} from '@/lib/sorare-oauth-session';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
const headers={'Cache-Control':'private, no-store'};
const response=(data:Record<string,unknown>)=>NextResponse.json({source:'Sorare',scores:[],photos:[],...data},{headers});

// All supported fixtures use one generic Sorare club index. No per-club
// exception for Hoffenheim, Palace or any other team is needed.
const clubCatalogQuery=`query MatchCenterClubCatalog {
  football { clubsReady { name slug } }
}`;
// The catalog contains PUBLIC club metadata only. Never cache OAuth tokens,
// user collections or per-game player scores in a shared module variable.
let clubCatalogCache:{until:number;rows:SorareClubRef[]}|null=null;
let clubCatalogPending:Promise<SorareClubRef[]>|null=null;
async function publicClubCatalog(token:string):Promise<SorareClubRef[]>{
  if(clubCatalogCache&&Date.now()<clubCatalogCache.until)return clubCatalogCache.rows;
  if(!clubCatalogPending){
    clubCatalogPending=graphQl(token,clubCatalogQuery,{}).then(data=>{
      const list=(data.football as {clubsReady?:SorareClubRef[]}|undefined)?.clubsReady;
      if(!Array.isArray(list))throw new Error('Sorare-Clubkatalog nicht verfügbar.');
      const rows=list.filter(c=>c&&typeof c.name==='string'&&typeof c.slug==='string'&&/^[a-z0-9-]+$/.test(c.slug));
      clubCatalogCache={until:Date.now()+6*3600_000,rows};
      return rows;
    }).finally(()=>{clubCatalogPending=null});
  }
  return clubCatalogPending;
}
const gameFields='id date homeTeam { name slug } awayTeam { name slug }';
const playerFields='slug displayName avatarPictureUrl fullPictureUrl pictureUrl';
const scoreFields=`${gameFields}
  players { ${playerFields} }
  playerGameScores { score scoreStatus ... on PlayerGameScore { footballPlayer { ${playerFields} } } }`;
const globalQuery=`query MatchCenterGlobalGames($from: ISO8601DateTime!, $to: ISO8601DateTime!) {
  competitionGames(fromDate: $from, toDate: $to, sport: FOOTBALL) { games { ${gameFields} } }
}`;
// Unlike clubs(slugs:[...]), this requests high-cardinality connections
// (activePlayers, games) on ONE club at a time as required by Sorare.
const singleClubQuery=`query MatchCenterClub($slug: String!, $start: ISO8601DateTime!, $end: ISO8601DateTime!) {
  football { club(slug: $slug) {
    name slug activePlayers(first: 70) { nodes { ${playerFields} } }
    games(first: 30, startDate: $start, endDate: $end) { nodes { ${gameFields} } }
  } }
}`;
// Keep this public competition-level fallback only for verified slugs.
const competitionSlugs:Partial<Record<FootballLeagueKey,string>>={
  'uefa.europa':'uefa-europa-league','uefa.champions':'uefa-champions-league',
  'ger.1':'bundesliga-de'
};
const competitionQuery=`query MatchCenterCompetition($slug: String!) {
  football { competition(slug: $slug) {
    pastGames(last: 60) { nodes { ${gameFields} } }
    futureGames(first: 60) { nodes { ${gameFields} } }
  } }
}`;
const recentQuery=`query MatchCenterMyGames {
  football { myOngoingAndRecentGames { ${gameFields} } myLiveGames { ${gameFields} } }
}`;
const nodeQuery=`query MatchCenterNode($id: ID!) { node(id: $id) { ... on Game { ${scoreFields} } } }`;
const legacyQuery=`query MatchCenterLegacyGame($id: ID!) { football { game(id: $id) { ${scoreFields} } } }`;
type ScoreGame=CandidateSorareGame&{players:unknown;playerGameScores:unknown};
type ClubResponse={name:string;slug:string;activePlayers?:{nodes?:unknown[]};games?:{nodes?:CandidateSorareGame[]}};
const candidatesFrom=(x:unknown):CandidateSorareGame[]=>Array.isArray(x)?x.filter((v):v is CandidateSorareGame=>
  Boolean(v&&typeof v==='object'&&typeof v.id==='string'&&typeof v.date==='string')):[];
const uniqueGames=(g:CandidateSorareGame[])=>Array.from(new Map(g.map(row=>[row.id,row])).values());
const photoRows=(rows:unknown[])=>parseSorareFootballPhotos(rows,[]);

export async function GET(req:NextRequest){
  const event=req.nextUrl.searchParams.get('event')??'',league=req.nextUrl.searchParams.get('league')??'';
  if(!/^\d{6,14}$/.test(event)||!isFootballLeagueKey(league))
    return NextResponse.json({error:'Ungültige Matchdaten.'},{status:400,headers});
  const user=await sessionForRequest(req);
  if(!user)return response({status:'not-connected',message:'Sorare-Verbindung erforderlich.'});
  const done=(data:Record<string,unknown>)=>{
    const res=response(data);
    if(user.changed)setSessionCookie(res,user.session);
    return res;
  };
  try{
    const espn=await footballLiveGame(event,league);
    const when=Date.parse(espn.game.date);
    if(!Number.isFinite(when))return done({status:'error',step:'espn-date',message:'Ungültige ESPN-Anstoßzeit.'});
    const target={date:espn.game.date,home:espn.game.home.name,away:espn.game.away.name};
    const discovered:CandidateSorareGame[]=[];
    const rawPortraits:unknown[]=[];
    const discovery:string[]=[];
    const warnings:string[]=[];
    const targetTeams=[target.home,target.away];
    const hints:{home:string|null;away:string|null}={home:null,away:null};
    const gameWindow={from:new Date(when-8*3600_000).toISOString(),to:new Date(when+8*3600_000).toISOString()};

    // Discover ALL Sorare-supported competitions on the game's calendar day.
    // Do not use the signed-in manager's own match list as the primary source.
    try{
      const data=await graphQl(user.session.accessToken,globalQuery,gameWindow);
      const groups=data.competitionGames as Array<{games?:CandidateSorareGame[]}>|undefined;
      discovered.push(...(Array.isArray(groups)?groups.flatMap(g=>candidatesFrom(g?.games)):[]));
      discovery.push('public-competition-games');
    }catch(e){warnings.push(`Spiele: ${e instanceof Error?e.message:'unbekannter Fehler'}`);}

    // Prefer club slugs already supplied by Sorare's public game list.
    const seenTeams=discovered.flatMap(g=>[g.homeTeam,g.awayTeam])
      .filter((t):t is {name:string;slug:string}=>Boolean(t&&typeof t.slug==='string'&&t.slug));
    hints.home=resolveSorareClubSlug(target.home,seenTeams);
    hints.away=resolveSorareClubSlug(target.away,seenTeams);

    // If Sorare does not list this particular game, resolve BOTH clubs from
    // the public club catalog, instead of hardcoding two club slugs. Photos
    // therefore remain independent of score availability.
    if(!hints.home||!hints.away){
      try{
        const catalog=await publicClubCatalog(user.session.accessToken);
        hints.home=hints.home??resolveSorareClubSlug(target.home,catalog);
        hints.away=hints.away??resolveSorareClubSlug(target.away,catalog);
        discovery.push('public-club-catalog');
      }catch(e){warnings.push(`Vereinsindex: ${e instanceof Error?e.message:'nicht erreichbar'}`);}
    }
    const resolvedSlugs=[...new Set([hints.home,hints.away].filter((s):s is string=>Boolean(s)))];
    const start=new Date(when-12*3600_000).toISOString(),end=new Date(when+12*3600_000).toISOString();
    const clubResponses=await Promise.allSettled(resolvedSlugs.slice(0,2).map(async slug=>{
      const data=await graphQl(user.session.accessToken,singleClubQuery,{slug,start,end});
      return (data.football as {club?:ClubResponse|null}|undefined)?.club??null;
    }));
    for(let i=0;i<clubResponses.length;i++){
      const result=clubResponses[i];
      if(result.status==='rejected'){
        warnings.push(`Verein ${i+1}: ${result.reason instanceof Error?result.reason.message:'nicht erreichbar'}`);
        continue;
      }
      const club=result.value;
      if(!club||club.slug!==resolvedSlugs[i])continue;
      discovered.push(...candidatesFrom(club.games?.nodes));
      rawPortraits.push(...(club.activePlayers?.nodes??[]));
    }
    if(clubResponses.length)discovery.push('individual-club-rosters');

    // The existing competition fallback remains available for leagues where
    // Sorare's public window omits a supported fixture.
    let unique=uniqueGames(discovered);
    let matched=matchSorareGame(unique,target,hints);
    if(!matched&&competitionSlugs[league]){
      try{
        const data=await graphQl(user.session.accessToken,competitionQuery,{slug:competitionSlugs[league]});
        const comp=(data.football as {competition?:{pastGames?:{nodes?:CandidateSorareGame[]};futureGames?:{nodes?:CandidateSorareGame[]}}}|undefined)?.competition;
        discovered.push(...candidatesFrom(comp?.pastGames?.nodes),...candidatesFrom(comp?.futureGames?.nodes));
        discovery.push('competition-fallback');
      }catch(e){warnings.push(`Wettbewerb: ${e instanceof Error?e.message:'nicht erreichbar'}`);}
      unique=uniqueGames(discovered);
      matched=matchSorareGame(unique,target,hints);
    }
    const photosFromClubs=photoRows(rawPortraits);
    if(!matched&&!discovered.length){
      try{
        const data=await graphQl(user.session.accessToken,recentQuery,{});
        const root=data.football as {myOngoingAndRecentGames?:CandidateSorareGame[];myLiveGames?:CandidateSorareGame[]}|undefined;
        discovered.push(...candidatesFrom(root?.myOngoingAndRecentGames),...candidatesFrom(root?.myLiveGames));
        discovery.push('user-fallback');
      }catch(e){warnings.push(`Benutzerspiele: ${e instanceof Error?e.message:'nicht erreichbar'}`);}
      unique=uniqueGames(discovered);
      matched=matchSorareGame(unique,target,hints);
    }
    const diagnosed={discovery,discoveredGames:unique.length,clubsResolved:resolvedSlugs.length,
      clubPhotos:photosFromClubs.length,sourceWarnings:warnings.map(x=>x.slice(0,200))};
    if(!matched){
      return done({status:'unmatched',step:'game-discovery',...diagnosed,
        photos:photosFromClubs,portraitCandidates:photosFromClubs.length,
        message:`Kein eindeutig zugeordnetes Sorare-Spiel. ${resolvedSlugs.length}/2 Vereine erkannt, ${photosFromClubs.length} Club-Porträts. Sorare-Scores nur für von Sorare unterstützte Spiele.`});
    }
    let scoreGame:ScoreGame|null=null,lookup='node';
    try{
      const data=await graphQl(user.session.accessToken,nodeQuery,{id:matched.id});
      const node=data.node as ScoreGame|null|undefined;
      if(node?.id===matched.id)scoreGame=node;
    }catch(e){return done({status:'error',step:'global-node',...diagnosed,photos:photosFromClubs,
      message:`Sorare-Spielabruf: ${e instanceof Error?e.message:'Quelle nicht erreichbar'}`});}
    if(!scoreGame&&!matched.id.includes(':')){
      try{
        const data=await graphQl(user.session.accessToken,legacyQuery,{id:matched.id});
        const result=(data.football as {game?:ScoreGame}|undefined)?.game;
        if(result?.id===matched.id){scoreGame=result;lookup='legacy';}
      }catch(e){return done({status:'error',step:'legacy-game',...diagnosed,photos:photosFromClubs,
        message:e instanceof Error?e.message:'Spiel nicht abrufbar'});}
    }
    if(!scoreGame||!matchSorareGame([scoreGame],target,hints))
      return done({status:'error',step:'game-identity',...diagnosed,photos:photosFromClubs,
        message:'Das Spiel kann nicht eindeutig bestätigt werden; keine fremden Spieler-Scores übernommen.'});
    const scores=parseSorareFootballScores(scoreGame.playerGameScores);
    const photos=parseSorareFootballPhotos([...rawPortraits,...(Array.isArray(scoreGame.players)?scoreGame.players:[])],scoreGame.playerGameScores);
    return done({status:'matched',...diagnosed,lookup,scores,photos,
      playerCount:Array.isArray(scoreGame.players)?scoreGame.players.length:0,
      updatedAt:new Date().toISOString(),
      message:`Sorare-Spiel verifiziert: ${scores.length} verfügbare offizielle Spielerwerte, ${photos.length} Spielerporträts.`});
  }catch(e){return done({status:'error',step:'unknown',message:e instanceof Error?e.message:'Sorare nicht erreichbar.'});}
}

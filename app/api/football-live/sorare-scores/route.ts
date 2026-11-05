import {NextRequest,NextResponse} from 'next/server';
import {isFootballLeagueKey,type FootballLeagueKey} from '@/lib/football-competitions';
import {footballLiveGame} from '@/lib/football-live-server';
import {matchSorareGame,parseSorareFootballScores,parseSorareFootballPhotos,sorareNameKey,type CandidateSorareGame} from '@/lib/football-live-sorare';
import {graphQl,sessionForRequest,setSessionCookie} from '@/lib/sorare-oauth-session';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
const noStore={'Cache-Control':'private, no-store'};
const response=(data:Record<string,unknown>)=>NextResponse.json({source:'Sorare',scores:[],photos:[],...data},{headers:noStore});

// The former myOngoingAndRecentGames/myLiveGames return games related to
// the signed-in manager, NOT all real-world matches. They cannot be the
// primary discovery source of a public match centre.
const competitionSlugs:Partial<Record<FootballLeagueKey,string>>={
  'uefa.europa':'uefa-europa-league',
  'uefa.champions':'uefa-champions-league',
  'ger.1':'bundesliga-de',
  // Add only Sorare-confirmed competition slugs. Unknown leagues use the
  // verified club route below rather than inventing a matching competition.
};
// Verified directly against public Sorare team URLs. Competition.teams
// supplies other teams dynamically so this is not tied to these clubs.
const verifiedClubSlugs:Record<string,string>={
  tsghoffenheim:'hoffenheim-sinsheim',
  hoffenheim:'hoffenheim-sinsheim',
  crystalpalace:'crystal-palace-london',
};
const gameFields='id date homeTeam { name slug } awayTeam { name slug }';
// Restore the globally scoped discovery query that found the match in V4.5.7.
// Sorare limits this endpoint to a maximum two-day date range.
const globalQuery=`query MatchCenterGlobalGames($from: ISO8601DateTime!, $to: ISO8601DateTime!) {
  competitionGames(fromDate: $from, toDate: $to, sport: FOOTBALL) {
    games { ${gameFields} }
  }
}`;
const playerFields='slug displayName avatarPictureUrl fullPictureUrl pictureUrl';
const scoreFields=`${gameFields}
  players { ${playerFields} }
  playerGameScores { score scoreStatus ... on PlayerGameScore { footballPlayer { ${playerFields} } } }`;
const competitionQuery=`query MatchCenterCompetition($slug: String!) {
  football { competition(slug: $slug) {
    name teams(first: 80) { nodes { name slug } }
    pastGames(last: 60) { nodes { ${gameFields} } }
    futureGames(first: 60) { nodes { ${gameFields} } }
  } }
}`;
const clubsQuery=`query MatchCenterClubs($slugs: [String!]!, $start: ISO8601DateTime!, $end: ISO8601DateTime!) {
  football { clubs(slugs: $slugs) {
    name slug
    activePlayers(first: 70) { nodes { ${playerFields} } }
    games(first: 30, startDate: $start, endDate: $end) { nodes { ${gameFields} } }
  } }
}`;
const recentQuery=`query MatchCenterMyGames {
  football { myOngoingAndRecentGames { ${gameFields} } myLiveGames { ${gameFields} } }
}`;
const nodeQuery=`query MatchCenterNode($id: ID!) { node(id: $id) { ... on Game { ${scoreFields} } } }`;
const legacyQuery=`query MatchCenterLegacyGame($id: ID!) { football { game(id: $id) { ${scoreFields} } } }`;
type ScoreGame=CandidateSorareGame&{players:unknown;playerGameScores:unknown};
type ClubRow={name:string;slug:string;activePlayers?:{nodes?:unknown[]};games?:{nodes?:CandidateSorareGame[]}};
type TeamWithSlug={name:string;slug?:string};
const rememberClub=(target:Map<string,string>,team:TeamWithSlug|null|undefined)=>{
  if(team&&typeof team.name==='string'&&typeof team.slug==='string'&&team.slug)target.set(sorareNameKey(team.name),team.slug);
};
const candidatesFrom=(x:unknown):CandidateSorareGame[]=>Array.isArray(x)?x.filter((v):v is CandidateSorareGame=>v&&typeof v==='object'&&typeof v.id==='string'&&typeof v.date==='string'):[];
const uniqueGames=(g:CandidateSorareGame[])=>Array.from(new Map(g.map(row=>[row.id,row])).values());
const photoRows=(rows:unknown[])=>parseSorareFootballPhotos(rows,[]);

export async function GET(req:NextRequest){
  const event=req.nextUrl.searchParams.get('event')??'',league=req.nextUrl.searchParams.get('league')??'';
  if(!/^\d{6,14}$/.test(event)||!isFootballLeagueKey(league))return NextResponse.json({error:'Ungültige Matchdaten.'},{status:400,headers:noStore});
  const user=await sessionForRequest(req);
  if(!user)return response({status:'not-connected',message:'Sorare-Verbindung erforderlich.'});
  const done=(data:Record<string,unknown>)=>{const res=response(data);if(user.changed)setSessionCookie(res,user.session);return res;};
  try{
    // ESPN is used exclusively to validate the identity of the selected game.
    const espn=await footballLiveGame(event,league);
    const when=Date.parse(espn.game.date);
    if(!Number.isFinite(when))return done({status:'error',step:'espn-date',message:'Ungültige ESPN-Anstoßzeit.'});
    const target={date:espn.game.date,home:espn.game.home.name,away:espn.game.away.name};
    const discovered:CandidateSorareGame[]=[];
    const rawPortraits:unknown[]=[];
    const foundClubs=new Map<string,string>();
    const discoverySources:string[]=[];
    const errors:string[]=[];
    // This globally scoped endpoint already discovered the user's live
    // Hoffenheim / Crystal Palace match in V4.5.7. The subsequent failure was
    // that the returned Game:UUID was passed to football.game(id:), not node(id:).
    try{
      const result=await graphQl(user.session.accessToken,globalQuery,{
        from:new Date(when-8*3600_000).toISOString(),
        to:new Date(when+8*3600_000).toISOString()
      });
      const groups=result.competitionGames as Array<{games?:CandidateSorareGame[]}>|undefined;
      const global=Array.isArray(groups)?groups.flatMap(group=>candidatesFrom(group?.games)):[];
      discovered.push(...global);
      for(const g of global){
        rememberClub(foundClubs,g.homeTeam as TeamWithSlug|null);
        rememberClub(foundClubs,g.awayTeam as TeamWithSlug|null);
      }
      discoverySources.push('global-competition-games');
    }catch(e){errors.push(`Globale Spiele: ${e instanceof Error?e.message:'nicht erreichbar'}`);}
    const competitionSlug=competitionSlugs[league];
    // Only use the less targeted competition pagination if the date-window
    // search has not already identified this very match.
    if(competitionSlug&&!matchSorareGame(uniqueGames(discovered),target)){
      try{
        const data=await graphQl(user.session.accessToken,competitionQuery,{slug:competitionSlug});
        const competition=(data.football as {competition?:{teams?:{nodes?:Array<{name:string;slug:string}>};pastGames?:{nodes?:CandidateSorareGame[]};futureGames?:{nodes?:CandidateSorareGame[]}}}|undefined)?.competition;
        if(competition){
          discovered.push(...candidatesFrom(competition.pastGames?.nodes),...candidatesFrom(competition.futureGames?.nodes));
          discoverySources.push('competition');
          for(const team of competition.teams?.nodes??[]){
            rememberClub(foundClubs,team);
          }
        }
      }catch(e){errors.push(`Wettbewerb: ${e instanceof Error?e.message:'nicht erreichbar'}`);}
    }
    const clubSlugs=new Set<string>();
    for(const name of [target.home,target.away]){
      const key=sorareNameKey(name);
      const slug=foundClubs.get(key)??verifiedClubSlugs[key];
      if(slug)clubSlugs.add(slug);
    }
    // Clubs are a second independent discovery route, including live games;
    // active player portraits can be loaded even if the selected fixture is
    // absent from Sorare. Never conflate photo availability with score coverage.
    if(clubSlugs.size){
      try{
        const data=await graphQl(user.session.accessToken,clubsQuery,{
          slugs:[...clubSlugs],start:new Date(when-12*3600_000).toISOString(),end:new Date(when+12*3600_000).toISOString()
        });
        const clubs=(data.football as {clubs?:ClubRow[]}|undefined)?.clubs??[];
        for(const club of clubs){
          if(!club||typeof club.slug!=='string')continue;
          if(![...clubSlugs].includes(club.slug))continue;
          discovered.push(...candidatesFrom(club.games?.nodes));
          rawPortraits.push(...(club.activePlayers?.nodes??[]));
        }
        discoverySources.push('club');
      }catch(e){errors.push(`Teams: ${e instanceof Error?e.message:'nicht erreichbar'}`);}
    }
    const photosFromClubs=photoRows(rawPortraits);
    // User-specific matches remain only a fallback for unsupported leagues.
    if(!discovered.length){
      try{
        const data=await graphQl(user.session.accessToken,recentQuery,{});
        const root=data.football as {myOngoingAndRecentGames?:CandidateSorareGame[];myLiveGames?:CandidateSorareGame[]}|undefined;
        discovered.push(...candidatesFrom(root?.myOngoingAndRecentGames),...candidatesFrom(root?.myLiveGames));
        discoverySources.push('user-fallback');
      }catch(e){errors.push(`Meine Spiele: ${e instanceof Error?e.message:'nicht erreichbar'}`);}
    }
    const unique=uniqueGames(discovered);
    const matched=matchSorareGame(unique,target);
    if(!matched){
      const details=errors.length?` Quellenhinweis: ${errors.join('; ').slice(0,300)}`:'';
      return done({status:errors.length&&!discoverySources.length?'error':'unmatched',step:'game-discovery',candidates:unique.length,
        discovery:discoverySources,photos:photosFromClubs,portraitCandidates:photosFromClubs.length,
        message:`Kein eindeutig passendes Sorare-Spiel (${unique.length} Kandidaten). ${photosFromClubs.length} Club-Porträts unabhängig geladen. Keine geschätzten Sorare-Scores.${details}`});
    }
    let resolvedBy='node';let scoreGame:ScoreGame|null=null;
    try{
      const data=await graphQl(user.session.accessToken,nodeQuery,{id:matched.id});
      const node=data.node as ScoreGame|null|undefined;
      if(node?.id===matched.id)scoreGame=node;
    }catch(e){
      return done({status:'error',step:'global-node',photos:photosFromClubs,
        message:`Sorare-Node-Abfrage: ${e instanceof Error?e.message:'Quelle nicht erreichbar'}`});
    }
    if(!scoreGame&&!matched.id.includes(':')){
      try{
        const data=await graphQl(user.session.accessToken,legacyQuery,{id:matched.id});
        const legacy=(data.football as {game?:ScoreGame}|undefined)?.game;
        if(legacy?.id===matched.id){scoreGame=legacy;resolvedBy='legacy';}
      }catch(e){return done({status:'error',step:'legacy-game',photos:photosFromClubs,message:e instanceof Error?e.message:'Spiel nicht abrufbar'});}
    }
    if(!scoreGame||!matchSorareGame([scoreGame],target))
      return done({status:'error',step:'game-identity',photos:photosFromClubs,message:'Sorare-Spiel konnte nicht eindeutig verifiziert werden. Keine fremden Scores zugeordnet.'});
    const scores=parseSorareFootballScores(scoreGame.playerGameScores);
    const combinedPhotos=parseSorareFootballPhotos([...rawPortraits,...(Array.isArray(scoreGame.players)?scoreGame.players:[])],scoreGame.playerGameScores);
    return done({status:'matched',scores,photos:combinedPhotos,lookup:resolvedBy,
      discovery:discoverySources,discoveredGames:unique.length,portraitCandidates:combinedPhotos.length,
      photoSource:rawPortraits.length?'club-and-game':'game',sourceWarnings:errors.map(x=>x.slice(0,240)),
      playerCount:Array.isArray(scoreGame.players)?scoreGame.players.length:0,
      updatedAt:new Date().toISOString(),message:`Sorare-Spiel bestätigt · ${scores.length} Spieler-Scores · ${combinedPhotos.length} verfügbare Sorare-Porträts.`});
  }catch(e){return done({status:'error',message:e instanceof Error?e.message:'Sorare-Live-Scores nicht erreichbar.'});}
}

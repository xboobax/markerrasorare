import {NextRequest,NextResponse} from 'next/server';
import {isFootballLeagueKey} from '@/lib/football-competitions';
import {footballLiveGame} from '@/lib/football-live-server';
import {matchSorareGame,parseSorareFootballScores,parseSorareFootballPhotos,type CandidateSorareGame} from '@/lib/football-live-sorare';
import {graphQl,sessionForRequest,setSessionCookie} from '@/lib/sorare-oauth-session';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
const noStore={'Cache-Control':'private, no-store'};
type CompetitionGameGroup={games?:CandidateSorareGame[]};
const discoveryQuery=`query MarkErrasFootballMatchCandidates($from: ISO8601DateTime!, $to: ISO8601DateTime!) {
  competitionGames(fromDate: $from, toDate: $to, sport: FOOTBALL) {
    games { id date homeTeam { name } awayTeam { name } }
  }
}`;
const recentQuery=`query MarkerrasRecentFootballGames {
  football { myOngoingAndRecentGames { id date homeTeam { name } awayTeam { name } } }
}`;
const scoreQuery=`query MarkerrasVerifiedFootballScores($id: ID!) {
  football {
    game(id: $id) {
      id date homeTeam { name } awayTeam { name }
      players { slug displayName pictureUrl(derivative: "avatar") }
      playerGameScores {
        score scoreStatus
        ... on PlayerGameScore { footballPlayer { slug displayName pictureUrl(derivative: "avatar") } }
      }
    }
  }
}`;
const response=(data:Record<string,unknown>)=>NextResponse.json({source:'Sorare',scores:[],photos:[],...data},{headers:noStore});

export async function GET(req:NextRequest){
  const event=req.nextUrl.searchParams.get('event')??'',league=req.nextUrl.searchParams.get('league')??'';
  if(!/^\d{6,14}$/.test(event)||!isFootballLeagueKey(league))return NextResponse.json({error:'Ungültige Matchdaten.'},{status:400,headers:noStore});
  const user=await sessionForRequest(req);
  if(!user)return response({status:'not-connected',message:'Sorare-Verbindung erforderlich.'});
  const done=(data:Record<string,unknown>)=>{const res=response(data);if(user.changed)setSessionCookie(res,user.session);return res;};
  try{
    // Never trust client-provided team names or try to reuse ESPN IDs as Sorare IDs.
    const espn=await footballLiveGame(event,league);
    const when=Date.parse(espn.game.date);
    if(!Number.isFinite(when))return done({status:'error',message:'Ungültige ESPN-Anstoßzeit.'});
    const from=new Date(when-8*3600_000).toISOString();
    const to=new Date(when+8*3600_000).toISOString();
    // Query.competitionGames is the official current schema field. The old
    // Query.so5Fixture was removed by Sorare and must not be queried.
    let candidates:CandidateSorareGame[]=[];
    let discoveryError:string|null=null;
    try{
      const discovery=await graphQl(user.session.accessToken,discoveryQuery,{from,to});
      candidates=((discovery.competitionGames as CompetitionGameGroup[]|undefined)??[]).flatMap(g=>g?.games??[]);
    }catch(e){discoveryError=e instanceof Error?e.message:'Sorare-Spielsuche fehlgeschlagen.';}
    // A missing competition feed should not prevent matching the manager's
    // games; this fallback uses a *separate* valid query, never one bad field.
    const target={date:espn.game.date,home:espn.game.home.name,away:espn.game.away.name};
    let unique=Array.from(new Map(candidates.filter(c=>c&&c.id).map(g=>[g.id,g])).values());
    let match=matchSorareGame(unique,target);
    // If the global competition feed omitted this game, check the manager's
    // own recent games as a second, narrow discovery source.
    if(!match){
      try{
        const recent=await graphQl(user.session.accessToken,recentQuery,{});
        const more=((recent.football as {myOngoingAndRecentGames?:CandidateSorareGame[]}|undefined)?.myOngoingAndRecentGames??[]);
        unique=Array.from(new Map([...unique,...more].filter(c=>c&&c.id).map(g=>[g.id,g])).values());
        match=matchSorareGame(unique,target);
      }catch(e){if(!discoveryError)discoveryError=e instanceof Error?e.message:'Sorare-Spiele nicht abrufbar.';}
    }
    if(!match)return done({status:discoveryError&&unique.length===0?'error':'unmatched',message:discoveryError&&unique.length===0?`Sorare-Spielsuche: ${discoveryError}`:'Kein eindeutig passendes Sorare-Spiel gefunden. Keine geschätzten Live-Scores.'});
    // Nested score and picture arrays are read from a SINGLE verified Sorare game.
    const data=await graphQl(user.session.accessToken,scoreQuery,{id:match.id});
    const scoreGame=(data.football as {game?:{id:string;date:string;homeTeam:{name:string};awayTeam:{name:string};playerGameScores:unknown;players:unknown}}|undefined)?.game;
    if(!scoreGame||scoreGame.id!==match.id||!matchSorareGame([scoreGame],target))
      return done({status:'error',message:'Sorare-Spieldaten konnten nicht eindeutig bestätigt werden.'});
    const scores=parseSorareFootballScores(scoreGame.playerGameScores);
    const photos=parseSorareFootballPhotos(scoreGame.players,scoreGame.playerGameScores);
    return done({status:'matched',scores,photos,updatedAt:new Date().toISOString(),message:scores.length?`Offizielle Sorare-Werte für ${scores.length} Spieler geladen.`:`Spiel zugeordnet; Sorare meldet noch keine Spielerwerte. ${photos.length} Spielerfotos verfügbar.`});
  }catch(e){return done({status:'error',message:e instanceof Error?e.message:'Sorare-Live-Scores nicht erreichbar.'});}
}

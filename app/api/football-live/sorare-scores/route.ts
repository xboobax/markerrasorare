import {NextRequest,NextResponse} from 'next/server';
import {isFootballLeagueKey} from '@/lib/football-competitions';
import {footballLiveGame} from '@/lib/football-live-server';
import {matchSorareGame,parseSorareFootballScores,parseSorareFootballPhotos,type CandidateSorareGame} from '@/lib/football-live-sorare';
import {graphQl,sessionForRequest,setSessionCookie} from '@/lib/sorare-oauth-session';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
const noStore={'Cache-Control':'private, no-store'};
const recentQuery=`query MarkerrasRecentFootballGames {
  football {
    myOngoingAndRecentGames { id date homeTeam { name } awayTeam { name } }
    myLiveGames { id date homeTeam { name } awayTeam { name } }
  }
}`;
// Game.id is a GLOBAL Node ID, e.g. "Game:...". Never pass it to
// football.game(id:) which expects an internal legacy identifier and fails.
const playerFields='slug displayName avatarPictureUrl fullPictureUrl pictureUrl';
const scoreFields=`id date homeTeam { name } awayTeam { name }
    players { ${playerFields} }
    playerGameScores {
      score scoreStatus
      ... on PlayerGameScore { footballPlayer { ${playerFields} } }
    }`;
const nodeScoreQuery=`query MarkErrasFootballNodeScores($id: ID!) {
  node(id: $id) {
    ... on Game { ${scoreFields} }
  }
}`;
// A second form is used ONLY when Sorare returned a raw UUID, never a
// namespaced "Game:" ID. The match is re-verified before data is released.
const legacyScoreQuery=`query MarkErrasFootballLegacyScores($id: ID!) {
  football { game(id: $id) { ${scoreFields} } }
}`;
type SorareScoreGame=CandidateSorareGame & {players:unknown;playerGameScores:unknown};
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
    const target={date:espn.game.date,home:espn.game.home.name,away:espn.game.away.name};
    // Discover only through schema-confirmed football root fields.
    // Query.competitionGames(sport:...) never existed in this schema.
    let candidates:CandidateSorareGame[]=[];
    try{
      const discovery=await graphQl(user.session.accessToken,recentQuery,{});
      const f=discovery.football as {myOngoingAndRecentGames?:CandidateSorareGame[];myLiveGames?:CandidateSorareGame[]}|undefined;
      candidates=[...(f?.myOngoingAndRecentGames??[]),...(f?.myLiveGames??[])];
    }catch(e){return done({status:'error',step:'game-discovery',message:`Sorare-Spielsuche: ${e instanceof Error?e.message:'Quelle nicht erreichbar.'}`});}
    const unique=Array.from(new Map(candidates.filter(c=>c&&typeof c.id==='string').map(g=>[g.id,g])).values());
    const match=matchSorareGame(unique,target);
    if(!match)return done({status:'unmatched',step:'game-discovery',candidates:unique.length,message:`Kein eindeutig passendes Sorare-Spiel (${unique.length} Kandidaten). Keine geschätzten Scores.`});
    // Global Node lookup is the official schema-consistent resolver for
    // "Game:UUID" IDs. The former football.game(id: "Game:UUID") fails.
    let scoreGame:SorareScoreGame|null=null;
    let resolvedBy='node';
    try{
      const data=await graphQl(user.session.accessToken,nodeScoreQuery,{id:match.id});
      const node=data.node as SorareScoreGame|null|undefined;
      if(node?.id===match.id)scoreGame=node;
    }catch(e){
      return done({status:'error',step:'global-node',message:`Sorare-Node-Abfrage: ${e instanceof Error?e.message:'nicht erreichbar'}`});
    }
    // Only plain IDs can be passed to the non-null legacy resolver. Never
    // retry globally namespaced IDs with football.game(), as before.
    if(!scoreGame&&!match.id.includes(':')){
      try{
        const fallback=await graphQl(user.session.accessToken,legacyScoreQuery,{id:match.id});
        const legacy=(fallback.football as {game?:SorareScoreGame}|undefined)?.game;
        if(legacy?.id===match.id){scoreGame=legacy;resolvedBy='legacy';}
      }catch(e){return done({status:'error',step:'legacy-game',message:e instanceof Error?e.message:'Spiel nicht abrufbar'});}
    }
    if(!scoreGame||!matchSorareGame([scoreGame],target))
      return done({status:'error',step:'game-identity',message:'Sorare-Node konnte nicht verifiziert werden. Keine fremden Scores zugeordnet.'});
    const scores=parseSorareFootballScores(scoreGame.playerGameScores);
    const photos=parseSorareFootballPhotos(scoreGame.players,scoreGame.playerGameScores);
    return done({status:'matched',scores,photos,lookup:resolvedBy,playerCount:Array.isArray(scoreGame.players)?scoreGame.players.length:0,updatedAt:new Date().toISOString(),message:`Sorare-Spiel bestätigt · ${scores.length} Spieler-Scores · ${photos.length} Spielerporträts über Sorare.`});
  }catch(e){return done({status:'error',message:e instanceof Error?e.message:'Sorare-Live-Scores nicht erreichbar.'});}
}

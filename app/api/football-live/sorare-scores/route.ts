import {NextRequest,NextResponse} from 'next/server';
import {isFootballLeagueKey} from '@/lib/football-competitions';
import {footballLiveGame} from '@/lib/football-live-server';
import {matchSorareGame,parseSorareFootballScores,type CandidateSorareGame} from '@/lib/football-live-sorare';
import {graphQl,sessionForRequest,setSessionCookie} from '@/lib/sorare-oauth-session';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
export async function GET(req:NextRequest){
  const event=req.nextUrl.searchParams.get('event')??'',league=req.nextUrl.searchParams.get('league')??'';
  if(!/^\d{6,14}$/.test(event)||!isFootballLeagueKey(league))return NextResponse.json({error:'Ungültige Matchdaten.'},{status:400});
  const user=await sessionForRequest(req);
  if(!user)return NextResponse.json({source:'Sorare',status:'not-connected',scores:[],message:'Sorare-Verbindung erforderlich.'},{headers:{'Cache-Control':'no-store'}});
  try{
    // The ESPN game is fetched on the server, so clients cannot impersonate a
    // match by passing club names and receiving another game\'s Sorare scores.
    const espn=await footballLiveGame(event,league);
    const from=new Date(Date.parse(espn.game.date)-12*3600_000).toISOString();
    const to=new Date(Date.parse(espn.game.date)+12*3600_000).toISOString();
    // A bounded classic fixture returns games across all clubs, not only the
    // user's cards. myOngoingAndRecentGames covers occasional fixture gaps.
    const meta=await graphQl(user.session.accessToken,`query MarkerrasOfficialLiveGames($from: ISO8601DateTime!, $to: ISO8601DateTime!) {
      so5Fixture(sport: FOOTBALL) { games(fromDate: $from, toDate: $to) { id date homeTeam { name } awayTeam { name } } }
      football { myOngoingAndRecentGames { id date homeTeam { name } awayTeam { name } } }
    }`,{from,to});
    const football=meta.football as {myOngoingAndRecentGames?:CandidateSorareGame[]}|undefined;
    const fixture=meta.so5Fixture as {games?:CandidateSorareGame[]}|null;
    const candidates=[...(fixture?.games??[]),...(football?.myOngoingAndRecentGames??[])];
    const unique=Array.from(new Map(candidates.map(g=>[g.id,g])).values());
    const match=matchSorareGame(unique,{date:espn.game.date,home:espn.game.home.name,away:espn.game.away.name});
    if(!match){
      const res=NextResponse.json({source:'Sorare',status:'unmatched',scores:[],message:'Kein eindeutig passendes Sorare-Spiel im aktuellen Classic-Spieltag gefunden.'},{headers:{'Cache-Control':'no-store'}});
      if(user.changed)setSessionCookie(res,user.session);return res;
    }
    // The nested scores field is only permitted on a single Game, not a list.
    const data=await graphQl(user.session.accessToken,`query MarkerrasOfficialFootballScores($id: ID!) { football { game(id: $id) { id date homeTeam { name } awayTeam { name } playerGameScores { score scoreStatus ... on PlayerGameScore { footballPlayer { slug displayName } } } } } }`,{id:match.id});
    const scoreGame=(data.football as {game?:{id:string;date:string;homeTeam:{name:string};awayTeam:{name:string};playerGameScores:unknown}}|undefined)?.game;
    if(!scoreGame||!matchSorareGame([scoreGame],{date:espn.game.date,home:espn.game.home.name,away:espn.game.away.name}))throw new Error('Sorare-Spieldaten konnten nicht eindeutig bestätigt werden.');
    const scores=parseSorareFootballScores(scoreGame.playerGameScores);
    const res=NextResponse.json({source:'Sorare',status:'matched',scores,updatedAt:new Date().toISOString(),message:scores.length?'Offizielle Sorare-Spielerwerte; Status kann sich während des Spiels ändern.':'Sorare hat noch keine Spielerwerte bereitgestellt.'},{headers:{'Cache-Control':'no-store'}});
    if(user.changed)setSessionCookie(res,user.session);return res;
  }catch(e){return NextResponse.json({source:'Sorare',status:'error',scores:[],message:e instanceof Error?e.message:'Sorare-Live-Scores nicht erreichbar.'},{headers:{'Cache-Control':'no-store'}});}
}

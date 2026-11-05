import {NextRequest,NextResponse} from 'next/server';
import {footballLiveGame} from '@/lib/football-live-server';
import {isFootballLeagueKey} from '@/lib/football-competitions';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=15;
export async function GET(req:NextRequest){
  const id=req.nextUrl.searchParams.get('event')??'';const league=req.nextUrl.searchParams.get('league')??'';
  if(!/^\d{6,14}$/.test(id))return NextResponse.json({error:'Ungültige ESPN-Spiel-ID.'},{status:400});
  if(!isFootballLeagueKey(league))return NextResponse.json({error:'Ungültige Liga.'},{status:400});
  try{return NextResponse.json(await footballLiveGame(id,league),{headers:{'Cache-Control':'public, s-maxage=15, stale-while-revalidate=15'}})}
  catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Live-Spieldetails derzeit nicht verfügbar.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}

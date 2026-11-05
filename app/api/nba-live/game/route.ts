import {NextRequest,NextResponse} from 'next/server';
import {nbaLiveGame} from '@/lib/nba-live-server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=15;
export async function GET(req:NextRequest){
  const id=req.nextUrl.searchParams.get('event')??'';
  if(!/^\d{6,14}$/.test(id))return NextResponse.json({error:'Ungültige ESPN-Spiel-ID.'},{status:400});
  try{return NextResponse.json(await nbaLiveGame(id),{headers:{'Cache-Control':'public, s-maxage=15, stale-while-revalidate=15'}})}
  catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Live-Spieldetails derzeit nicht verfügbar.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}

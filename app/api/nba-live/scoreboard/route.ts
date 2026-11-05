import {NextRequest,NextResponse} from 'next/server';
import {nbaLiveScoreboard} from '@/lib/nba-live-server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=15;
const berlinToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export async function GET(req:NextRequest){
  const day=req.nextUrl.searchParams.get('date')||berlinToday();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(`${day}T12:00:00Z`)))
    return NextResponse.json({error:'Ungültiges Datum.'},{status:400});
  const delta=Math.abs(Date.parse(`${day}T12:00:00Z`)-Date.now());
  if(delta>1000*60*60*24*45)return NextResponse.json({error:'Zeitraum auf ±45 Tage begrenzt.'},{status:400});
  try{return NextResponse.json(await nbaLiveScoreboard(day),{headers:{'Cache-Control':'public, s-maxage=20, stale-while-revalidate=20'}})}
  catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Live-Scoreboard nicht erreichbar.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}

import {NextRequest,NextResponse} from 'next/server';
import {getFootballClubs,getPlayers} from '@/lib/sorare';
import {forecast} from '@/lib/model';
import {enrichForecast} from '@/lib/matchups';
import {buildPredictionV3,withV44Calibration} from '@/lib/prediction-engine-v3';
import {v44DbConfigured,v44ReadModel} from '@/lib/learning-v44-db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=45;
const normalize=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(fc|cf|ac|as|sc|afc|club|de|la|le)\b/g,' ').replace(/[^a-z0-9]/g,'');
const matchClub=(clubs:Awaited<ReturnType<typeof getFootballClubs>>,name:string)=>{
  const key=normalize(name);const exact=clubs.find(c=>normalize(c.name)===key);if(exact)return exact;
  const byIncludes=clubs.filter(c=>{const n=normalize(c.name);return n.includes(key)||key.includes(n);});
  return byIncludes.length===1?byIncludes[0]:null;
};
export async function GET(req:NextRequest){
  const a=req.nextUrl.searchParams.get('away')??'',b=req.nextUrl.searchParams.get('home')??'';if(a.length>90||b.length>90)return NextResponse.json({error:'Ungültiger Teamname.'},{status:400});
  if(!a||!b||a===b)return NextResponse.json({error:'Nur zwei verschiedene Teams erlaubt.'},{status:400});
  try{
    const clubs=await getFootballClubs();const away=matchClub(clubs,a),home=matchClub(clubs,b);if(!away||!home||away.slug===home.slug)throw new Error('Teams bei Sorare derzeit nicht eindeutig auffindbar.');
    const raw=await getPlayers('football',[away,home]);if(raw.failed||!raw.players.length)throw new Error('Sorare hat keine vollständigen Prognosedaten der beiden Teams geliefert.');
    const calibration=v44DbConfigured()?await v44ReadModel('football').catch(()=>null):null;
    const items=raw.players.map(p=>{const f=forecast(p),scouted=enrichForecast(f,'football',{}),v3=withV44Calibration(buildPredictionV3(scouted,'football'),calibration);return {name:f.name,id:f.id,team:f.team,pp:v3.ppRaw,q80:v3.q80Raw,quality:v3.quality};});
    return NextResponse.json({players:items,calibrationVersion:calibration?.version??null,source:'Prediction Engine 3.0 · aktueller Sorare-Abruf',fetchedAt:new Date().toISOString(),warning:'Aktueller Modellabruf, keine vor Spielbeginn eingefrorene PP-Prognose. Nicht für rückwirkendes Prognose-Backtesting verwenden.'},{headers:{'Cache-Control':'public, s-maxage=180, stale-while-revalidate=60'}});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Sorare-Modellprognosen derzeit nicht abrufbar.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}

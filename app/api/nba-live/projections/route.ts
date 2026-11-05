import {NextRequest,NextResponse} from 'next/server';
import {canonicalNbaTeam} from '@/lib/nba-fixture-mapping';
import {getRegularNbaTeams} from '@/lib/regular-nba';
import {getPlayers} from '@/lib/sorare';
import {forecast} from '@/lib/model';
import {enrichForecast} from '@/lib/matchups';
import {buildPredictionV3,withV44Calibration} from '@/lib/prediction-engine-v3';
import {v44DbConfigured,v44ReadModel} from '@/lib/learning-v44-db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=45;
/** Optional, on-click ONLY. Do not load all 30 NBA rosters on each Live refresh. */
export async function GET(req:NextRequest){
  const a=req.nextUrl.searchParams.get('away')??'',b=req.nextUrl.searchParams.get('home')??'';
  if(a.length>90||b.length>90)return NextResponse.json({error:'Ungültiger Teamname.'},{status:400});
  const away=canonicalNbaTeam(a),home=canonicalNbaTeam(b);
  if(!away||!home||away===home)return NextResponse.json({error:'Nur zwei verschiedene reguläre NBA-Franchises erlaubt.'},{status:400});
  try{
    const clubs=await getRegularNbaTeams();
    const subset=clubs.filter(c=>c.name===away||c.name===home);
    if(subset.length!==2)throw new Error('Teams bei Sorare derzeit nicht vollständig auffindbar.');
    const raw=await getPlayers('nba',subset);
    if(raw.failed||!raw.players.length)throw new Error('Sorare hat keine vollständigen Prognosedaten der beiden Teams geliefert.');
    const calibration=v44DbConfigured()?await v44ReadModel('nba').catch(()=>null):null;
    const items=raw.players.map(p=>{
      const f=forecast(p),scouted=enrichForecast(f,'nba',{}),v3=withV44Calibration(buildPredictionV3(scouted,'nba'),calibration);
      return {name:f.name,id:f.id,team:f.team,pp:v3.ppRaw,q80:v3.q80Raw,quality:v3.quality};
    });
    return NextResponse.json({players:items,calibrationVersion:calibration?.version??null,source:'Prediction Engine 3.0 · aktueller Sorare-Abruf',fetchedAt:new Date().toISOString(),
      warning:'Aktueller Modellabruf, keine vor Spielbeginn eingefrorene PP-Prognose. Nicht für rückwirkendes Prognose-Backtesting verwenden.'},{headers:{'Cache-Control':'public, s-maxage=180, stale-while-revalidate=60'}});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Sorare-Modellprognosen derzeit nicht abrufbar.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}

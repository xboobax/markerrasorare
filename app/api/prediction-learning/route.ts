import {cloudConfigured,readCloudArchive,readJobStatus} from '@/lib/learning-cloud';
import {learningSummary} from '@/lib/learning-metrics';
import {CAPTURE_SCOPES} from '@/lib/learning-pipeline';
import type {Sport} from '@/lib/model';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:Request){
  const sport:Sport=new URL(req.url).searchParams.get('sport')==='nba'?'nba':'football';
  if(!cloudConfigured())return Response.json({configured:false,cronConfigured:Boolean(process.env.CRON_SECRET && process.env.CRON_SECRET.length>=16),ready:false,summary:null,statuses:[],message:'Cloud-Archiv noch nicht eingerichtet. Upstash und CRON_SECRET in Vercel konfigurieren.'},
    {headers:{'Cache-Control':'no-store'}});
  try{
    const scopes=[...CAPTURE_SCOPES.filter(s=>s.startsWith(sport==='nba'?'nba':'football')).map(s=>`capture:${s}`),
      ...[0,1,2].map(shard=>`results:${sport}-${shard}`)];
    const [rows,statuses]=await Promise.all([readCloudArchive(sport,10000),readJobStatus(scopes)]);
    return Response.json({configured:true,cronConfigured:Boolean(process.env.CRON_SECRET && process.env.CRON_SECRET.length>=16),ready:statuses.some(s=>s.scope.startsWith('capture:')&&s.ok&&Date.parse(s.at)>Date.now()-48*3600000),
      summary:learningSummary(rows,sport),statuses,limit:10000,message:rows.length?'Nur echte Vor-Spiel-Prognosen mit späteren Sorare-FINAL-Scores.':'Noch keine automatisch gespeicherten Prognosen.'},
      {headers:{'Cache-Control':'public, max-age=0, s-maxage=120, stale-while-revalidate=60'}});
  }catch{return Response.json({configured:true,cronConfigured:Boolean(process.env.CRON_SECRET && process.env.CRON_SECRET.length>=16),ready:false,summary:null,statuses:[],message:'Cloud-Archiv derzeit nicht erreichbar.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}

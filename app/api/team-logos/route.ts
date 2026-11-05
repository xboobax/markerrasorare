import {gql,safeImageUrl} from '@/lib/sorare';
/** Public, best-effort Sorare club crests; never required for the core roster
 * or an authenticated collection sync. Failure means text-only opponents. */
export const runtime='nodejs';
const HEADERS={'Cache-Control':'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'};
export async function GET(request:Request):Promise<Response>{
  const sport=new URL(request.url).searchParams.get('sport');
  if(sport!=='nba'&&sport!=='football')return Response.json({error:'Sportart ungültig'},{status:400});
  try{
    const data=sport==='nba'
      ?await gql('{ teams(first: 50, sport: NBA) { nodes { name pictureUrl } } }',3600)
      :await gql('{ football { clubsReady { name pictureUrl } } }',3600);
    const nodes=sport==='nba'?data.teams?.nodes:data.football?.clubsReady;
    const logos=Array.isArray(nodes)?nodes.reduce((a:Record<string,string>,row:unknown)=>{
      const item=row&&typeof row==='object'?row as Record<string,unknown>:null;
      const name=item?.name,logo=safeImageUrl(item?.pictureUrl);
      if(typeof name==='string'&&name.length<150&&logo)a[name]=logo;
      return a;
    },{}):{};
    return Response.json({logos},{headers:HEADERS});
  }catch{
    // Schema differences or provider downtime never block the Builder.
    return Response.json({logos:{},note:'Sorare liefert derzeit keine Teamlogos für diese Abfrage.'},{headers:{'Cache-Control':'private, max-age=60'}});
  }
}

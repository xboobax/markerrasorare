/** V4.5.3: Deterministic, bounded daily rotation across unresolved player pages.
 * Prevents the first unscored players from permanently blocking later snapshots.
 * No score inference, no additional external requests, no automatic training.
 */
export function v453ChoosePage<T>(items:readonly T[],now=new Date(),pageSize=24):{
  selected:T[];page:number;pages:number;total:number
}{
  const size=Math.max(1,Math.min(24,Math.floor(pageSize)||24));
  const total=items.length;
  const pages=Math.max(1,Math.ceil(total/size));
  const day=Math.floor(now.getTime()/86400000);
  const page=((day%pages)+pages)%pages;
  return {selected:items.slice(page*size,(page+1)*size),page,pages,total};
}

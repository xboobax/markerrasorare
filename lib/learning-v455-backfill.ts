/** Pure helpers for bounded V4.5.5 football FINAL backfill. */
const localDay=(date:Date)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const dayShift=(date:string,n:number)=>new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
/**
 * Automatic idempotent catch-up for UEFA club competitions, without adding
 * cron schedules or opening a public mutation endpoint. Five Berlin calendar
 * days (today + four previous days) cover the previous European matchday.
 * Domestic/international batches retain their small two-day request budget.
 */
export function v455FootballStatsDays(batch:string,now:Date):string[]{
  const today=localDay(now),lookback=batch==='europe'?4:1;
  return Array.from({length:lookback+1},(_,i)=>dayShift(today,-i));
}
export type V455FootballPendingGame={id:string;leagueKey:string;date:string};
/** Prefer unarchived games, oldest first, without duplicating saved FINAL rows. */
export function v455SelectPendingGames<T extends V455FootballPendingGame>(
  games:readonly T[],archivedKeys:ReadonlySet<string>,limit=12):T[]{
  return games.filter(g=>!archivedKeys.has(`${g.leagueKey}:${g.id}`))
    .sort((a,b)=>a.date.localeCompare(b.date)||a.leagueKey.localeCompare(b.leagueKey)||a.id.localeCompare(b.id))
    .slice(0,limit);
}

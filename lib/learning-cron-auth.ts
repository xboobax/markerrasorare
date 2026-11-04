/** Vercel adds `Authorization: Bearer <CRON_SECRET>` to scheduled requests. */
export function cronAuthorized(header:string|null,secret:string|undefined):boolean {
  if(!secret||secret.length<16||!header?.startsWith('Bearer '))return false;
  const supplied=header.slice(7);
  if(supplied.length!==secret.length)return false;
  // Constant-work comparison without requiring node:crypto for unit tests.
  let diff=0;
  for(let i=0;i<secret.length;i++)diff|=secret.charCodeAt(i)^supplied.charCodeAt(i);
  return diff===0;
}

import type {Sport} from "./model";
/** Only actual Sorare GraphQL slugs, never a URL guessed from a display name. */
export function sorarePlayerUrl(sport:Sport,slug:unknown):string|null{
  if(typeof slug!=="string"||slug.length<3||slug.length>200||!/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(slug))return null;
  return `https://sorare.com/${sport}/players/${encodeURIComponent(slug)}`;
}

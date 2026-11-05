/** Fixed safe sport filters for read-only summary queries.
 * Parameterized writes remain unchanged. No user-provided SQL identifiers. */
import type {Sport} from './model';
export function v452SportSql(sport:Sport):"'nba'"|"'football'" {
  if(sport==='nba')return "'nba'";
  if(sport==='football')return "'football'";
  throw new Error('Unbekannte Sportart');
}
export function v452JobLikeSql(sport:Sport):"'%nba%'"|"'%football%'" {
  return sport==='nba'?"'%nba%'":sport==='football'?"'%football%'":(()=>{throw Error('Unbekannte Sportart')})();
}

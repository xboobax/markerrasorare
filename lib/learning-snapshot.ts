/** V3.4: Pre-game, public-data-only snapshots for the cloud learning archive.
 * No logged-in collection, manual minutes, manual opponent ratings, or card bonuses
 * are used. Date-only fixtures must be at least tomorrow UTC; for same-day NBA
 * fixtures we require an explicit, verified future tipoff timestamp.
 */
import type {Forecast,Sport} from './model';
import {createTrackedPrediction,type TrackedPrediction} from './tracking';
import {enrichForecast} from './matchups';
import {buildForecastV18} from './forecast-v18';
import {buildPredictionV2} from './prediction-engine-v2';
import {fixtureDay} from './tracking-auto';
import type {OpponentRatings} from './matchups';

export function safeBeforeFixture(p:Forecast,sport:Sport,now=new Date()):boolean {
  const day=fixtureDay(p.nextGame),today=now.toISOString().slice(0,10);
  if(!day||day<today||p.hasGame===false||p.playProb<=0||p.forecastSources.length===0)return false;
  const tipoff=p.nextGameTipoff;
  if(typeof tipoff==='string'&&Number.isFinite(Date.parse(tipoff))){
    const fixtureMidnight=Date.parse(`${day}T00:00:00Z`);
    if(Math.abs(Date.parse(tipoff)-fixtureMidnight)>36*3600000 || Date.parse(tipoff)<=now.getTime()+30*60000)return false;
  }
  if(day>today)return true;
  if(sport!=='nba'||typeof tipoff!=='string'||!Number.isFinite(Date.parse(tipoff)))return false;
  return Date.parse(tipoff)>now.getTime()+30*60000;
}
export function freezeCloudPredictions(players:Forecast[],sport:Sport,ratings:OpponentRatings,now=new Date(),limit=150):TrackedPrediction[] {
  const unique=new Set<string>();
  return players.filter(p=>safeBeforeFixture(p,sport,now) && p.expected>0)
    .sort((a,b)=>b.weighted-a.weighted)
    .filter(p=>{if(unique.has(p.id))return false;unique.add(p.id);return true;})
    .slice(0,Math.max(0,Math.min(250,limit))).map(p=>{
      const scouted=enrichForecast(p,sport,ratings);
      const v18=buildForecastV18(scouted,sport);
      const v2=buildPredictionV2(scouted,sport);
      return createTrackedPrediction(scouted,sport,now,{
        baselinePredicted:v18.baselineWeighted,advancedPredicted:v18.advancedWeighted,
        intervalP10:v18.unconditionalP10,intervalP90:v18.unconditionalP90,
        modelVersion:'1.8.0',selectedMode:'v2',
        engineV2Predicted:v2.weighted,engineV2P10:v2.unconditionalP10,engineV2P90:v2.unconditionalP90,
      });
    });
}

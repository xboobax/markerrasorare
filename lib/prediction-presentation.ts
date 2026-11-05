/** Single source of truth for visible conditional PP/Q80 (NOT lineup risk score).
 * The sum of individual 80th percentiles is NOT the 80th percentile of the
 * lineup total; therefore we explicitly label it Σ Q80. */
import type {Forecast} from './model';
import type {PredictionV3} from './prediction-engine-v3';

type V3Player=Forecast&{modelV3Active?:boolean;modelV3?:PredictionV3};
export type ConditionalScore={pp:number;q80:number;q20:number;playProbability:number};
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
/** bonusPercent is the selected card's effective bonus. Captain +50 is
 * deliberately included in the LINEUP pick bonus, never guessed here. */
export function conditionalCardScore(player:Forecast,bonusPercent:unknown):ConditionalScore|null{
  const v=player as V3Player;
  if(!v.modelV3Active||!v.modelV3?.applicable)return null;
  const p=v.modelV3;
  if(!finite(p.ppRaw)||!finite(p.q80Raw)||!finite(p.q20Raw))return null;
  const bonus=finite(bonusPercent)?Math.max(0,Math.min(100,bonusPercent)):0;
  const factor=1+bonus/100;
  return {pp:p.ppRaw*factor,q80:p.q80Raw*factor,q20:p.q20Raw*factor,playProbability:p.playProbability};
}
export function sumConditionalScores(picks:readonly {player:Forecast;bonusPercent:number}[]):{pp:number;q80:number;q20:number;known:number}|null{
  if(!picks.length)return null;
  let pp=0,q80=0,q20=0,known=0;
  for(const pick of picks){
    const s=conditionalCardScore(pick.player,pick.bonusPercent);
    if(!s)continue;
    known++;pp+=s.pp;q80+=s.q80;q20+=s.q20;
  }
  return known?{pp,q80,q20,known}:null;
}

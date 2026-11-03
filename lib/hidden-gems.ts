import {isValidNbaStars} from "./arcade";
import type {Forecast,Sport} from "./model";

export type GemCardSettings={owned?:boolean;stars?:number|null;bonusPercent?:number};
export type HiddenGem={player:Forecast;rank:number;value:number;metric:string;reasons:string[];stars:number|null;owned:boolean};
export type GemResult={gems:HiddenGem[];eligible:number;missingStars:number;excludedWeakData:number};
const validScore=(p:Forecast)=>p.forecastSources.length>0 && p.confidence!=="gering" &&
  (p.proj!==null || p.avg!==null || p.last5Avg!==null || p.last10Avg!==null || p.sampleSize>=3);

/** Heuristic discovery, not market value, card price or verified Sorare eligibility. */
export function findHiddenGems(players:Forecast[],sport:Sport,settings:Record<string,GemCardSettings>,options:{ownedOnly?:boolean;position?:string;limit?:number}={}):GemResult {
  const results:HiddenGem[]=[];
  let missingStars=0,excludedWeakData=0,eligible=0;
  for(const p of players){
    if(options.ownedOnly && !settings[p.id]?.owned)continue;
    if(options.position && options.position!=="all" && options.position!==p.position)continue;
    if(p.hasGame===false || p.playProb<0.55 || !(p.weighted>0) || !validScore(p)){
      excludedWeakData++;continue;
    }
    const stars=settings[p.id]?.stars;
    if(sport==="nba" && !isValidNbaStars(stars)){
      missingStars++;continue;
    }
    eligible++;
    const reasons:string[]=[];
    let value:number;
    let metric:string;
    if(sport==="nba"){
      const validStars=stars as number;
      value=p.weighted/validStars;
      metric=`${value.toFixed(1)} Pkt. pro ★`;
      reasons.push(`${validStars.toFixed(1)} ★ manuell erfasst · ${p.weighted.toFixed(1)} erwartete Pkt.`);
      if(p.formDirection==="steigend")reasons.push("Formtrend steigend (historische Scores)");
      if(p.confidence==="hoch")reasons.push("Vergleichsweise gute Datenabdeckung");
    }else{
      const last5=p.last5Avg;
      const last10=p.last10Avg;
      const uplift=typeof last5==="number" && typeof last10==="number" && last10>0 ? Math.max(-40,Math.min(40,((last5/last10)-1)*100)):null;
      // A simple form-and-stability discovery index: deliberately NOT a Sorare score.
      const trendBonus=uplift===null?0:Math.max(-0.1,Math.min(0.12,uplift/250));
      const stability=1-Math.min(0.15,p.variability/Math.max(p.expected,1)*0.2);
      value=p.weighted*(1+trendBonus)*stability;
      metric=`${value.toFixed(1)} Analyse-Index`;
      reasons.push(`${p.weighted.toFixed(1)} erwartete Pkt. inklusive Einsatzrisiko`);
      if(uplift!==null && uplift>5)reasons.push(`L5 liegt ${uplift.toFixed(0)} % über L10`);
      else if(p.formDirection==="steigend")reasons.push("Historischer Formtrend steigend");
      if(p.confidence==="hoch")reasons.push("Vergleichsweise gute Datenabdeckung");
    }
    results.push({player:p,rank:0,value,metric,reasons,stars:sport==="nba"?stars as number:null,owned:settings[p.id]?.owned===true});
  }
  results.sort((a,b)=>b.value-a.value || b.player.weighted-a.player.weighted || a.player.name.localeCompare(b.player.name,"de"));
  const limit=Math.max(1,Math.min(30,options.limit??8));
  return {gems:results.slice(0,limit).map((p,i)=>({...p,rank:i+1})),eligible,missingStars,excludedWeakData};
}

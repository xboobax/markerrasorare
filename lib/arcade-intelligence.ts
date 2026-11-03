import {candidateIsEligible,optimizeArcadeLineups,type CardInput,type OptimizeOptions,type OptimizedLineup,type Strategy} from "./arcade";

/** Read-only, explainable comparison of the existing verified arcade constraints.
 * Probabilities and risk metrics remain uncalibrated heuristics, not Sorare odds.
 */
export type IntelligenceStyle="safe"|"balanced"|"upside"|"target";
export type IntelligenceVariant={
  key:string;
  style:IntelligenceStyle;
  label:string;
  subtitle:string;
  lineup:OptimizedLineup;
  riskIndex:number;
  riskLabel:"Niedriger"|"Mittel"|"Erhöht";
  atRisk:number;
  teamPairs:number;
  lowData:number;
  targetGap:number|null;
  sharedWithBaseline:number;
};
export type IntelligenceBoard={
  variants:IntelligenceVariant[];
  recommendedKey:string|null;
  possibleCount:number;
  target:number|null;
  availablePlayers:number;
  note:string;
};

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export const lineupKey=(lineup:OptimizedLineup):string=>lineup.picks.map(p=>p.player.id).sort().join("|");

export function profileLineup(lineup:OptimizedLineup){
  const picks=lineup.picks;
  const atRisk=picks.filter(p=>p.player.playProb<.65||p.player.hasGame===false||p.player.injuries>0).length;
  const lowData=picks.filter(p=>p.player.confidence==="gering"||p.player.forecastSources.length===0).length;
  let teamPairs=0;
  for(let i=0;i<picks.length;i++)for(let j=i+1;j<picks.length;j++)if(picks[i].player.team===picks[j].player.team)teamPairs++;
  const dnp=picks.reduce((total,p)=>total+clamp(1-p.player.playProb,0,1),0)/Math.max(1,picks.length);
  const spread=picks.reduce((total,p)=>total+clamp(p.player.variability/Math.max(15,p.player.expected),0,1),0)/Math.max(1,picks.length);
  const riskIndex=Math.round(clamp(100*(dnp*.55+spread*.28+(lowData/Math.max(1,picks.length))*.13)+teamPairs*2.5,0,100));
  const riskLabel:IntelligenceVariant["riskLabel"]=riskIndex<28?"Niedriger":riskIndex<50?"Mittel":"Erhöht";
  return {riskIndex,riskLabel,atRisk,teamPairs,lowData};
}

const LABELS:Record<IntelligenceStyle,{label:string;subtitle:string}>={
  safe:{label:"Safety First",subtitle:"Stabilerer Floor"},
  balanced:{label:"Best Projection",subtitle:"Höchster Erwartungswert"},
  upside:{label:"High Ceiling",subtitle:"Offensives Punktepotenzial"},
  target:{label:"Arcade Target",subtitle:"Höchste Zielchance im Kandidatenpool"},
};
const OBJECTIVES:[IntelligenceStyle,Strategy][]=[
  ["safe","safe"],["balanced","balanced"],["upside","upside"],
];
const score=(line:OptimizedLineup,style:IntelligenceStyle):number=>
  style==="safe"?line.floorScore:
  style==="balanced"?line.projectedScore:
  style==="upside"?line.ceilingScore:(line.targetProbability??-1);

/** At most four distinct, legal five-card lineups. Respect locked/excluded,
 * card ownership, positional eligibility and the NBA 16-star cap by delegating
 * ALL candidate generation to the existing tested optimizer.
 */
export function buildArcadeIntelligence(cards:CardInput[],options:OptimizeOptions):IntelligenceBoard{
  const target=typeof options.targetScore==="number" && Number.isFinite(options.targetScore) && options.targetScore>0?options.targetScore:null;
  const opts={...options,limit:8,beamWidth:Math.min(320,options.beamWidth??260),maxCandidatesPerSlot:Math.min(150,options.maxCandidatesPerSlot??115),targetScore:target};
  const pools=new Map<IntelligenceStyle,OptimizedLineup[]>();
  const all=new Map<string,OptimizedLineup>();
  for(const [style,strategy] of OBJECTIVES){
    const lines=optimizeArcadeLineups(cards,{...opts,strategy});
    pools.set(style,lines);
    for(const l of lines)all.set(lineupKey(l),l);
  }
  if(target!==null){
    const sorted=[...all.values()].sort((a,b)=>score(b,"target")-score(a,"target"));
    pools.set("target",sorted);
  }
  const baseline=pools.get("balanced")?.[0]??null;
  // Preserve the top target pick; other comparisons use the best available
  // *different* five-player set so the cards present genuine alternatives.
  const order:IntelligenceStyle[]=target!==null?["target","safe","balanced","upside"]:["safe","balanced","upside"];
  const used=new Set<string>();
  const selected=new Map<IntelligenceStyle,OptimizedLineup>();
  for(const style of order){
    const pool=pools.get(style)??[];
    const line=pool.find(l=>!used.has(lineupKey(l)));
    if(!line)continue;
    used.add(lineupKey(line));selected.set(style,line);
  }
  const displayOrder:IntelligenceStyle[]=target!==null?["safe","balanced","upside","target"]:["safe","balanced","upside"];
  const variants:IntelligenceVariant[]=displayOrder
    .flatMap(style=>{
      const line=selected.get(style);
      if(!line)return [];
      const details=profileLineup(line);
      const labels=LABELS[style];
      return [{key:lineupKey(line),style,label:labels.label,subtitle:labels.subtitle,lineup:line,
        ...details,targetGap:target===null?null:line.projectedScore-target,
        sharedWithBaseline:baseline?line.picks.filter(p=>baseline.picks.some(q=>q.player.id===p.player.id)).length:0}];
    });
  const excluded=new Set(options.excludedPlayerIds??[]);
  const availablePlayers=new Set(cards.filter(c=>!excluded.has(c.player.id)&&candidateIsEligible(c,options)).map(c=>c.player.id)).size;
  return {variants,recommendedKey:selected.get(target!==null?"target":"balanced")?lineupKey(selected.get(target!==null?"target":"balanced")!):variants[0]?.key??null,
    possibleCount:all.size,target,availablePlayers,
    note:variants.length<order.length?"Einige Strategien führen zur gleichen oder keiner weiteren gültigen Aufstellung. Daher werden nur unterschiedliche Varianten angezeigt.":"Alle Varianten erfüllen die im Helper hinterlegten Aufstellungsregeln."};
}

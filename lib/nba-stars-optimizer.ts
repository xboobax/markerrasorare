/**
 * Neon Builder Pro V3.2: NBA Stars Optimizer 2.1.
 *
 * Bounded, multi-objective 0/1 star-budget dynamic programming. We search whole
 * five-player combinations rather than greedily choosing points per star.
 * The Sorare-derived/manual matchup adjustment is ALREADY embedded in
 * Forecast.weighted by enrichForecast(); never apply it a second time.
 * Missing scouting/defense information is neutral, not invented.
 */
import {ARCADE} from "../config/divination";
import {candidateIsEligible,isValidNbaStars,type CardInput,type LineupPick,type OptimizeOptions,type OptimizedLineup} from "./arcade";
import {projectionValue,satisfiesV30Constraints,reachesV30Minimum,opponentsAreMatched} from "./builder-v30";
import {estimateTargetChance} from "./target-probability";

export type NbaStarsMode="max"|"value"|"safe"|"upside";
export const NBA_STARS_MODES:ReadonlyArray<{id:NbaStarsMode;label:string;detail:string}>=[
  {id:"max",label:"Max Points",detail:"Höchste prognostizierte Gesamtpunktzahl"},
  {id:"value",label:"Smart Value",detail:"Sterne-Effizienz priorisieren, aber mindestens 90 % der Max-Points-Prognose erhalten"},
  {id:"safe",label:"Safety First",detail:"Floor, Einsatzsicherheit und Datenqualität deutlich stärker gewichten"},
  {id:"upside",label:"High Ceiling",detail:"Ceiling-Potenzial stärker gewichten, statt nur die Mittelwert-Prognose"},
];
export type NbaStarsAssessment={
  pointsPerStar:number;unusedStars:number;riskIndex:number;atRisk:number;lowData:number;
  matchupKnown:number;matchupFavorable:number;matchupDifficult:number;
  /** Heuristic adjustment already included in forecast. NOT an additional score bonus. */
  matchupPercentAverage:number|null;
};
export type NbaLineupDiversity=1|2|3;
/** A change means a genuinely new player relative to another five-player lineup. */
export function lineupChanges(a:OptimizedLineup,b:OptimizedLineup):number{
  const old=new Set(a.picks.map(p=>p.player.id));
  return b.picks.filter(p=>!old.has(p.player.id)).length;
}
export function normalizeNbaDiversity(value:unknown):NbaLineupDiversity{
  return value===1||value===2||value===3?value:2;
}
export type NbaStarsVariant={
  mode:NbaStarsMode;lineup:OptimizedLineup;assessment:NbaStarsAssessment;
  changesFromMax:number;minChangesToOtherVariants:number;meetsDiversity:boolean;
  /** Raw expected-point gap relative to Max Points; negative means higher. */
  projectedLoss:number;projectedLossPercent:number;
};
export type NbaStarsBoard={
  variants:NbaStarsVariant[];
  pools:Record<NbaStarsMode,OptimizedLineup[]>;
  availablePlayers:number;poolWasLimited:boolean;uniqueCandidates:number;
  requestedDiversity:NbaLineupDiversity;unmetDiversity:NbaStarsMode[];referenceScore:number;
  note:string;
};
const finite=(n:unknown):n is number=>typeof n==="number"&&Number.isFinite(n);
const cap=Math.round(ARCADE.nba.maxStars*2);
const lineKey=(l:OptimizedLineup)=>l.picks.map(p=>p.player.id).sort().join("|");
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));

export function assessNbaStarsLineup(line:OptimizedLineup):NbaStarsAssessment{
  const picks=line.picks;
  const atRisk=picks.filter(p=>p.player.playProb<.65||p.player.injuries>0).length;
  const lowData=picks.filter(p=>p.player.confidence==="gering"||p.player.forecastSources.length===0).length;
  const avgDnp=picks.reduce((n,p)=>n+clamp(1-p.player.playProb,0,1),0)/Math.max(picks.length,1);
  const spread=picks.reduce((n,p)=>n+clamp(p.player.variability/Math.max(15,p.player.expected),0,1),0)/Math.max(picks.length,1);
  const riskIndex=Math.round(clamp(100*(avgDnp*.55+spread*.28+lowData/Math.max(picks.length,1)*.17),0,100));
  let matchupKnown=0,matchupFavorable=0,matchupDifficult=0,delta=0;
  for(const pick of picks){
    const scout=pick.player as typeof pick.player&{opponentRating?:number|null;matchupAdjustmentPct?:number};
    if(!finite(scout.opponentRating)||scout.opponentRating<1||scout.opponentRating>5)continue;
    matchupKnown++;
    if(scout.opponentRating<=2)matchupFavorable++;
    if(scout.opponentRating>=4)matchupDifficult++;
    delta+=finite(scout.matchupAdjustmentPct)?scout.matchupAdjustmentPct:0;
  }
  return {pointsPerStar:line.starsUsed>0?line.projectedScore/line.starsUsed:0,
    unusedStars:Math.max(0,ARCADE.nba.maxStars-line.starsUsed),riskIndex,atRisk,lowData,
    matchupKnown,matchupFavorable,matchupDifficult,
    matchupPercentAverage:matchupKnown?delta/matchupKnown:null};
}

type Candidate={pick:LineupPick;cost:number;value:number;safe:number;upside:number};
type State={picks:Candidate[];rank:number};
const stateKey=(s:State)=>s.picks.map(p=>p.pick.player.id).sort().join("|");
function score(p:Candidate,mode:NbaStarsMode){
  if(mode==="safe"){
    const f=p.pick.player;
    const lowData=f.confidence==="gering"?4:f.confidence==="mittel"?1:0;
    // A safer lineup can deliberately sacrifice some upside for floor,
    // stable attendance and reliable samples.
    return p.safe*1.25+p.value*.12-24*(1-clamp(f.playProb,0,1))-lowData*2.5;
  }
  if(mode==="upside")return p.upside*1.3+p.value*.08;
  // Favor a little remaining star budget during the VALUE candidate search.
  // Final value ranking uses points/star plus a 90%-of-max score floor.
  if(mode==="value")return p.value-4*(p.cost/2);
  return p.value;
}
function buildCandidates(cards:CardInput[],opts:OptimizeOptions,mode:NbaStarsMode){
  const excluded=new Set(opts.excludedPlayerIds??[]),locked=new Set(opts.lockedPlayerIds??[]);
  if(locked.size>5||[...locked].some(id=>excluded.has(id)))return null;
  const selection=new Map<string,Candidate>();
  for(const card of cards){
    if(excluded.has(card.player.id)||!candidateIsEligible(card,opts)||!isValidNbaStars(card.stars))continue;
    const projection=opts.advancedSettings?.projection??"ps";
    const selectedProjection=projectionValue(card,projection);
    if(selectedProjection===null)continue;
    const bonus=finite(card.bonusPercent)?clamp(card.bonusPercent,0,50):0;
    const factor=1+bonus/100,p=card.player;
    const expected=p.weighted*factor;
    const f=(finite(p.floor)?p.floor:p.expected)*p.playProb*factor;
    const c=(finite(p.ceiling)?p.ceiling:p.expected)*p.playProb*factor;
    const candidate:Candidate={pick:{slot:"ANY",player:p,stars:card.stars,bonusPercent:bonus,
      projectedScore:expected,floorScore:f,ceilingScore:c,optimizeScore:selectedProjection},
      cost:Math.round(card.stars*2),value:selectedProjection,safe:f,upside:c};
    const previous=selection.get(p.id);
    if(!previous||score(candidate,mode)>score(previous,mode))selection.set(p.id,candidate);
  }
  if([...locked].some(id=>!selection.has(id)))return null;
  const pins=[...locked].map(id=>selection.get(id)!);
  const remaining=[...selection.values()].filter(p=>!locked.has(p.pick.player.id));
  // Keep top objective players AND cheap value candidates. This bounded search
  // prevents excessive synchronous work with very large league-wide rosters.
  const take=150;
  const main=[...remaining].sort((a,b)=>score(b,mode)-score(a,mode)||a.pick.player.id.localeCompare(b.pick.player.id)).slice(0,take);
  const cheap=[...remaining].sort((a,b)=>(b.value/(b.cost/2))-(a.value/(a.cost/2))||a.pick.player.id.localeCompare(b.pick.player.id)).slice(0,50);
  const pool=[...new Map([...main,...cheap].map(p=>[p.pick.player.id,p])).values()];
  return {pins,pool,eligibleCount:selection.size,limited:remaining.length>pool.length};
}
function toLineup(picks:Candidate[],target?:number|null):OptimizedLineup{
  const only=picks.map(p=>p.pick);
  return {picks:only,projectedScore:only.reduce((n,p)=>n+p.projectedScore,0),
    floorScore:only.reduce((n,p)=>n+p.floorScore,0),ceilingScore:only.reduce((n,p)=>n+p.ceilingScore,0),
    starsUsed:only.reduce((n,p)=>n+(p.stars??0),0),
    targetProbability:finite(target)&&target>0?estimateTargetChance(only,target):null};
}
/** Search legal 5-card combinations by mode. Keeps several best states per star
 * bucket (so later conflict checks and alternatives remain possible).
 */
function search(cards:CardInput[],opts:OptimizeOptions,mode:NbaStarsMode,diversityFrom?:{reference:ReadonlySet<string>;minimum:NbaLineupDiversity}):{lines:OptimizedLineup[];eligibleCount:number;limited:boolean}{
  const pool=buildCandidates(cards,opts,mode);
  if(!pool)return {lines:[],eligibleCount:0,limited:false};
  const {pins}=pool;
  const spent=pins.reduce((n,p)=>n+p.cost,0);
  if(spent>cap||pins.length>5)return {lines:[],eligibleCount:pool.eligibleCount,limited:pool.limited};
  if(opts.advancedSettings?.avoidOpponents){
    for(let i=0;i<pins.length;i++)for(let j=i+1;j<pins.length;j++)
      if(opponentsAreMatched(pins[i].pick.player,pins[j].pick.player))return {lines:[],eligibleCount:pool.eligibleCount,limited:pool.limited};
  }
  // Extra DP dimension tracks overlap with Max Points. Unlike a soft
  // penalty, this cannot silently return a team with too few changes.
  const allowedOverlap=diversityFrom?5-diversityFrom.minimum:5;
  const initialOverlap=diversityFrom?pins.filter(p=>diversityFrom.reference.has(p.pick.player.id)).length:0;
  if(initialOverlap>allowedOverlap)return {lines:[],eligibleCount:pool.eligibleCount,limited:pool.limited};
  const dp:State[][][][]=Array.from({length:6},()=>Array.from({length:cap+1},()=>Array.from({length:allowedOverlap+1},()=>[])));
  dp[pins.length][spent][initialOverlap]=[{picks:pins,rank:pins.reduce((n,p)=>n+score(p,mode),0)}];
  const keep=Math.max(8,Math.min(24,Math.ceil((opts.limit??5)*1.1)));
  for(const item of pool.pool){
    for(let count=4;count>=pins.length;count--){
      for(let stars=cap-item.cost;stars>=0;stars--){
        const overlapCost=diversityFrom&&diversityFrom.reference.has(item.pick.player.id)?1:0;
        for(let overlap=allowedOverlap-overlapCost;overlap>=0;overlap--){
          const states=dp[count][stars][overlap];if(!states.length)continue;
          const dest=dp[count+1][stars+item.cost][overlap+overlapCost];
          for(const state of states){
            if(opts.advancedSettings?.avoidOpponents&&state.picks.some(p=>opponentsAreMatched(p.pick.player,item.pick.player)))continue;
            // Backwards DP protects against duplicate selection of an item.
            dest.push({picks:[...state.picks,item],rank:state.rank+score(item,mode)});
          }
          if(dest.length>keep){
            dest.sort((a,b)=>b.rank-a.rank);
            const unique=new Set<string>(),best:State[]=[];
            for(const state of dest){const key=stateKey(state);if(unique.has(key))continue;unique.add(key);best.push(state);if(best.length===keep)break;}
            dp[count+1][stars+item.cost][overlap+overlapCost]=best;
          }
        }
      }
    }
  }
  const found=new Map<string,OptimizedLineup>();
  for(const byOverlap of dp[5])for(const states of byOverlap)for(const state of states){
    const line=toLineup(state.picks,opts.targetScore);
    if(opts.advancedSettings&&(!satisfiesV30Constraints(line.picks,"nba",opts.advancedSettings)||!reachesV30Minimum(line,"nba",opts.advancedSettings)))continue;
    found.set(lineKey(line),line);
  }
  const ranked=[...found.values()].sort((a,b)=>{
    const get=(l:OptimizedLineup)=>mode==="safe"?l.floorScore*1.25+l.projectedScore*.12-25*assessNbaStarsLineup(l).riskIndex/100:
      mode==="upside"?l.ceilingScore*1.3+l.projectedScore*.08:mode==="value"?l.projectedScore-4*l.starsUsed:
      (opts.advancedSettings?.projection&&opts.advancedSettings.projection!=="ps")?l.picks.reduce((n,p)=>n+p.optimizeScore,0):l.projectedScore;
    return get(b)-get(a)||a.starsUsed-b.starsUsed||lineKey(a).localeCompare(lineKey(b));
  });
  return {lines:ranked.slice(0,Math.max(20,opts.limit??5)),eligibleCount:pool.eligibleCount,limited:pool.limited};
}

/**
 * Generate different profile lineups with a real minimum number of different
 * players. The Max-Points lineup is never changed for the sake of diversity.
 * Constraints and a >=90% points safeguard always win over diversity.
 * When diversity is impossible the UI receives an explicit, measurable warning.
 */
export function buildNbaStarsOptimizer(cards:CardInput[],opts:OptimizeOptions,minChangesInput:NbaLineupDiversity=2):NbaStarsBoard{
  const minimum=normalizeNbaDiversity(minChangesInput);
  const modes:NbaStarsMode[]=["max","value","safe","upside"];
  const options={...opts,sport:"nba" as const,limit:Math.max(12,opts.limit??5)};
  const searches=modes.map(mode=>search(cards,options,mode));
  const common=new Map<string,OptimizedLineup>();
  for(const result of searches)for(const line of result.lines)common.set(lineKey(line),line);
  const objective=(line:OptimizedLineup,mode:NbaStarsMode):number=>{
    if(mode==="safe")return line.floorScore*1.25+line.projectedScore*.12-25*assessNbaStarsLineup(line).riskIndex/100;
    if(mode==="upside")return line.ceilingScore*1.3+line.projectedScore*.08;
    if(mode==="value")return assessNbaStarsLineup(line).pointsPerStar;
    return opts.advancedSettings?.projection&&opts.advancedSettings.projection!=="ps"?
      line.picks.reduce((n,p)=>n+p.optimizeScore,0):line.projectedScore;
  };
  const sort=(lines:OptimizedLineup[],mode:NbaStarsMode)=>lines.sort((a,b)=>objective(b,mode)-objective(a,mode)||b.projectedScore-a.projectedScore||lineKey(a).localeCompare(lineKey(b)));
  const best=sort([...common.values()],"max")[0];
  if(!best){
    const empty={max:[],value:[],safe:[],upside:[]} as Record<NbaStarsMode,OptimizedLineup[]>;
    return {variants:[],pools:empty,availablePlayers:Math.max(0,...searches.map(r=>r.eligibleCount)),
      poolWasLimited:searches.some(r=>r.limited),uniqueCandidates:0,requestedDiversity:minimum,
      unmetDiversity:[],referenceScore:0,
      note:"Kein vollständiges, regelkonformes NBA-Lineup mit den aktuellen Daten und Filtern."};
  }
  const reference=new Set(best.picks.map(p=>p.player.id));
  const valueFloor=.9*best.projectedScore;
  const pools={} as Record<NbaStarsMode,OptimizedLineup[]>;
  pools.max=sort([...common.values()],"max");
  const poolWasLimited=searches.some(r=>r.limited);
  // A separate overlap-constrained search prevents the usual pool pruning from
  // hiding valid 2- or 3-player swaps behind nearly identical top candidates.
  for(const mode of modes.filter(m=>m!=="max")){
    const distinct=search(cards,options,mode,{reference,minimum});
    const merged=new Map(common);
    for(const line of distinct.lines)merged.set(lineKey(line),line);
    const feasible=[...merged.values()].filter(l=>l.projectedScore>=valueFloor-1e-7);
    pools[mode]=sort(feasible,mode);
  }
  const variants:NbaStarsVariant[]=[];
  const add=(mode:NbaStarsMode,line:OptimizedLineup,meets=true)=>{
    const previous=variants.map(v=>v.lineup);
    const distance=previous.length?Math.min(...previous.map(old=>lineupChanges(old,line))):0;
    const loss=best.projectedScore-line.projectedScore;
    variants.push({mode,lineup:line,assessment:assessNbaStarsLineup(line),
      changesFromMax:lineupChanges(best,line),minChangesToOtherVariants:distance,
      meetsDiversity:meets,projectedLoss:loss,
      projectedLossPercent:best.projectedScore>0?loss/best.projectedScore*100:0});
  };
  add("max",best);
  const used=new Set<string>([lineKey(best)]);
  for(const mode of modes.filter(m=>m!=="max")){
    const candidates=pools[mode].filter(line=>!used.has(lineKey(line)));
    const pairwise=candidates.find(line=>variants.every(v=>lineupChanges(v.lineup,line)>=minimum));
    const fromMax=candidates.find(line=>lineupChanges(best,line)>=minimum);
    // If no legal team meets the user's threshold, choose the nearest legal
    // alternative (while retaining the 90%-of-best guard) and flag shortfall.
    const fallback=[...candidates].sort((a,b)=>{
      const distance=(l:OptimizedLineup)=>Math.min(...variants.map(v=>lineupChanges(v.lineup,l)));
      return distance(b)-distance(a)||objective(b,mode)-objective(a,mode)||lineKey(a).localeCompare(lineKey(b));
    })[0];
    const chosen=pairwise??fromMax??fallback;
    if(!chosen)continue;
    const met=variants.every(v=>lineupChanges(v.lineup,chosen)>=minimum);
    add(mode,chosen,met);
    used.add(lineKey(chosen));
  }
  // Re-evaluate against ALL final variants, not just the ones that existed
  // when each profile was picked. The label never overstates diversity.
  for(let i=0;i<variants.length;i++){
    const peers=variants.filter((_,j)=>i!==j);
    variants[i].minChangesToOtherVariants=peers.length?Math.min(...peers.map(v=>lineupChanges(v.lineup,variants[i].lineup))):0;
    variants[i].meetsDiversity=i===0||peers.every(v=>lineupChanges(v.lineup,variants[i].lineup)>=minimum);
  }
  const unmetDiversity=modes.filter(m=>m!=="max"&&(!variants.some(v=>v.mode===m)||!variants.find(v=>v.mode===m)!.meetsDiversity));
  const note=`Mindestabweichung: ${minimum} neue Spieler pro Teamvergleich. `+
    `${unmetDiversity.length?`Nicht für ${unmetDiversity.map(m=>NBA_STARS_MODES.find(x=>x.id===m)?.label).join(", ")} erreichbar – eingeschränkter Spielerpool, Regeln oder 90-%-Qualitätsgrenze. `:"Alle ausgegebenen Profilvarianten erfüllen die eingestellte Mindestabweichung. "}`+
    `${poolWasLimited?"Suchpool leistungsbegrenzt; kein garantierter globaler Optimalitätsnachweis. ":""}`+
    "Matchup-Effekte sind bereits in der Prognose enthalten; fehlende Gegnerdaten bleiben neutral. Prognosen sind Schätzungen.";
  return {variants,pools,availablePlayers:Math.max(...searches.map(r=>r.eligibleCount)),
    poolWasLimited,uniqueCandidates:new Set([...common.keys(),...modes.filter(m=>m!=="max").flatMap(m=>pools[m].map(lineKey))]).size,
    requestedDiversity:minimum,unmetDiversity,referenceScore:best.projectedScore,note};
}

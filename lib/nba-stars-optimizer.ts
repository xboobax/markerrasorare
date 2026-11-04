/**
 * Neon Builder Pro V3.1: NBA Stars Optimizer 2.0.
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
  {id:"value",label:"Smart Value",detail:"Mehr Punkte pro Stern bei mindestens 90 % der besten Prognose"},
  {id:"safe",label:"Safety First",detail:"Stabiler Floor und geringeres Daten-/DNP-Risiko"},
  {id:"upside",label:"High Ceiling",detail:"Höheres prognostiziertes Spitzenpotenzial"},
];
export type NbaStarsAssessment={
  pointsPerStar:number;unusedStars:number;riskIndex:number;atRisk:number;lowData:number;
  matchupKnown:number;matchupFavorable:number;matchupDifficult:number;
  /** Heuristic adjustment already included in forecast. NOT an additional score bonus. */
  matchupPercentAverage:number|null;
};
export type NbaStarsVariant={mode:NbaStarsMode;lineup:OptimizedLineup;assessment:NbaStarsAssessment};
export type NbaStarsBoard={
  variants:NbaStarsVariant[];
  pools:Record<NbaStarsMode,OptimizedLineup[]>;
  availablePlayers:number;poolWasLimited:boolean;uniqueCandidates:number;
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
    return p.safe-8*(1-clamp(f.playProb,0,1))-lowData;
  }
  if(mode==="upside")return p.upside;
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
function search(cards:CardInput[],opts:OptimizeOptions,mode:NbaStarsMode):{lines:OptimizedLineup[];eligibleCount:number;limited:boolean}{
  const pool=buildCandidates(cards,opts,mode);
  if(!pool)return {lines:[],eligibleCount:0,limited:false};
  const {pins}=pool;
  const spent=pins.reduce((n,p)=>n+p.cost,0);
  if(spent>cap||pins.length>5)return {lines:[],eligibleCount:pool.eligibleCount,limited:pool.limited};
  if(opts.advancedSettings?.avoidOpponents){
    for(let i=0;i<pins.length;i++)for(let j=i+1;j<pins.length;j++)
      if(opponentsAreMatched(pins[i].pick.player,pins[j].pick.player))return {lines:[],eligibleCount:pool.eligibleCount,limited:pool.limited};
  }
  const dp:State[][][]=Array.from({length:6},()=>Array.from({length:cap+1},()=>[]));
  dp[pins.length][spent]=[{picks:pins,rank:pins.reduce((n,p)=>n+score(p,mode),0)}];
  const keep=Math.max(8,Math.min(24,Math.ceil((opts.limit??5)*1.1)));
  for(const item of pool.pool){
    for(let count=4;count>=pins.length;count--){
      for(let stars=cap-item.cost;stars>=0;stars--){
        const states=dp[count][stars];if(!states.length)continue;
        const dest=dp[count+1][stars+item.cost];
        for(const state of states){
          if(opts.advancedSettings?.avoidOpponents&&state.picks.some(p=>opponentsAreMatched(p.pick.player,item.pick.player)))continue;
          const next:State={picks:[...state.picks,item],rank:state.rank+score(item,mode)};
          // All input players are unique within the pool, and the backwards
          // 0/1 DP iteration prevents choosing the same player twice.
          dest.push(next);
        }
        if(dest.length>keep){
          dest.sort((a,b)=>b.rank-a.rank);
          // Keep diverse combinations, not ten orderings of the same players.
          const unique=new Set<string>(),best:State[]=[];
          for(const s of dest){const key=stateKey(s);if(unique.has(key))continue;unique.add(key);best.push(s);if(best.length===keep)break;}
          dp[count+1][stars+item.cost]=best;
        }
      }
    }
  }
  const found=new Map<string,OptimizedLineup>();
  for(const states of dp[5])for(const state of states){
    const line=toLineup(state.picks,opts.targetScore);
    if(opts.advancedSettings&&(!satisfiesV30Constraints(line.picks,"nba",opts.advancedSettings)||!reachesV30Minimum(line,"nba",opts.advancedSettings)))continue;
    found.set(lineKey(line),line);
  }
  const ranked=[...found.values()].sort((a,b)=>{
    const get=(l:OptimizedLineup)=>mode==="safe"?l.floorScore-8*assessNbaStarsLineup(l).riskIndex/100:
      mode==="upside"?l.ceilingScore:mode==="value"?l.projectedScore-4*l.starsUsed:
      (opts.advancedSettings?.projection&&opts.advancedSettings.projection!=="ps")?l.picks.reduce((n,p)=>n+p.optimizeScore,0):l.projectedScore;
    return get(b)-get(a)||a.starsUsed-b.starsUsed||lineKey(a).localeCompare(lineKey(b));
  });
  return {lines:ranked.slice(0,Math.max(20,opts.limit??5)),eligibleCount:pool.eligibleCount,limited:pool.limited};
}

/** Full multi-objective board. Value uses a 90%-of-best points guard so the
 * points-per-star metric cannot nominate a weak five-card lineup by accident.
 * Returns only distinct profile variants when the pool permits this.
 */
export function buildNbaStarsOptimizer(cards:CardInput[],opts:OptimizeOptions):NbaStarsBoard{
  const modes:NbaStarsMode[]=["max","value","safe","upside"];
  const searches=modes.map(mode=>search(cards,{...opts,sport:"nba",limit:Math.max(12,opts.limit??5)},mode));
  const all=new Map<string,OptimizedLineup>();
  for(const result of searches)for(const line of result.lines)all.set(lineKey(line),line);
  const maximum=Math.max(0,...[...all.values()].map(l=>l.projectedScore));
  const valueFloor=.9*maximum;
  const sortProfiles=(mode:NbaStarsMode):OptimizedLineup[]=>{
    const candidates=[...all.values()].filter(l=>mode!=="value"||l.projectedScore>=valueFloor-1e-7);
    const metric=(l:OptimizedLineup)=>mode==="safe"?l.floorScore-8*assessNbaStarsLineup(l).riskIndex/100:
      mode==="upside"?l.ceilingScore:
      mode==="value"?assessNbaStarsLineup(l).pointsPerStar:
      opts.advancedSettings?.projection&&opts.advancedSettings.projection!=="ps"?l.picks.reduce((n,p)=>n+p.optimizeScore,0):l.projectedScore;
    return candidates.sort((a,b)=>metric(b)-metric(a)||b.projectedScore-a.projectedScore||lineKey(a).localeCompare(lineKey(b)));
  };
  const pools={max:sortProfiles("max"),value:sortProfiles("value"),safe:sortProfiles("safe"),upside:sortProfiles("upside")};
  const used=new Set<string>(),variants:NbaStarsVariant[]=[];
  for(const mode of modes){
    const line=pools[mode].find(l=>!used.has(lineKey(l)));
    if(!line)continue;
    variants.push({mode,lineup:line,assessment:assessNbaStarsLineup(line)});
    used.add(lineKey(line));
  }
  return {variants,pools,availablePlayers:Math.max(...searches.map(r=>r.eligibleCount)),
    poolWasLimited:searches.some(r=>r.limited),uniqueCandidates:all.size,
    note:all.size===0?"Kein vollständiges, regelkonformes NBA-Lineup mit den aktuellen Daten und Filtern.":
      `Vier Suchziele, ${all.size} unterschiedliche gültige Kandidaten. ${searches.some(r=>r.limited)?"Leistungsbegrenzt: pro Suchziel wurden die stärksten Kandidaten vorausgewählt; kein Nachweis eines globalen Optimums. ":""}Matchup-Effekte stecken bereits in den Prognosen; unbewertete Gegner bleiben neutral. Varianten sind Modellvorschläge, keine offizielle Sorare-Freigabe.`};
}

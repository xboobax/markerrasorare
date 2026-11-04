import type {Forecast, Sport} from "./model";
import {ARCADE} from "../config/divination";
import {estimateTargetChance} from "./target-probability";
import {projectionValue,satisfiesV30Constraints,reachesV30Minimum, type BuilderV30Settings} from "./builder-v30";

export type Strategy = "balanced" | "safe" | "upside" | "target";
export type CardInput = {
  player: Forecast;
  stars?: number | null;
  bonusPercent?: number;
  owned?: boolean;
};
export type LineupPick = {
  slot: string;
  player: Forecast;
  stars: number | null;
  bonusPercent: number;
  projectedScore: number;
  floorScore: number;
  ceilingScore: number;
  optimizeScore: number;
};
export type OptimizedLineup = {
  picks: LineupPick[];
  projectedScore: number;
  floorScore: number;
  ceilingScore: number;
  starsUsed: number;
  targetProbability: number | null; // Schätzung, nicht statistisch kalibriert
};
export type OptimizeOptions = {
  sport: Sport;
  ownedOnly?: boolean;
  limit?: number;
  beamWidth?: number;
  maxCandidatesPerSlot?: number;
  strategy?: Strategy;
  targetScore?: number | null;
  lockedPlayerIds?: string[];
  excludedPlayerIds?: string[];
  advancedSettings?: BuilderV30Settings;
};
const footballSlots: string[] = [...ARCADE.football.slots];
const nbaSlots: string[] = [...ARCADE.nba.slots];
const clampBonus = (n: number | undefined) =>
  typeof n === "number" && Number.isFinite(n) ? Math.max(0,Math.min(50,n)) : 0;

export function isValidNbaStars(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 5 && Number.isInteger(value * 2);
}
export function slotAccepts(slot: string, position: string): boolean {
  if (slot === "ANY") return true;
  if (slot === "FLEX") return ["DEF","MID","FWD"].includes(position);
  return slot === position;
}
export function candidateIsEligible(card: CardInput, opts: OptimizeOptions): boolean {
  if (opts.ownedOnly && !card.owned) return false;
  if (!Number.isFinite(card.player.weighted) || card.player.weighted <= 0) return false;
  if (card.player.hasGame === false) return false;
  return opts.sport !== "nba" || isValidNbaStars(card.stars);
}
const ranking = (pick: LineupPick) => pick.optimizeScore;
function result(picks: LineupPick[]): OptimizedLineup {
  return {
    picks,
    projectedScore: picks.reduce((n,p)=>n+p.projectedScore,0),
    floorScore: picks.reduce((n,p)=>n+p.floorScore,0),
    ceilingScore: picks.reduce((n,p)=>n+p.ceilingScore,0),
    starsUsed: picks.reduce((n,p)=>n+(p.stars??0),0),
    targetProbability: null,
  };
}
function dedupe(lineups: OptimizedLineup[], limit: number, strategy: Strategy, target?: number | null, advanced?:BuilderV30Settings) {
  const withChance = lineups.map(l=>({...l, targetProbability: target && target > 0 ? estimateTargetChance(l.picks, target) : null}));
  const byPlayers = new Map<string,OptimizedLineup>();
  const metric = (l:OptimizedLineup) => strategy === "safe" ? l.floorScore : strategy === "upside" ? l.ceilingScore : strategy === "target" ? (l.targetProbability ?? -1) : advanced&&advanced.projection!=="ps"?l.picks.reduce((sum,p)=>sum+p.optimizeScore,0):l.projectedScore;
  for (const line of withChance) {
    const key = line.picks.map(p=>p.player.id).sort().join("|");
    const prev = byPlayers.get(key);
    if (!prev || metric(line)>metric(prev)) byPlayers.set(key,line);
  }
  return [...byPlayers.values()].sort((a,b)=>metric(b)-metric(a)).slice(0,limit);
}

/**
 * NBA: exact budget-DP (half-stars, 5 distinct players), with mandatory picks.
 * Football: constraint-valid bounded beam search with mandatory player assignments.
 * The displayed projection always remains the risk-adjusted expected total;
 * safe/upside only change the OPTIMIZATION OBJECTIVE.
 */
export function optimizeArcadeLineups(cards: CardInput[], opts: OptimizeOptions): OptimizedLineup[] {
  const strategy = opts.strategy ?? "balanced";
  const limit = Math.max(1,Math.min(20,Math.floor(opts.limit??3)));
  const beamWidth = Math.max(5,Math.min(1000,Math.floor(opts.beamWidth??250)));
  const perSlot = Math.max(5,Math.min(500,Math.floor(opts.maxCandidatesPerSlot??100)));
  // Goal optimization is a non-additive objective. Gather diverse feasible
  // candidates with three additive searches, then rank by probability.
  // This is a bounded candidate search, not a global proof of optimality.
  if (strategy === "target") {
    if (!(typeof opts.targetScore === "number" && Number.isFinite(opts.targetScore) && opts.targetScore > 0)) return [];
    const pool = (["balanced", "safe", "upside"] as const).flatMap(objective =>
      optimizeArcadeLineups(cards, {...opts, strategy: objective, limit: 20}));
    return dedupe(pool, limit, "target", opts.targetScore,opts.advancedSettings);
  }
  const lockedIds = new Set(opts.lockedPlayerIds??[]);
  const excludedIds = new Set(opts.excludedPlayerIds??[]);
  if (lockedIds.size > 5 || [...lockedIds].some(id=>excludedIds.has(id))) return [];
  const advanced=opts.advancedSettings;
  const clean: LineupPick[] = cards.filter(c=>!excludedIds.has(c.player.id) && candidateIsEligible(c,opts) && (!advanced||projectionValue(c,advanced.projection)!==null))
    .map(card=>{
      const bonusPercent = clampBonus(card.bonusPercent);
      const factor=1+bonusPercent/100;
      const p=card.player;
      const projectedScore=p.weighted*factor;
      const floorScore=(Number.isFinite(p.floor)?p.floor:p.expected)*p.playProb*factor;
      const ceilingScore=(Number.isFinite(p.ceiling)?p.ceiling:p.expected)*p.playProb*factor;
      return {slot:"",player:p,stars:opts.sport==="nba"?(card.stars as number):null,
        bonusPercent,projectedScore,floorScore,ceilingScore,
        optimizeScore:strategy==="safe"?floorScore:strategy==="upside"?ceilingScore:advanced?projectionValue(card,advanced.projection)??0:projectedScore};
    });
  // Distinct players: until multi-edition card support use the best edition per player.
  const byId=new Map<string,LineupPick>();
  for (const card of clean) {
    const old=byId.get(card.player.id);
    if (!old||ranking(card)>ranking(old)) byId.set(card.player.id,card);
  }
  if ([...lockedIds].some(id=>!byId.has(id))) return [];
  const pinned=[...lockedIds].map(id=>byId.get(id)!);
  const remaining=[...byId.values()].filter(p=>!lockedIds.has(p.player.id));

  if (opts.sport==="nba") {
    const cap=Math.round(ARCADE.nba.maxStars*2);
    const spent=pinned.reduce((n,p)=>n+Math.round((p.stars??0)*2),0);
    if (spent>cap) return [];
    type State={picks:LineupPick[];rank:number};
    const dp:State[][][]=Array.from({length:6},()=>Array.from({length:cap+1},()=>[]));
    const initial=pinned.map(p=>({...p,slot:"ANY"}));
    dp[pinned.length][spent]=[{picks:initial,rank:initial.reduce((n,p)=>n+ranking(p),0)}];
    for (const item of remaining) {
      const cost=Math.round((item.stars??0)*2);
      for(let count=4;count>=pinned.length;count--) {
        for(let sum=cap-cost;sum>=0;sum--) {
          if (!dp[count][sum].length) continue;
          const dest=dp[count+1][sum+cost];
          for(const state of dp[count][sum]) dest.push({picks:[...state.picks,{...item,slot:"ANY"}],rank:state.rank+ranking(item)});
          dest.sort((a,b)=>b.rank-a.rank);
          if(dest.length>limit) dest.length=limit;
        }
      }
    }
    return dedupe(dp[5].flat().map(s=>result(s.picks)).filter(line=>!advanced||(satisfiesV30Constraints(line.picks,opts.sport,advanced)&&reachesV30Minimum(line,opts.sport,advanced))),limit,strategy,opts.targetScore,advanced);
  }

  // Enumerate legal assignments for locked players, including a possible FLEX pick.
  // Pinned GK always occupies GK and a second player of the same outfield
  // position must use FLEX; reject impossible assignments rather than dropping pins.
  const assignmentGroups:{picks:LineupPick[];usedSlots:Set<string>}[]=[];
  function assign(idx:number, picks:LineupPick[], used:Set<string>) {
    if(idx===pinned.length){assignmentGroups.push({picks,usedSlots:used});return;}
    const pick=pinned[idx];
    for(const slot of footballSlots) {
      if(used.has(slot)||!slotAccepts(slot,pick.player.position)||(advanced&&slot==="FLEX"&&advanced.extraPosition!=="ANY"&&pick.player.position!==advanced.extraPosition)) continue;
      assign(idx+1,[...picks,{...pick,slot}],new Set([...used,slot]));
    }
  }
  assign(0,[],new Set());
  if(!assignmentGroups.length) return [];
  const candidates:OptimizedLineup[]=[];
  const orderedSlots=[...footballSlots].sort((a,b)=>Number(a==="FLEX")-Number(b==="FLEX"));
  for(const group of assignmentGroups) {
    type State={picks:LineupPick[];used:Set<string>;rank:number};
    let beam:State[]=[{picks:group.picks,used:new Set(group.picks.map(p=>p.player.id)),rank:group.picks.reduce((n,p)=>n+ranking(p),0)}];
    for(const slot of orderedSlots.filter(slot=>!group.usedSlots.has(slot))) {
      const pool=remaining.filter(p=>slotAccepts(slot,p.player.position)&&(!advanced||slot!=="FLEX"||advanced.extraPosition==="ANY"||p.player.position===advanced.extraPosition))
        .sort((a,b)=>ranking(b)-ranking(a)).slice(0,perSlot);
      if(!pool.length){beam=[];break;}
      const next:State[]=[];
      for(const state of beam) for(const pick of pool) {
        if(state.used.has(pick.player.id)|| (advanced?.avoidOpponents&& !satisfiesV30Constraints([...state.picks,{...pick,slot}],opts.sport,{...advanced,stack:"none",extraPosition:"ANY",minProjected:null})))continue;
        const stackBoost=advanced&&advanced.stack!=="none"?state.picks.reduce((total,older)=>{
          if(older.player.team!==pick.player.team)return total;
          const pair=[older.player.position,pick.player.position];
          return total+((advanced.stack==="team"||advanced.stack==="defensive"&&pair.includes("GK")&&pair.includes("DEF")||advanced.stack==="offensive"&&pair.includes("MID")&&pair.includes("FWD"))?5:0);
        },0):0;
        next.push({picks:[...state.picks,{...pick,slot}],used:new Set([...state.used,pick.player.id]),rank:state.rank+ranking(pick)+stackBoost-(advanced?.preferPrimary&&slot==="FLEX"?2:0)});
      }
      next.sort((a,b)=>b.rank-a.rank);
      const seen=new Set<string>();beam=[];
      for(const state of next) {
        const key=[...state.used].sort().join("|");
        if(seen.has(key))continue;
        seen.add(key);beam.push(state);
        if(beam.length>=beamWidth)break;
      }
      if(!beam.length)break;
    }
    for(const state of beam) if(state.picks.length===5) {
      candidates.push(result([...state.picks].sort((a,b)=>footballSlots.indexOf(a.slot)-footballSlots.indexOf(b.slot))));
    }
  }
  return dedupe(advanced?candidates.filter(line=>satisfiesV30Constraints(line.picks,opts.sport,advanced)&&reachesV30Minimum(line,opts.sport,advanced)):candidates,limit,strategy,opts.targetScore,advanced);
}

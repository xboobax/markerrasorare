import type {OptimizedLineup} from './arcade';
export type LineupDifference={shared:number;changed:number;added:string[];removed:string[];pointsDifference:number};
export function compareOptimizedLineups(baseline:OptimizedLineup,other:OptimizedLineup):LineupDifference{
  const before=new Map(baseline.picks.map(p=>[p.player.id,p.player.name]));
  const after=new Map(other.picks.map(p=>[p.player.id,p.player.name]));
  return {shared:[...before.keys()].filter(id=>after.has(id)).length,
    changed:[...after.keys()].filter(id=>!before.has(id)).length,
    added:[...after.entries()].filter(([id])=>!before.has(id)).map(([,name])=>name),
    removed:[...before.entries()].filter(([id])=>!after.has(id)).map(([,name])=>name),
    pointsDifference:other.projectedScore-baseline.projectedScore};
}

/** V3.5: browser-local named optimization presets. No account tokens or cards are copied. */
import type {Sport} from './model';
import type {Strategy} from './arcade';
import {restoreV30State,type BuilderV30State} from './builder-v30';
import type {NbaStarsMode,NbaLineupDiversity} from './nba-stars-optimizer';
export type ForecastMode='v3'|'v2'|'v18'|'classic';
export type OptimizationPreset={id:string;name:string;sport:Sport;settings:BuilderV30State;strategy:Strategy;
  nbaMode:NbaStarsMode;diversity:NbaLineupDiversity;modelMode:ForecastMode;ownedOnly:boolean;createdAt:string};
export const presetStorageKey=(sport:Sport)=>`neon:optimizer-presets-v35.${sport}`;
const record=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const allowed=(x:unknown,values:readonly string[],fallback:string)=>typeof x==='string'&&values.includes(x)?x:fallback;
export function readOptimizerPresets(value:unknown,sport:Sport):OptimizationPreset[]{
  if(!Array.isArray(value))return [];
  const seen=new Set<string>();const out:OptimizationPreset[]=[];
  for(const item of value){
    if(!record(item)||item.sport!==sport||typeof item.id!=='string'||!/^preset-[a-z0-9-]{1,50}$/.test(item.id)||seen.has(item.id))continue;
    if(typeof item.name!=='string'||!item.name.trim()||item.name.length>45)continue;
    seen.add(item.id);
    out.push({id:item.id,name:item.name.trim(),sport,settings:restoreV30State(item.settings),
      strategy:allowed(item.strategy,['balanced','safe','upside','target'],'balanced') as Strategy,
      nbaMode:allowed(item.nbaMode,['max','value','safe','upside'],'max') as NbaStarsMode,
      diversity:([1,2,3] as unknown[]).includes(item.diversity)?item.diversity as NbaLineupDiversity:2,
      modelMode:allowed(item.modelMode,['v3','v2','v18','classic'],'v2') as ForecastMode,
      ownedOnly:item.ownedOnly===true,
      createdAt:typeof item.createdAt==='string'&&Number.isFinite(Date.parse(item.createdAt))?item.createdAt:new Date(0).toISOString()});
    if(out.length>=12)break;
  }return out;
}
export function saveOptimizerPreset(items:OptimizationPreset[],preset:OptimizationPreset):OptimizationPreset[]{
  return readOptimizerPresets([preset,...items.filter(x=>x.id!==preset.id)],preset.sport).slice(0,12);
}
export const deleteOptimizerPreset=(items:OptimizationPreset[],id:string)=>items.filter(item=>item.id!==id);

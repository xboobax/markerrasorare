/** Four football optimization profiles with a measured diversity trade-off.
 * Keeps all existing position, card ownership and V3 advanced rules via the
 * shared optimizeArcadeLineups engine. Never relaxes game eligibility. */
import {optimizeArcadeLineups,type CardInput,type OptimizeOptions,type OptimizedLineup} from './arcade';
export type FootballOptimizerMode='max'|'value'|'safe'|'upside';
export type FootballLineupDiversity=1|2|3;
export const FOOTBALL_OPTIMIZER_MODES=[
  {id:'max',label:'Max Points',detail:'Höchste prognostizierte Punktzahl'},
  {id:'value',label:'Smart Balance',detail:'Starke Prognose bei besserer Einsatzsicherheit'},
  {id:'safe',label:'Safety First',detail:'Höheres Floor-Potenzial'},
  {id:'upside',label:'High Ceiling',detail:'Höheres Ceiling-Potenzial'},
] as const;
export type FootballOptimizerVariant={mode:FootballOptimizerMode;lineup:OptimizedLineup;changedFromMax:number;minChangesToOthers:number;meetsDiversity:boolean;lossPercent:number};
export type FootballOptimizerBoard={variants:FootballOptimizerVariant[];referenceScore:number;availablePlayers:number;note:string;unmetDiversity:FootballOptimizerMode[]};
const key=(line:OptimizedLineup)=>line.picks.map(p=>p.player.id).sort().join('|');
const difference=(a:OptimizedLineup,b:OptimizedLineup)=>{
  const ids=new Set(a.picks.map(p=>p.player.id));return b.picks.filter(p=>!ids.has(p.player.id)).length;
};
const objective=(l:OptimizedLineup,mode:FootballOptimizerMode):number=>{
  if(mode==='safe')return l.floorScore;
  if(mode==='upside')return l.ceilingScore;
  if(mode==='value')return l.floorScore*.55+l.projectedScore*.45;
  return l.projectedScore;
};
export function buildFootballOptimizer(cards:CardInput[],opts:OptimizeOptions,diversity:FootballLineupDiversity=2):FootballOptimizerBoard{
  const mode:FootballOptimizerMode[]=['max','value','safe','upside'];
  // Bound work per profile so the optimizer does not block a tab switch with a large roster.
  const searchOptions={...opts,limit:12,beamWidth:Math.min(180,opts.beamWidth??180),maxCandidatesPerSlot:Math.min(85,opts.maxCandidatesPerSlot??85)};
  const qualified=new Map<string,OptimizedLineup>();
  for(const strategy of ['balanced','safe','upside'] as const){
    for(const l of optimizeArcadeLineups(cards,{...searchOptions,sport:'football',strategy}))qualified.set(key(l),l);
  }
  const pool=[...qualified.values()];
  const max=[...pool].sort((a,b)=>b.projectedScore-a.projectedScore||key(a).localeCompare(key(b)))[0];
  if(!max)return {variants:[],referenceScore:0,availablePlayers:cards.length,unmetDiversity:mode,
    note:'Kein gültiges Fußball-Lineup (TW, VER, MF, ST, Extra) innerhalb des gewählten Zeitraums.'};
  const threshold=Math.max(0,Math.min(3,diversity));
  const picked:FootballOptimizerVariant[]=[];
  const unmet:FootballOptimizerMode[]=[];
  for(const m of mode){
    const sorted=[...pool].filter(l=>m==='max'?key(l)===key(max):
      key(l)!==key(max)&&l.projectedScore>=max.projectedScore*.9)
      .sort((a,b)=>objective(b,m)-objective(a,m)||b.projectedScore-a.projectedScore||key(a).localeCompare(key(b)));
    const valid=sorted.find(l=>picked.every(prev=>difference(prev.lineup,l)>=threshold));
    // Where a distinct team cannot be constructed, do not claim compliance.
    const fallback=valid??sorted.find(l=>!picked.some(prev=>key(prev.lineup)===key(l)))??null;
    if(!fallback){if(m!=='max')unmet.push(m);continue;}
    if(!valid)unmet.push(m);
    picked.push({mode:m,lineup:fallback,changedFromMax:difference(max,fallback),minChangesToOthers:picked.length?Math.min(...picked.map(p=>difference(p.lineup,fallback))):5,
      meetsDiversity:!!valid,lossPercent:Math.max(0,(max.projectedScore-fallback.projectedScore)/Math.max(1,max.projectedScore)*100)});
  }
  return {variants:picked,referenceScore:max.projectedScore,availablePlayers:cards.length,unmetDiversity:unmet,
    note:unmet.length?'Nicht alle Diversity-Ziele erreichbar. Nur vorhandene, positionsgültige Teams angezeigt.':'Alle angezeigten Varianten erfüllen die ausgewählten Regeln.'};
}

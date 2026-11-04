import {estimateTargetChance} from "./target-probability";
import type {ManualLineupResult} from "./manual-lineup";
import type {Sport} from "./model";
import type {OptimizedLineup} from "./arcade";
import type {AvailabilityReport} from "./availability";
import type {OwnedSorareCard} from "./my-collection";

/** The selected football competition in this helper uses a fixed +50% captain modifier. NBA has no captain. */
export const FOOTBALL_CAPTAIN_BONUS = 0.5;
export type CaptainMode = "projection"|"safety";

export function smartCaptain(result:ManualLineupResult, reports:Record<string,AvailabilityReport>,mode:CaptainMode="projection"){
  if(!result.picks.length)return null;
  const allowed=result.picks.filter(p=>reports[p.player.id]?.status!=="out");
  const candidates=allowed;
  if(!candidates.length)return null;
  return [...candidates].sort((a,b)=>{
    const value=(pick:typeof a)=>{
      const status=reports[pick.player.id]?.status;
      const risk=status==="doubtful"?.22:status==="questionable"?.60:status==="out"?0:1;
      // Weighted is already an unconditional Sorare expectation (avoid multiplying by playProb twice).
      // Captain adds 50% of the underlying Sorare score; do not rank using an existing card bonus.
      const score=mode==="safety"?pick.player.floor*pick.player.playProb:pick.player.weighted;
      return score * (mode==="safety"?risk:1);
    };
    return value(b)-value(a)||a.player.id.localeCompare(b.player.id);
  })[0]?.player.id??null;
}
export function captainForTeam(result:ManualLineupResult,manualId:string|null|undefined,reports:Record<string,AvailabilityReport>,mode:CaptainMode="projection"){
  return manualId&&result.picks.some(p=>p.player.id===manualId)?manualId:smartCaptain(result,reports,mode);
}
export function captainLineup(result:ManualLineupResult,sport:Sport,captainId:string|null,target:number|null):ManualLineupResult{
  if(sport==="nba")return result;
  const captain=result.picks.find(p=>p.player.id===captainId);
  if(!captain)return {...result,valid:false,errors:[...result.errors,"Fußball: Ein Kapitän muss ausgewählt werden."],targetProbability:null};
  const augmented=result.picks.map(p=>p.player.id===captainId?{
    ...p, bonusPercent:p.bonusPercent+FOOTBALL_CAPTAIN_BONUS*100,
    projectedScore:p.projectedScore+p.player.weighted*FOOTBALL_CAPTAIN_BONUS,
    floorScore:p.floorScore+p.player.floor*p.player.playProb*FOOTBALL_CAPTAIN_BONUS,
    ceilingScore:p.ceilingScore+p.player.ceiling*p.player.playProb*FOOTBALL_CAPTAIN_BONUS,
  }:p);
  const replacement=augmented.find(p=>p.player.id===captainId)!;
  return {...result,picks:augmented,slots:result.slots.map(p=>p?.player.id===captainId?replacement:p),
    projectedScore:augmented.reduce((n,p)=>n+p.projectedScore,0),
    floorScore:augmented.reduce((n,p)=>n+p.floorScore,0),
    ceilingScore:augmented.reduce((n,p)=>n+p.ceilingScore,0),
    // If baseline probability was intentionally unavailable due to missing data, keep it unavailable.
    targetProbability:result.targetProbability===null||!result.valid||target===null?null:estimateTargetChance(augmented,target)};
}
export function captainExtra(result:ManualLineupResult,captainId:string|null):number{
  return (result.picks.find(p=>p.player.id===captainId)?.player.weighted??0)*FOOTBALL_CAPTAIN_BONUS;
}
export function swapPreview(args:{result:ManualLineupResult;sport:Sport;captainId:string|null;replacement:ManualLineupResult;replacementCaptain:string|null;target:number|null}){
  const from=captainLineup(args.result,args.sport,args.captainId,args.target);
  const to=captainLineup(args.replacement,args.sport,args.replacementCaptain,args.target);
  return {valid:to.valid,delta:to.projectedScore-from.projectedScore,
    floorDelta:to.floorScore-from.floorScore,ceilingDelta:to.ceilingScore-from.ceilingScore,
    starDelta:to.starsUsed-from.starsUsed,riskDelta:to.errors.length+to.warnings.length-from.errors.length-from.warnings.length,
    captainChanged:args.sport==="football"&&args.captainId!==args.replacementCaptain};
}
export function cardsForPlayer(cards:OwnedSorareCard[]|undefined,sport:Sport,playerId:string):OwnedSorareCard[]{
  return (cards??[]).filter(c=>c.playerSlug===playerId&&c.sport===(sport==="nba"?"NBA":"FOOTBALL"))
    .sort((a,b)=>a.rarity.localeCompare(b.rarity)||String(b.seasonYear??"").localeCompare(String(a.seasonYear??"")));
}
export function chooseCardAsset(options:OwnedSorareCard[],stored:string|undefined){
  if(!options.length)return null;
  return options.find(c=>c.assetId===stored)??options[0];
}
export const defaultColumns=["date","status","games","matchup","form","play","l5","l10","projection","floor","ceiling","stars","value","bonus","card"] as const;
export type ColumnKey=typeof defaultColumns[number];
export const columnsLabels:Record<ColumnKey,string>={date:"Datum",status:"Ausfälle",games:"Spiele",matchup:"Gegnerstärke",form:"Form",play:"Einsatz",l5:"L5",l10:"L10",projection:"Prognose",floor:"Floor",ceiling:"Ceiling",stars:"Sterne",value:"Wert/★",bonus:"Bonus",card:"Karte"};
export function columnsForPreset(preset:"all"|"compact"|"scouting",sport:Sport):ColumnKey[]{
  if(preset==="compact")return ["date","status","projection",...(sport==="nba"?["stars" as const]:["bonus" as const]),"card"];
  if(preset==="scouting")return ["date","status","matchup","form","play","l5","l10","projection","floor","ceiling",...(sport==="nba"?["games" as const,"stars" as const]:["bonus" as const])];
  return defaultColumns.filter(k=>sport==="nba"?k!=="bonus":k!=="games"&&k!=="stars"&&k!=="value");
}

/** Suggest a captain on an automatic football lineup without touching the base Sorare optimizer. */
export function automaticCaptainLineup(lineup:OptimizedLineup|null,sport:Sport,reports:Record<string,AvailabilityReport>,target:number|null,manualCaptain:string|null=null){
  if(!lineup||sport==="nba")return {lineup,captainId:null,extra:0};
  const picks=lineup.picks;
  const available=picks.filter(p=>reports[p.player.id]?.status!=="out");
  const recommendation=[...available].sort((a,b)=>b.player.weighted-a.player.weighted)[0]?.player.id??null;
  const captainId=manualCaptain&&picks.some(p=>p.player.id===manualCaptain)?manualCaptain:recommendation;
  const selected=picks.find(p=>p.player.id===captainId);
  if(!selected)return {lineup,captainId:null,extra:0};
  const expanded=picks.map(p=>p.player.id===captainId?{...p,bonusPercent:p.bonusPercent+50,
    projectedScore:p.projectedScore+p.player.weighted*.5,
    floorScore:p.floorScore+p.player.floor*p.player.playProb*.5,
    ceilingScore:p.ceilingScore+p.player.ceiling*p.player.playProb*.5}:p);
  const output:OptimizedLineup={...lineup,picks:expanded,
    projectedScore:expanded.reduce((n,p)=>n+p.projectedScore,0),
    floorScore:expanded.reduce((n,p)=>n+p.floorScore,0),
    ceilingScore:expanded.reduce((n,p)=>n+p.ceilingScore,0),
    targetProbability:target!==null&&lineup.targetProbability!==null?estimateTargetChance(expanded,target):null};
  return {lineup:output,captainId,extra:selected.player.weighted*.5};
}

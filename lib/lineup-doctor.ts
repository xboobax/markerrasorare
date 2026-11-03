import {ARCADE} from "../config/divination";
import {isValidNbaStars,slotAccepts,type CardInput} from "./arcade";
import {assessLineup} from "./lineup-intelligence";
import {evaluateManualLineup,normalizeManualSelection,type ManualSelection} from "./manual-lineup";
import type {Forecast,Sport} from "./model";

export type DoctorIssue={id:string;severity:"critical"|"warning"|"info";title:string;description:string};
export type DoctorSwap={slotIndex:number;fromId:string;fromName:string;toId:string;toName:string;toTeam:string;
  projectedBefore:number;projectedAfter:number;delta:number;starsBefore:number;starsAfter:number;
  riskBefore:number;riskAfter:number;kind:"repair"|"safer"|"upgrade";reason:string;owned:boolean};
export type DoctorReport={status:"incomplete"|"invalid"|"attention"|"ready";issues:DoctorIssue[];swaps:DoctorSwap[];checks:number;verified:number};

function supported(p:Forecast):boolean {
  return p.forecastSources.length>0 && (p.sampleSize>0 || p.avg!==null || p.proj!==null || p.last5Avg!==null || p.last10Avg!==null);
}
/** Strictly heuristic risk points from the player data already loaded. */
export function doctorRisk(p:Forecast):number {
  let risk=0;
  if(p.hasGame===false)risk+=5;
  if(p.hasGame===null)risk+=0.5; // unknown, not a confirmed absence
  if(p.playProb<0.45)risk+=4;
  else if(p.playProb<0.65)risk+=2;
  if(p.injuries>0)risk+=3;
  if(p.confidence==="gering" || !supported(p))risk+=2.5;
  return risk;
}

/** Every suggested replacement is re-evaluated with the established arcade validator. */
export function diagnoseLineup(selection:ManualSelection,cards:CardInput[],sport:Sport,targetScore:number|null,options:{ownedOnly?:boolean;limit?:number}={}):DoctorReport {
  const ids=normalizeManualSelection(selection);
  const current=evaluateManualLineup(ids,cards,sport,targetScore);
  const issues:DoctorIssue[]=assessLineup(current,sport,targetScore).filter(i=>i.tone!=="success").map(i=>({
    id:i.id,severity:i.tone==="warning"?"warning":"info",title:i.title,description:i.description,
  }));
  if(current.errors.length)issues.unshift({id:"invalid",severity:"critical",title:"Regelprüfung fehlgeschlagen",
    description:`${current.errors.length} Regelhinweis(e) – ein Wechsel darf nur eine tatsächlich gültige Aufstellung ergeben.`});
  const unknownFixture=current.picks.filter(p=>p.player.hasGame===null).length;
  if(unknownFixture)issues.push({id:"unknown-fixtures",severity:"info",title:`${unknownFixture} Spieltermine nicht bestätigt`,
    description:"Unbekannt bedeutet nicht spielfrei. Prüfe den offiziellen Spieltag vor dem Lock."});
  const risks=current.picks.reduce((sum,p)=>sum+doctorRisk(p.player),0);
  const swaps:DoctorSwap[]=[];
  if(current.complete && current.picks.length===5){
    const required=sport==="nba"?ARCADE.nba.slots:ARCADE.football.slots;
    const selected=new Set(ids.filter((id):id is string=>!!id));
    const bySlot:DoctorSwap[]=[];
    for(let index=0;index<5;index++){
      const original=current.slots[index];
      if(!original)continue;
      const oldRisk=doctorRisk(original.player);
      for(const candidate of cards){
        const p=candidate.player;
        if(selected.has(p.id)||!slotAccepts(required[index],p.position)||p.hasGame===false ||
          p.playProb<0.55 || !supported(p) || (options.ownedOnly&&!candidate.owned))continue;
        if(sport==="nba"&&!isValidNbaStars(candidate.stars))continue;
        const revised=[...ids];revised[index]=p.id;
        const next=evaluateManualLineup(revised,cards,sport,targetScore);
        if(!next.valid)continue; // rejects stars >16, duplicate, illegal slot, missing stars
        const delta=next.projectedScore-current.projectedScore;
        const newRisk=doctorRisk(p);
        const reduction=oldRisk-newRisk;
        const repair=!current.valid;
        if(!repair && delta<=0.15 && !(reduction>=2 && delta>=-4))continue;
        const kind=repair?"repair":reduction>=2&&delta<2?"safer":"upgrade";
        const reason=kind==="repair"?"Mögliche Reparatur der gesamten Aufstellung":kind==="safer"?
          "Geringeres geschätztes Risiko; mögliche Punkte-Einbuße beachten":"Höherer prognostizierter Gesamtscore";
        bySlot.push({slotIndex:index,fromId:original.player.id,fromName:original.player.name,
          toId:p.id,toName:p.name,toTeam:p.team,projectedBefore:current.projectedScore,
          projectedAfter:next.projectedScore,delta,starsBefore:current.starsUsed,starsAfter:next.starsUsed,
          riskBefore:oldRisk,riskAfter:newRisk,kind,reason,owned:!!candidate.owned});
      }
    }
    // Prioritize repairs, then risk reduction and projected gain; only one proposal per slot.
    bySlot.sort((a,b)=>Number(b.kind==="repair")-Number(a.kind==="repair") ||
      (b.riskBefore-b.riskAfter)*2+b.delta/10-((a.riskBefore-a.riskAfter)*2+a.delta/10));
    const usedSlots=new Set<number>();const usedPlayers=new Set<string>();
    for(const swap of bySlot){
      if(usedSlots.has(swap.slotIndex)||usedPlayers.has(swap.toId))continue;
      swaps.push(swap);usedSlots.add(swap.slotIndex);usedPlayers.add(swap.toId);
      if(swaps.length>=Math.max(1,Math.min(5,options.limit??3)))break;
    }
  }
  const verified=current.picks.filter(p=>supported(p.player)&&p.player.hasGame!==false&&p.player.playProb>=0.65).length;
  const status=!current.complete?"incomplete":!current.valid?"invalid":
    issues.some(issue=>issue.severity==="warning")||risks>=4?"attention":"ready";
  return {status,issues,swaps,checks:current.picks.length,verified};
}

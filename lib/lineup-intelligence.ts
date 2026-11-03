import {ARCADE} from "../config/divination";
import {slotAccepts, type CardInput} from "./arcade";
import {evaluateManualLineup, normalizeManualSelection, type ManualLineupResult, type ManualSelection} from "./manual-lineup";
import type {Sport} from "./model";

/** No API calls: this module only evaluates the already loaded, user-selected players. */
export type AssistantFinding = {id:string; tone:"success"|"warning"|"info"; title:string; description:string};

export function firstEligibleEmptySlot(selection:ManualSelection, cards:CardInput[], sport:Sport, playerId:string): number|null {
  const chosen=normalizeManualSelection(selection);
  if(chosen.includes(playerId))return null;
  const player=cards.find(c=>c.player.id===playerId)?.player;
  if(!player)return null;
  const slots=sport==="nba"?ARCADE.nba.slots:ARCADE.football.slots;
  const next=slots.findIndex((slot,index)=>!chosen[index] && slotAccepts(slot,player.position));
  return next>=0?next:null;
}

export function assessLineup(lineup:ManualLineupResult, sport:Sport, targetScore:number|null):AssistantFinding[] {
  const findings:AssistantFinding[]=[];
  if(!lineup.complete){
    findings.push({id:"slots",tone:"info",title:`${5-lineup.picks.length} Positionen offen`,description:"Vervollständige deine Aufstellung. Der Assistant ersetzt niemanden ohne deine Auswahl."});
  }
  if(sport==="nba"){
    const budget=ARCADE.nba.maxStars;
    if(lineup.starsUsed>budget)findings.push({id:"budget",tone:"warning",title:"Sterne-Limit überschritten",description:`${lineup.starsUsed.toFixed(1)} von ${budget} Sternen. Passe die NBA-Karten an.`});
    else if(lineup.complete && lineup.valid)findings.push({id:"budget",tone:"success",title:`Sterne-Budget eingehalten`,description:`${lineup.starsUsed.toFixed(1)} / ${budget} Sterne. Maßgeblich sind die manuell eingetragenen Sterne.`});
  }
  if(lineup.errors.some(message=>/Sterne|Sternelimit/.test(message)) && !findings.some(f=>f.id==="budget")){
    findings.push({id:"stars",tone:"warning",title:"Sterneangaben fehlen oder sind ungültig",description:"Trage bei jeder NBA-Karte einen gültigen Wert in 0,5er-Schritten ein. Die Berechnung nutzt deine Eingaben."});
  }
  if(lineup.errors.some(message=>/Slot|mehrfach|nicht geladen/.test(message))){
    findings.push({id:"rules",tone:"warning",title:"Aufstellung noch nicht regelkonform",description:"Prüfe die Positions- und Dublettenhinweise unter deiner Aufstellung."});
  }
  const unconfirmed=lineup.warnings.filter(message=>message.includes("Kartenbesitz nicht bestätigt")).length;
  if(unconfirmed) findings.push({id:"ownership",tone:"info",title:`${unconfirmed} Karten nicht als eigene markiert`,description:"Die tatsächliche Sorare-Spielberechtigung und deinen Kartenbesitz kann der Helper noch nicht automatisch bestätigen."});
  const hasNoFixture=lineup.picks.filter(p=>p.player.hasGame===false);
  if(hasNoFixture.length)findings.push({id:"fixtures",tone:"warning",title:`${hasNoFixture.length} Spieler ohne gemeldetes Spiel`,description:`Prüfe den Spieltag: ${hasNoFixture.slice(0,2).map(p=>p.player.name).join(", ")}${hasNoFixture.length>2?" …":""}.`});
  const hasLowPlay=lineup.picks.filter(p=>p.player.playProb<0.6 && p.player.hasGame!==false);
  if(hasLowPlay.length)findings.push({id:"dnp",tone:"warning",title:`${hasLowPlay.length} Spieler mit Einsatzrisiko`,description:"Die angezeigte Einsatzchance ist eine Modellschätzung, keine bestätigte Startaufstellung."});
  const hasWeakData=lineup.picks.filter(p=>p.player.confidence==="gering" || p.player.forecastSources.length===0);
  if(hasWeakData.length)findings.push({id:"scores",tone:"warning",title:`${hasWeakData.length} Spieler mit dünner Score-Datenlage`,description:"Fehlende Scores nicht als echte Null-Prognose interpretieren."});
  if(targetScore!==null && Number.isFinite(targetScore) && targetScore>0 && lineup.valid){
    const diff=lineup.projectedScore-targetScore;
    findings.push({id:"goal",tone:diff>=0?"success":"info",title:diff>=0?"Prognose über dem Score-Ziel":"Prognose unter dem Score-Ziel",description:`Abstand: ${diff>=0?"+":""}${diff.toFixed(1)} Punkte. Geschätzte Zielwahrscheinlichkeit ist nicht kalibriert.`});
  }
  if(lineup.complete && lineup.valid && !findings.some(f=>f.tone==="warning"))findings.push({id:"state",tone:"success",title:"Keine auffälligen Risikohinweise",description:"Nur anhand der vorhandenen Daten beurteilt; die endgültigen Arcade-Regeln bitte auf Sorare prüfen."});
  return findings;
}

export function duplicateToFreePreset(presets:Record<string,ManualSelection>, selection:ManualSelection): {presets:Record<string,ManualSelection>; key:string|null} {
  const free=["1","2","3"].find(key=>!presets[key]);
  if(!free)return {presets,key:null};
  return {presets:{...presets,[free]:normalizeManualSelection(selection)},key:free};
}

/**
 * Sorare Football STANDARD scoring rules – source-driven model, 2026.
 *
 * Sources:
 *   https://help.sorare.com/hc/en-us/articles/4402904001809-How-does-scoring-work-in-Sorare-Football
 *   https://help.sorare.com/hc/article_attachments/33844626528925 (2022-position matrix)
 *   https://help.sorare.com/hc/article_attachments/33844656986397 (decisive levels)
 *   https://sorare.com/blog/football/sorare-26-prize-pools-competition-structure-more-details
 *
 * Sorare 26 supersedes the 2022 goalkeeper goals-conceded (-3 -> -5)
 * and removes the old '3 goals conceded' NEGATIVE decisive event.
 * Penalty won +3 AAS when scored is distinct from the positive decisive event.
 *
 * IMPORTANT: This library can reproduce matrix math when every Opta-equivalent
 * event is provided with verified definitions. ESPN boxscores are NOT equivalent
 * to Sorare's data partner: an incomplete model result MUST NEVER be labeled an
 * official Sorare score or sent to learning as ground truth.
 */

export type SorareFootballPosition='GK'|'DEF'|'MID'|'FWD';
export type SorareAAStat=
  | 'yellowCards'|'foulsCommitted'|'wasFouled'|'errorLeadsToShot'
  | 'cleanSheetDefender'|'goalsConceded'|'effectiveClearances'|'wonTackles'|'blockedCrosses'|'outfieldBlocks'
  | 'possessionLost'|'possessionWon'|'duelsLost'|'duelsWon'|'interceptionsWon'
  | 'bigChancesCreated'|'attemptedAssists'|'accuratePasses'|'finalThirdPasses'
  | 'accurateLongBalls'|'longPassesIntoOpposition'|'missedPasses'
  | 'shotsOnTarget'|'wonContests'|'penaltyAreaEntries'|'missedPenalties'|'bigChancesMissed'
  | 'saves'|'savesInBox'|'goodHighClaims'|'punches'|'diveSaves'|'diveCatches'
  | 'crossesNotClaimed'|'sixSecondViolations'|'gkSmothers'|'accurateKeeperSweepers'
  | 'penaltiesWonScoredAA' ;
export type SorareDecisiveStat=
  | 'goals'|'assists'|'penaltiesWonScored'|'clearancesOffLine'|'goalkeeperCleanSheet'
  | 'penaltiesSaved'|'lastManTackles'|'redCards'|'ownGoals'|'penaltiesConceded'|'errorsLeadingToGoals';
export type SorareScoringInputs=Partial<Record<SorareAAStat|SorareDecisiveStat|'netDuels'|'minutesPlayed',number>>;
export type SorareFieldContribution={key:SorareAAStat;value:number;weight:number;points:number};
export type SorareOfficialMatrixOutput={
  level:number|null;decisive:number|null;allAround:number|null;total:number|null;multiBonus:number|null;
  observedAllAround:number;knownAA:number;requiredAA:number;
  missingAA:Array<SorareAAStat|'defensiveMultiBonus'>;missingDecisive:SorareDecisiveStat[];
  completeness:'partial'|'complete-unverified';
  contributions:SorareFieldContribution[];
};

/** Order: GK, DEF, MID, FWD. 0 means the stat is not scored in that role. */
export const SORARE_AA_MATRIX:Readonly<Record<SorareAAStat,readonly [number,number,number,number]>>={
  yellowCards:[-3,-3,-3,-3],
  foulsCommitted:[-1,-2,-1,-0.5],
  wasFouled:[0,0,1,1],
  errorLeadsToShot:[-5,-5,-3,-3],
  cleanSheetDefender:[0,10,0,0],
  goalsConceded:[-5,-4,-2,0],
  effectiveClearances:[0,0.5,0,0],
  wonTackles:[0,3,3,0],
  blockedCrosses:[0,1,1,0],
  outfieldBlocks:[0,2,1,0],
  possessionLost:[-0.3,-0.6,-0.5,-0.1],
  possessionWon:[0,0.5,0.5,0],
  duelsLost:[0,-2,-0.8,-1],
  duelsWon:[0,1.5,0.8,1],
  interceptionsWon:[0,3,3,3],
  bigChancesCreated:[3,3,3,3],
  attemptedAssists:[2,3,2,2],
  accuratePasses:[0.1,0.08,0.1,0.1],
  finalThirdPasses:[0.5,0.4,0.3,0.1],
  accurateLongBalls:[0.2,0.5,0.5,0],
  longPassesIntoOpposition:[0,0.5,0,0],
  missedPasses:[-0.2,-0.2,-0.3,0],
  shotsOnTarget:[3,3,3,3],
  wonContests:[0,0.5,0.5,0.5],
  penaltyAreaEntries:[0,0.5,0.5,0.5],
  missedPenalties:[-5,-5,-5,-5],
  bigChancesMissed:[-5,-5,-5,-5],
  saves:[2,0,0,0],
  savesInBox:[2,0,0,0],
  goodHighClaims:[1.5,0,0,0],
  punches:[1.5,0,0,0],
  diveSaves:[3,0,0,0],
  diveCatches:[3.5,0,0,0],
  crossesNotClaimed:[-3,0,0,0],
  sixSecondViolations:[-5,0,0,0],
  gkSmothers:[5,0,0,0],
  accurateKeeperSweepers:[3,0,0,0],
  penaltiesWonScoredAA:[3,3,3,3]
};

const positionIndex:Record<SorareFootballPosition,number>={GK:0,DEF:1,MID:2,FWD:3};
export const decisiveFields:readonly SorareDecisiveStat[]=[
  'goals','assists','penaltiesWonScored','clearancesOffLine','goalkeeperCleanSheet',
  'penaltiesSaved','lastManTackles','redCards','ownGoals','penaltiesConceded','errorsLeadingToGoals'
];
const decisiveForPosition=(p:SorareFootballPosition):SorareDecisiveStat[]=>decisiveFields.filter(key=>{
  if(key==='goalkeeperCleanSheet'||key==='penaltiesSaved')return p==='GK';
  if(key==='clearancesOffLine'||key==='lastManTackles')return p==='DEF';
  return true;
});

export function sorareDecisivePoints(level:number):number{
  if(level<=-3)return 0;
  if(level===-2)return 5;
  if(level===-1)return 15;
  if(level===0)return 35;
  if(level===1)return 60;
  if(level===2)return 70;
  if(level===3)return 80;
  if(level===4)return 90;
  return 100;
}
export function sorareDefensiveMultiBonus(interceptions:number,tackles:number,netDuels:number):number{
  const values=[interceptions,tackles,netDuels];
  if(values.every(value=>value>=3))return 12;
  if(values.every(value=>value>=2))return 6;
  if(values.filter(value=>value>=2).length>=2)return 4;
  return 0;
}
/** Cards add all applicable bonuses only AFTER the 0–100 player-score cap. */
export function sorareCardScore(playerScore:number,bonusPercent:number):number{
  if(!Number.isFinite(playerScore)||!Number.isFinite(bonusPercent))throw new Error('Ungültige Kartenwertung');
  return Math.round(Math.max(0,Math.min(100,playerScore))*(1+bonusPercent/100)*100)/100;
}
/**
 * Calculate complete standard matrix only when EVERY positively/negatively
 * scored field is known. Missing data is null, not zero.
 * `netDuels` is a net statistic and may be negative; use it to materialize the
 * separate multi-stat defender bonus only from FULL Opta-equivalent data.
 */
export function calculateSorareFootballMatrix(position:SorareFootballPosition,events:SorareScoringInputs,played:boolean):SorareOfficialMatrixOutput{
  const p=positionIndex[position];
  const missingAA:Array<SorareAAStat|'defensiveMultiBonus'>=[],contributions:SorareFieldContribution[]=[];
  let observedAA=0,requiredAA=0;
  for(const [key,values] of Object.entries(SORARE_AA_MATRIX) as [SorareAAStat,readonly [number,number,number,number]][]){
    const weight=values[p];if(weight===0)continue;requiredAA++;
    const count=events[key];
    if(typeof count!=='number'||!Number.isFinite(count)||count<0){missingAA.push(key);continue;}
    const points=Math.round(count*weight*10000)/10000;
    observedAA+=points;
    contributions.push({key,value:count,weight,points});
  }
  const multiRelevant=position!=='GK';
  const tripleKnown=multiRelevant&&['interceptionsWon','wonTackles','netDuels'].every(key=>typeof events[key as keyof SorareScoringInputs]==='number'&&Number.isFinite(events[key as keyof SorareScoringInputs]));
  const multiBonus=multiRelevant?(tripleKnown?sorareDefensiveMultiBonus(events.interceptionsWon!,events.wonTackles!,events.netDuels!):null):0;
  if(multiRelevant){requiredAA++;if(multiBonus===null)missingAA.push('defensiveMultiBonus');else observedAA+=multiBonus;}
  observedAA=Math.round(observedAA*10000)/10000;
  const cleanSheetReported=(events.goalkeeperCleanSheet??0)>0||(events.cleanSheetDefender??0)>0;
  const cleanSheetInvalid=cleanSheetReported&&!(typeof events.minutesPlayed==='number'&&events.minutesPlayed>=60);
  if(cleanSheetInvalid&&position==='DEF'&&!missingAA.includes('cleanSheetDefender'))missingAA.push('cleanSheetDefender');
  const requiredDS=decisiveForPosition(position);
  const missingDecisive=requiredDS.filter(key=>typeof events[key]!=='number'||!Number.isFinite(events[key])||(events[key] as number)<0);
  if(cleanSheetInvalid&&position==='GK'&&!missingDecisive.includes('goalkeeperCleanSheet'))missingDecisive.push('goalkeeperCleanSheet');
  let level:number|null=null,decisive:number|null=null;
  if(played&&missingDecisive.length===0){
    level=Number(events.goals??0)+Number(events.assists??0)+Number(events.penaltiesWonScored??0)
      +Number(events.clearancesOffLine??0)+Number(events.goalkeeperCleanSheet??0)
      +Number(events.penaltiesSaved??0)+Number(events.lastManTackles??0)
      -Number(events.redCards??0)-Number(events.ownGoals??0)
      -Number(events.penaltiesConceded??0)-Number(events.errorsLeadingToGoals??0);
    decisive=sorareDecisivePoints(level);
  }
  const allAround=played&&missingAA.length===0?observedAA:null;
  const total=played&&allAround!==null&&decisive!==null
    ? Math.round(Math.max(0,Math.min(100,decisive+(level!>=1?Math.max(0,allAround):allAround)))*100)/100:null;
  return {level,decisive,allAround,total,multiBonus,observedAllAround:observedAA,knownAA:contributions.length+(multiRelevant&&multiBonus!==null?1:0),requiredAA,missingAA,missingDecisive,
    completeness:total===null?'partial':'complete-unverified',contributions};
}

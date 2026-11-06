/** Public official Sorare FINAL football scoring. No estimates, no card bonuses. */
import {gql} from './sorare';
import type {FootballOfficialScore} from './football-stats-v4515';
const STAT_FIELDS=[
  'minsPlayed','goals','goalAssist','totalScoringAtt','ontargetScoringAtt','bigChanceCreated','bigChanceMissed',
  'totalPass','accuratePass','passAccuracy','successfulFinalThirdPasses','missedPass',
  'duelWon','duelLost','totalTackle','wonTackle','interceptionWon','totalClearance','effectiveClearance',
  'possWon','possLostCtrl','wonContest','penAreaEntries','crossAccuracy',
  'yellowCard','redCard','fouls','wasFouled','ownGoals','goalsConceded',
  'saves','savedIbox','penaltiesSaved','cleanSheet','cleanSheet60','lastManTackle',
  'accurateLongBalls','accurateKeeperSweeper','gkSmother','goodHighClaim','diveSave','diveCatch',
  'errorLeadToShot','errorLeadToGoal','clearanceOffLine','penaltyKickMissed','penaltyConceded',
  'assistPenaltyWon','attFreekickTotal','attPenGoal','attPenMiss','attPenPost','attPenTarget',
  'cornerTaken','crossNotClaimed','freekickCross','gameStarted','goalKicks','lostCorners',
  'parries','penaltySave','penaltyTaken','penaltyWon','punches','setPieceTaken',
  'shotAccuracy','shotEfficiency','singleGoalGame','sixSecondViolation','threeGoalsConceded'
] as const;
const GAME='id date competition { name } homeTeam { name } awayTeam { name }';
const SCORE='id score scoreStatus scoringVersion footballGame { '+GAME+' } allAroundScore decisiveScore { stat totalScore points } detailedScore { stat statValue points totalScore category }';
const OFFICIAL_QUERY=(slug:string,depth:number,withStats:boolean)=>`query FootballOfficialHistory {
  anyPlayer(slug: ${JSON.stringify(slug)}) {
    displayName
    allPlayerGameScores(first: ${depth}) { nodes {
      score scoreStatus ... on PlayerGameScore {
        ${SCORE} ${withStats?`footballPlayerGameStats { anyTeam { name } ${STAT_FIELDS.join(' ')} }`:''}
      }
    } }
  }
}`;
const obj=(v:unknown):Record<string,any>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,any>:{};
const str=(v:unknown)=>typeof v==='string'?v.trim():'';
const num=(v:unknown):number|null=>typeof v==='number'&&Number.isFinite(v)?v:null;
const validSlug=(v:string)=>/^[a-z0-9-]{2,130}$/.test(v);
export function parseOfficialSorareHistory(data:unknown,slug:string):FootballOfficialScore[]{
  if(!validSlug(slug))return [];
  const player=obj(obj(data).anyPlayer);const playerName=str(player.displayName);
  const nodes=obj(player.allPlayerGameScores).nodes;
  const out:FootballOfficialScore[]=[];const seen=new Set<string>();
  for(const n of Array.isArray(nodes)?nodes:[]){
    const score=obj(n),game=obj(score.footballGame);const date=str(game.date);
    const points=num(score.score),when=Date.parse(date);
    if(score.scoreStatus!=='FINAL'||points===null||points<0||points>100||
       !Number.isFinite(when)||!str(score.id)||!str(game.id)||!playerName)continue;
    if(seen.has(String(score.id)))continue;
    seen.add(String(score.id));
    const officialStats:Record<string,number>={};
    const stats=obj(score.footballPlayerGameStats);
    for(const key of STAT_FIELDS){const v=num(stats[key]);if(v!==null&&v>=0&&v<=1000)officialStats[key]=v;}
    const breakdown:Array<{stat:string;value:number;points:number;category:string}>=[];
    const scoreParts=Array.isArray(score.detailedScore)?score.detailedScore:[];
    for(const piece of scoreParts.slice(0,120)){
      const part=obj(piece),name=str(part.stat),value=num(part.statValue),point=num(part.totalScore);
      if(name&&value!==null&&point!==null)breakdown.push({stat:name.slice(0,80),value,
        points:point,category:str(part.category).slice(0,30)});
    }
    const decisiveValue=num(obj(score.decisiveScore).totalScore);
    const aa=num(score.allAroundScore);
    out.push({scoreId:str(score.id),slug,playerName,gameId:String(game.id),date:new Date(date).toISOString(),
      competition:str(obj(game.competition).name)||'Nicht ausgewiesen',
      home:str(obj(game.homeTeam).name)||'Unbekannt',away:str(obj(game.awayTeam).name)||'Unbekannt',
      team:str(obj(stats.anyTeam).name)||null,score:points,decisive:decisiveValue,allAround:aa,
      scoringVersion:num(score.scoringVersion),stats:officialStats,breakdown});
  }
  return out.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,40);
}
/** Tiered to avoid losing the actual FINAL score when optional stat fields disappear. */
export async function fetchOfficialSorareHistory(slug:string,limit=15):Promise<{rows:FootballOfficialScore[];warning:string|null}>{
  if(!validSlug(slug))throw new Error('Ungültiger Spieler-Slug');
  const depth=Math.max(1,Math.min(40,Math.floor(limit)));
  let last:unknown;
  for(const includeStats of [true,false]){
    try{
      const data=await gql(OFFICIAL_QUERY(slug,depth,includeStats),180);
      const rows=parseOfficialSorareHistory(data,slug);
      return {rows,warning:includeStats?null:'Sorare lieferte nur Scores, keine detaillierten Ereignisse.'};
    }catch(e){last=e;}
  }
  throw last instanceof Error?last:new Error('Sorare-Score-Feed nicht erreichbar');
}
export const OFFICIAL_SCORE_STAT_FIELDS:readonly string[]=STAT_FIELDS;

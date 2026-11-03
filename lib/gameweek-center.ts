import type {Player, Sport} from "./model";

/** Only a user-visible fixture date + teams provided by Sorare is accepted. */
export type UpcomingFixture = {
  id: string;
  date: string; // YYYY-MM-DD, without an invented kickoff time
  home: string;
  away: string;
  source: "Sorare" | "BALLDONTLIE";
  playerIds: string[];
};
export type ScheduleData = {
  fixtures: UpcomingFixture[];
  status: "available" | "not-configured" | "unavailable";
  source: "BALLDONTLIE" | null;
  note?: string;
};

const isDate = (v: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) &&
  new Date(`${v}T00:00:00Z`).toISOString().slice(0,10) === v;

export const isoDay = (d: Date) => d.toISOString().slice(0,10);
export const addIsoDays = (day:string,n:number):string => {
  if (!isDate(day)) throw new Error("Ungültiges Datum");
  const d=new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+n);return isoDay(d);
};

/** Date/teams are delivered by the existing Sorare.nextGame adapter. */
export function upcomingFootballFixtures(players: Pick<Player,"id"|"nextGame"|"hasGame">[],
  today: string, days=14): UpcomingFixture[] {
  if (!isDate(today)) return [];
  const end=addIsoDays(today,Math.max(1,Math.min(31,days)));
  const map=new Map<string,UpcomingFixture>();
  for (const p of players) {
    if (p.hasGame === false || !p.nextGame) continue;
    const match=/^(\d{4}-\d{2}-\d{2})\s+(.+?)\s+-\s+(.+)$/.exec(p.nextGame.trim());
    if (!match) continue;
    const [,date,home,away]=match;
    if (!isDate(date)||date<today||date>=end||!home||!away||home==="?"||away==="?") continue;
    const id=`football:${date}:${home}:${away}`;
    const old=map.get(id);
    if (old) {if (!old.playerIds.includes(p.id)) old.playerIds.push(p.id);}
    else map.set(id,{id,date,home,away,source:"Sorare",playerIds:[p.id]});
  }
  return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.home.localeCompare(b.home,"de"));
}

export function filteredFixtures(fixtures:UpcomingFixture[],today:string,days:number):UpcomingFixture[] {
  if (!isDate(today)) return [];
  const end=addIsoDays(today,days);
  return fixtures.filter(f=>isDate(f.date) && f.date>=today && f.date<end)
    .sort((a,b)=>a.date.localeCompare(b.date)||a.home.localeCompare(b.home,"de"));
}

export type ArcadeEvent = {
  result: "success" | "miss";
  at: string;
  levelBefore:number;
  livesBefore:number;
  targetBefore:number|null;
  completedBefore:number;
  attemptsBefore:number;
};
export type ArcadeBoard = {
  level:number;
  target:number|null;
  lives:number;
  maxLives:number;
  completed:number;
  attempts:number;
  history:ArcadeEvent[];
};
export const arcadeBoardKey = (sport:Sport) => `markerras.sorare.arcade-center.v20.${sport}`;
const integerIn=(v:unknown,min:number,max:number):v is number =>
  typeof v==="number" && Number.isInteger(v)&&v>=min&&v<=max;
const targetOk=(v:unknown):v is number|null => v===null || integerIn(v,1,10000);

/** The score/lives tracker is a manual notebook, never claims to sync with Sorare. */
export function freshArcadeBoard(sport:Sport):ArcadeBoard {
  return {level:1,target:sport==="football"?180:null,lives:4,maxLives:4,completed:0,attempts:0,history:[]};
}
export function readArcadeBoard(data:unknown,sport:Sport):ArcadeBoard {
  const fallback=freshArcadeBoard(sport);
  if (!data || typeof data!=="object" || Array.isArray(data)) return fallback;
  const x=data as Partial<ArcadeBoard>;
  const maxLives=integerIn(x.maxLives,1,10)?x.maxLives:4;
  const history=Array.isArray(x.history)?x.history.filter((event):event is ArcadeEvent=>{
    if (!event || typeof event!=="object")return false;
    const e=event as ArcadeEvent;
    return (e.result==="success"||e.result==="miss")&&typeof e.at==="string" &&
      integerIn(e.levelBefore,1,1000)&&integerIn(e.livesBefore,1,10)&&targetOk(e.targetBefore)&&
      integerIn(e.completedBefore,0,100000)&&integerIn(e.attemptsBefore,0,100000);
  }).slice(-30):[];
  return {level:integerIn(x.level,1,1000)?x.level:1,
    target:targetOk(x.target)?x.target:fallback.target,
    maxLives,lives:integerIn(x.lives,1,maxLives)?x.lives:maxLives,
    completed:integerIn(x.completed,0,100000)?x.completed:0,
    attempts:integerIn(x.attempts,0,100000)?x.attempts:0,history};
}
export function setBoardTarget(board:ArcadeBoard,target:number|null):ArcadeBoard {
  return {...board,target:targetOk(target)?target:board.target};
}
export function recordArcadeOutcome(board:ArcadeBoard,result:"success"|"miss",at:string):ArcadeBoard {
  const event:ArcadeEvent={result,at,levelBefore:board.level,livesBefore:board.lives,
    targetBefore:board.target,completedBefore:board.completed,attemptsBefore:board.attempts};
  const history=[...board.history,event].slice(-30);
  if(result==="success") return {...board,level:Math.min(1000,board.level+1),lives:board.maxLives,
    completed:board.completed+1,attempts:board.attempts+1,history};
  if(board.lives>1) return {...board,lives:board.lives-1,attempts:board.attempts+1,history};
  // Soccer arcade normally resets after the final life. NBA is a manually configurable board.
  return {...board,level:1,lives:board.maxLives,attempts:board.attempts+1,history};
}
export function undoArcadeOutcome(board:ArcadeBoard):ArcadeBoard {
  const last=board.history[board.history.length-1];
  if (!last) return board;
  return {...board,level:last.levelBefore,lives:last.livesBefore,target:last.targetBefore,
    completed:last.completedBefore,attempts:last.attemptsBefore,history:board.history.slice(0,-1)};
}

export function cardsSummary(cardStore:Record<string,{owned?:boolean;stars?:number|null;bonusPercent?:number}>,sport:Sport,
  loadedIds?:Set<string>) {
  let owned=0,missingStars=0,withBonus=0;
  for(const [id,card] of Object.entries(cardStore)) {
    if(loadedIds && !loadedIds.has(id)) continue;
    if(card?.owned!==true) continue;
    owned++;
    if(sport==="nba" && (typeof card.stars!=="number"||!Number.isFinite(card.stars)||card.stars<1||card.stars>5||Math.round(card.stars*2)!==card.stars*2)) missingStars++;
    if(typeof card.bonusPercent==="number"&&card.bonusPercent>0)withBonus++;
  }
  return {owned,missingStars,withBonus};
}

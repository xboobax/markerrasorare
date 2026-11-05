import type {FootballLivePlayer} from './football-live-core';

export type PitchSpot={player:FootballLivePlayer;x:number;y:number};
export type FormationLayout={spots:PitchSpot[];verified:boolean;formation:string|null;reason:string|null};
/** ESPN formationPlace is the ordered position within the verified lineup: GK=1,
 * then defensive line, midfield lines, and forwards from right to left. The
 * formation only determines how many players occupy each line; it must not
 * reassign a midfielder to a defender slot. */
const SHAPES:Readonly<Record<string,readonly number[]>>={
  '4-4-2':[4,4,2], '4-3-3':[4,3,3], '4-2-3-1':[4,2,3,1],
  '4-1-4-1':[4,1,4,1], '4-1-2-1-2':[4,1,2,1,2],
  '4-5-1':[4,5,1], '3-5-2':[3,5,2], '3-4-3':[3,4,3],
  '3-4-2-1':[3,4,2,1], '3-4-1-2':[3,4,1,2],
  '5-3-2':[5,3,2], '5-4-1':[5,4,1],
  '4-3-1-2':[4,3,1,2], '4-2-2-2':[4,2,2,2], '4-2-4':[4,2,4]
};
function orderedSlots(lineSizes:readonly number[]):number[][]{
  let next=2;
  return lineSizes.map(size=>Array.from({length:size},()=>next++));
}
export function normalizeFormation(raw:string|null|undefined):string|null{
  if(!raw)return null;
  const v=raw.replace(/[–—\s]/g,'').replace(/[^0-9-]/g,'');
  if(v.includes('-'))return v;
  if(/^\d{3,5}$/.test(v))return [...v].join('-');
  return null;
}
const validPlace=(p:FootballLivePlayer)=>Number.isInteger(p.formationPlace)&&Number(p.formationPlace)>=1&&Number(p.formationPlace)<=15;
/** Use ESPN/Opta formationPlace only when all eleven starter slots are unique.
 * Unconfirmed shapes can be shown in a separate roster, never as a fake tactical XI. */
export function footballFormationLayout(players:FootballLivePlayer[],formation:string|null,side:'left'|'right'):FormationLayout{
  const starters=players.filter(p=>p.starter);
  const normalized=normalizeFormation(formation);
  if(starters.length!==11)return {spots:[],verified:false,formation:normalized,reason:'Noch keine vollständige bestätigte Startelf'};
  if(starters.some(p=>!validPlace(p))||new Set(starters.map(p=>p.formationPlace)).size!==11)
    return {spots:[],verified:false,formation:normalized,reason:'ESPN liefert noch keine eindeutigen Formation-Plätze'};
  const lineSizes=normalized?SHAPES[normalized]:undefined;
  if(!lineSizes)return {spots:[],verified:false,formation:normalized,reason:'Taktische Formation von ESPN noch nicht unterstützt'};
  const tiers=orderedSlots(lineSizes);
  const all=[1,...tiers.flat()];
  if(new Set(all).size!==11||all.some(slot=>!starters.some(p=>p.formationPlace===slot)))
    return {spots:[],verified:false,formation:normalized,reason:'Formation und bestätigte Opta-Positionen stimmen nicht überein'};
  const rows=[[1],...tiers],spots:PitchSpot[]=[];
  for(let r=0;r<rows.length;r++){
    const row=rows[r];
    for(let k=0;k<row.length;k++){
      const player=starters.find(p=>p.formationPlace===row[k]);if(!player)continue;
      const x0=4.8+r*(40/Math.max(1,rows.length-1));
      const yFromTop=13+(k+1)*(74/(row.length+1));
      // Opta orders each row from the team's right to left. On a horizontal
      // pitch the two teams face opposite directions, so their right sides
      // appear on opposite vertical edges.
      const y=side==='left'?100-yFromTop:yFromTop;
      spots.push({player,x:side==='left'?x0:100-x0,y});
    }
  }
  return {spots,verified:true,formation:normalized,reason:null};
}
export function footballDisplayedMinutes(player:FootballLivePlayer,game:{status:string;period:number;clock:string;statusText:string}):{minutes:number|null;estimated:boolean}{
  if(player.stats?.minutes!==null&&player.stats?.minutes!==undefined)return {minutes:player.stats.minutes,estimated:false};
  if(!player.played&&!player.starter)return {minutes:null,estimated:false};
  if(game.status==='scheduled'||game.status==='delayed')return {minutes:null,estimated:false};
  const elapsed=game.status==='final'?(game.period>2?120:90):
    (/\d{1,3}/.test(game.clock)?Number(game.clock.match(/\d{1,3}/)?.[0]):
    Number(game.statusText.match(/\d{1,3}/)?.[0]));
  if(!Number.isFinite(elapsed)||elapsed<0)return {minutes:null,estimated:false};
  const start=player.entryMinute??(player.starter?0:null);
  if(start===null)return {minutes:null,estimated:false};
  const end=Math.min(player.exitMinute??elapsed,elapsed);
  return {minutes:Math.max(0,Math.min(120,end-start)),estimated:true};
}

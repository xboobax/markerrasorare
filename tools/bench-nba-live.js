/* Synthetic parser stress test; NOT a real browser, real gamecast, or CDN latency test. */
const {performance}=require('node:perf_hooks');
const {parseEspnPlays,espnStatLine,sorareNbaScore}=require('../.test-build/lib/nba-live-core');
const plays={plays:Array.from({length:650},(_,i)=>({id:String(i),sequenceNumber:i,text:'Defensive rebound',clock:{displayValue:'9:20'},period:{number:2},team:{id:'11'}}))};
const labels=['MIN','PTS','REB','AST','3PT','STL','BLK','TO'];
const stats=['33:10','21','7','8','2-5','2','0','3'];
const rounds=250,now=performance.now();
let total=0;
for(let i=0;i<rounds;i++){
  const p=parseEspnPlays(plays);
  const s=espnStatLine(labels,stats);
  total+=p.length+(s?sorareNbaScore(s):0);
}
const ms=Math.round((performance.now()-now)*10)/10;
console.log(`Synthetic NBA parser: ${rounds} × 650 plays + stat parse in ${ms} ms (checksum ${total})`);

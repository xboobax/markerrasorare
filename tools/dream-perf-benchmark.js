/* Synthetischer Microbenchmark für Such-/Sortier-/Index-Kosten.
 * Nicht als realer Browser-/Lighthouse-Wert interpretieren. */
const {performance}=require('node:perf_hooks');
const assert=require('node:assert/strict');
const sizes=[500,2500,8000];
for(const size of sizes){
  const players=Array.from({length:size},(_,i)=>({
    id:`nba-player-${i}`,name:`Spieler Nummer ${i}`,
    team:`Team ${i%30}`,position:['G','F','C'][i%3],
    weighted:(i*97%89)+((i%7)*.1),
  }));
  const cards=Array.from({length:Math.round(size*1.4)},(_,i)=>({playerId:`nba-player-${i%size}`,bonus:(i%16)/2}));
  const start=performance.now();
  const index=new Map();
  for(const card of cards){
    const previous=index.get(card.playerId);
    if(previous===undefined||card.bonus>previous)index.set(card.playerId,card.bonus);
  }
  const needle='Spieler Nummer 1'.toLowerCase();
  for(let round=0;round<40;round++){
    const filtered=players.filter(p=>p.name.toLowerCase().includes(needle)&&p.position!=='C').sort((a,b)=>b.weighted-a.weighted);
    assert(filtered.length>0);
    assert(index.has(filtered[0].id));
  }
  const elapsed=performance.now()-start;
  console.log(`${size} Spieler / ${cards.length} Karten · Index + 40x Suche/Sortierung: ${elapsed.toFixed(1)} ms (synthetisch)`);
}

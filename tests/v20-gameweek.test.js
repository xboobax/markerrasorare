const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {
  upcomingFootballFixtures,filteredFixtures,addIsoDays,arcadeBoardKey,
  freshArcadeBoard,recordArcadeOutcome,undoArcadeOutcome,readArcadeBoard,
  setBoardTarget,cardsSummary
}=require('../.test-build/lib/gameweek-center');
const one={id:'1',nextGame:'2026-11-06 Bayern Munich - Dortmund',hasGame:true};
const two={id:'2',nextGame:'2026-11-06 Bayern Munich - Dortmund',hasGame:true};
const duplicate={id:'2',nextGame:'2026-11-06 Bayern Munich - Dortmund',hasGame:true};
const gone={id:'3',nextGame:'2026-10-01 Bayern Munich - Dortmund',hasGame:true};
const invalid={id:'4',nextGame:'2026-11-07 ? - Dortmund',hasGame:true};
const noGame={id:'5',nextGame:'2026-11-06 Bayern Munich - Dortmund',hasGame:false};
const row=upcomingFootballFixtures([one,two,duplicate,gone,invalid,noGame],'2026-11-03',14);
assert.equal(row.length,1);assert.deepEqual(row[0].playerIds,['1','2']);
assert.equal(row[0].source,'Sorare');assert.equal(row[0].date,'2026-11-06');
assert.equal(filteredFixtures(row,'2026-11-03',3).length,0);
assert.equal(filteredFixtures(row,'2026-11-03',7).length,1);
assert.equal(addIsoDays('2026-12-31',1),'2027-01-01');
assert.equal(upcomingFootballFixtures([{...one,nextGame:'2026-02-30 X - Y'}],'2026-02-27').length,0);
let b=freshArcadeBoard('football');assert.equal(b.level,1);assert.equal(b.lives,4);assert.equal(b.target,180);
assert.equal(freshArcadeBoard('nba').target,null,'NBA goal must not be invented');
b=setBoardTarget(b,360);assert.equal(b.target,360);
b=recordArcadeOutcome(b,'miss','2026-11-04T14:00:00Z');assert.equal(b.lives,3);assert.equal(b.attempts,1);
b=recordArcadeOutcome(b,'success','2026-11-05T14:00:00Z');assert.equal(b.level,2);assert.equal(b.lives,4);assert.equal(b.completed,1);
b=undoArcadeOutcome(b);assert.equal(b.level,1);assert.equal(b.lives,3);assert.equal(b.attempts,1);
b=recordArcadeOutcome(recordArcadeOutcome(recordArcadeOutcome(b,'miss','a'),'miss','b'),'miss','c');
assert.equal(b.level,1,'Last life resets manual board');assert.equal(b.lives,4);
assert.equal(undoArcadeOutcome(b).lives,1);
assert.equal(readArcadeBoard({lives:-4,target:-5,level:-9,history:'x'},'football').lives,4);
assert.equal(readArcadeBoard({target:200,level:3,lives:2,maxLives:4},'football').target,200);
assert.equal(arcadeBoardKey('nba'),'markerras.sorare.arcade-center.v20.nba');
const cards={a:{owned:true,stars:3,bonusPercent:5},b:{owned:true,stars:null},c:{owned:false,stars:2}};
assert.deepEqual(cardsSummary(cards,'nba'),{owned:2,missingStars:1,withBonus:1});
assert.deepEqual(cardsSummary(cards,'nba',new Set(['a'])),{owned:1,missingStars:0,withBonus:1});
assert.deepEqual(cardsSummary(cards,'football'),{owned:2,missingStars:0,withBonus:1});
const ui=fs.readFileSync(path.join(__dirname,'../app/components/gameweek-center.tsx'),'utf8');
for(const feature of ['gameweek-center','onApplyTarget','recordArcadeOutcome','undoArcadeOutcome','upcomingFootballFixtures','onAddPlayer','gw-calendar','arcadeBoardKey']){
  assert.ok(ui.includes(feature),`Missing V2.0 feature ${feature}`);
}
const adapter=fs.readFileSync(path.join(__dirname,'../lib/sorare.ts'),'utf8');
assert.ok(adapter.includes('const NBA_AVERAGES'), 'Sorare score adapter changed unexpectedly');
console.log('V2.0 fixture deduplication, progression, undo, score goals, inventory and UI integration passed.');
(async ()=>{
  const {getNbaGameweekSchedule}=require('../.test-build/lib/nba-gameweek-feed');
  const oldKey=process.env.BALLDONTLIE_API_KEY,originalFetch=global.fetch;
  try {
    delete process.env.BALLDONTLIE_API_KEY;
    const missing=await getNbaGameweekSchedule(new Date('2026-11-03T12:00:00Z'));
    assert.equal(missing.status,'not-configured');assert.equal(missing.fixtures.length,0);
    process.env.BALLDONTLIE_API_KEY='local-test-secret';
    let calls=0;
    global.fetch=async (url,options)=>{
      calls++;assert.ok(String(url).includes('start_date=2026-11-03'));assert.equal(options.headers.Authorization,'local-test-secret');
      return {ok:true,json:async()=>({data:[
        {id:1,date:'2026-11-04',home_team:{full_name:'Detroit Pistons'},visitor_team:{full_name:'Philadelphia 76ers'},status:'Scheduled'},
        {id:2,date:'2026-11-02',home_team:{full_name:'Old'},visitor_team:{full_name:'Old'},status:'Final'},
        {id:3,date:'2026-11-04',home_team:{full_name:'Closed'},visitor_team:{full_name:'Game'},status:'Scheduled',status_state:'final'},
        {id:1,date:'2026-11-04',home_team:{full_name:'Detroit Pistons'},visitor_team:{full_name:'Philadelphia 76ers'},status:'Scheduled'},
      ],meta:{next_cursor:null}})};
    };
    const ok=await getNbaGameweekSchedule(new Date('2026-11-03T12:00:00Z'));
    assert.equal(calls,1);assert.equal(ok.status,'available');assert.equal(ok.fixtures.length,1);
    assert.equal(ok.fixtures[0].home,'Detroit Pistons');assert.equal(ok.fixtures[0].source,'BALLDONTLIE');
    global.fetch=async()=>({ok:false,status:403});
    const failed=await getNbaGameweekSchedule(new Date('2026-11-03T12:00:00Z'));
    assert.equal(failed.status,'unavailable');assert.equal(failed.fixtures.length,0);
    assert.ok(failed.note.includes('HTTP 403'));
    console.log('V2.0 isolated NBA schedule feed: missing key, upcoming-only, dedup, error fallback passed.');
  } finally {global.fetch=originalFetch;if(oldKey===undefined)delete process.env.BALLDONTLIE_API_KEY;else process.env.BALLDONTLIE_API_KEY=oldKey;}
})().catch(e=>{console.error(e);process.exitCode=1;});

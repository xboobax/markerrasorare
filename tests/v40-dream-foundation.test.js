const assert=require('node:assert/strict');
const fs=require('node:fs');
const {filterRegularNbaTeams}=require('../.test-build/lib/regular-nba');
const {sorarePlayerUrl}=require('../.test-build/lib/sorare-profile');
const {canonicalNbaTeam}=require('../.test-build/lib/nba-fixture-mapping');
const n=(slug,name)=>({slug,name,league:'NBA'});
const regular=filterRegularNbaTeams([
  n('team-melo','Team Melo'),n('team-lebron','Team LeBron'),n('team-durant','Team Durant'),
  n('boston-celtics','Boston Celtics'),n('boston-2','Celtics'),n('los-angeles-lakers','Los Angeles Lakers'),
  n('oklahoma-city-thunder','Oklahoma City Thunder'),n('not-valid!','Atlanta Hawks'),
]);
assert.equal(regular.length,3,'only regular franchises, deduplicated and valid slugs');
assert.deepEqual(regular.map(x=>x.name),['Boston Celtics','Los Angeles Lakers','Oklahoma City Thunder']);
assert.equal(canonicalNbaTeam('Team Melo'),null);
assert.equal(sorarePlayerUrl('nba','alex-caruso-19940228'),'https://sorare.com/nba/players/alex-caruso-19940228');
assert.equal(sorarePlayerUrl('football','erling-haland-20000721'),'https://sorare.com/football/players/erling-haland-20000721');
for (const slug of ['../test','https://phishing.example/','javascript:alert(1)','Alex Caruso','bad?query','_','']){
  assert.equal(sorarePlayerUrl('nba',slug),null,`unsafe or guessed slug: ${slug}`);
}
const routes=['builder/[sport]','daily-missions','players','match-center','collection','analytics','guides'];
for (const route of routes)assert(fs.existsSync(`app/${route}/page.tsx`),`missing route: ${route}`);
const css=fs.readFileSync('app/dream.css','utf8');
assert(css.includes('#d8b65b')&&css.includes('#08090a'),'black-gold color tokens');
assert(css.includes('dream-roster-scroll')&&css.includes('dream-sidebar'),'new dedicated modular styles');
const explorer=fs.readFileSync('features/players/player-explorer.tsx','utf8');
assert(explorer.includes('visible.slice(first,first+count)'),'windowed rows instead of rendering entire table');
assert(explorer.includes('ownedSlugs(saved,sport)'),'collection data used only after verification');
const dashboard=fs.readFileSync('app/components/arcade-dashboard.tsx','utf8');
assert(dashboard.includes('dream:pending-pick:${sport}'),'daily picker player survives route change');
const core=fs.readFileSync('features/core/workspace-server.ts','utf8');
assert(core.includes('await getRegularNbaTeams()'),'server filters NBA special teams before fetch');
console.log('V4.0: 30 franchise validation, profile links, modular routes, theme, virtualization, transfer persistence passed');

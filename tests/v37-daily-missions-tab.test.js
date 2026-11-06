const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
const dashboard=fs.readFileSync(path.join(root,'app/components/arcade-dashboard.tsx'),'utf8');
const mission=fs.readFileSync(path.join(root,'app/components/daily-mission-picker.tsx'),'utf8');
const css=fs.readFileSync(path.join(root,'app/globals.css'),'utf8');
const pkg=require('../package.json');
assert.match(pkg.version,/^(?:3\.(?:7|8|9)|4\.\d+)\./); // V4 retains the feature in a dedicated route and legacy workspace.
assert.match(dashboard,/\["missions","⚡","Daily Missions"\]/);
assert.ok(dashboard.indexOf('["collection","▣","Sammlung"]')<dashboard.indexOf('["missions","⚡","Daily Missions"]'));
assert.match(dashboard,/<section className="v35-tab-section v37-mission-workspace" data-tab="missions" id="daily-mission">/);
assert.ok(!/data-tab="builder" id="daily-mission"/.test(dashboard));
assert.match(dashboard,/tab:"missions"/); // switching league/team keeps the mission workspace
assert.match(dashboard,/activeTab==="missions"\?"\/\?sport=nba&tab=missions"/);
assert.match(dashboard,/onClick=\{\(\)=>navigate\("missions"\)\}/);
assert.match(css,/data-workspace="missions"/);
assert.match(css,/overflow-x:auto;justify-content:flex-start/); // five tabs on narrow screens
assert.match(mission,/rankDailyMissionPlayers/);
assert.match(mission,/Top Pick/);
assert.match(mission,/Datenbasis:/);
assert.match(mission,/L10/);
assert.match(mission,/keine kalibrierten Erfolgs- oder Verletzungswahrscheinlichkeiten/);
assert.ok(fs.existsSync(path.join(root,'app/daily-missions/page.tsx')),'V4 dedicated Daily Missions route remains reachable');
const vercel=require('../vercel.json');assert.ok(vercel.crons.every(c=>c.path.startsWith('/api/cron/v44')||c.path.startsWith('/api/cron/v4515')),'Only authenticated V4.4 and V4.5.15 server cron routes are active');
console.log('V3.7 Daily Missions dedicated fifth tab, compact scope, responsive nav and free-data ranking: OK');

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const app=path.join(root,'app');
const routes=['','builder/[sport]','analytics','collection','daily-missions','guides','match-center','players'];
for(const route of routes){
  assert(fs.existsSync(path.join(app,route,'page.tsx')),`Flat App Router page missing: ${route||'/'}`);
}
assert(!fs.existsSync(path.join(app,'(dream)')),'(dream) group would trigger Vercel manifest tracing regression');
const layout=fs.readFileSync(path.join(app,'layout.tsx'),'utf8');
const router=fs.readFileSync(path.join(root,'features/shell/dream-app-router.tsx'),'utf8');
assert(layout.includes('DreamAppRouter'),'navigation must be shared by the flat route tree');
assert(layout.includes('<Suspense'),'searchParams client navigation is inside Suspense');
for(const route of ['/legacy','/status','/diagnose'])assert(router.includes(route),'standalone route not preserved: '+route);
assert(router.includes('<DreamShell>{children}</DreamShell>'),'workspace navigation must be persistent');
assert(fs.existsSync(path.join(app,'legacy/page.tsx')),'legacy fallback must be preserved');
assert(fs.existsSync(path.join(app,'api/auth/sorare/start/route.ts')),'Sorare auth must be preserved');
console.log('V4.0.1: flat routes without route-group manifest, persistent shell, legacy+auth: OK');

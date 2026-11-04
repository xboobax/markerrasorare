const fs = require('node:fs');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');

// Vercel builds typecheck the UI. Pure-lib tests alone missed a UI cache
// annotation that discarded ScoutedForecast fields after enrichForecast().
const dashboard = fs.readFileSync('app/components/arcade-dashboard.tsx','utf8');
const matchups = fs.readFileSync('lib/matchups.ts','utf8');
assert.match(dashboard,/type CachedPrediction\s*=\s*ScoutedForecast\s*&\s*\{modelV18:/,
  'dashboard cache must preserve ScoutedForecast fields in its public type');
assert.match(dashboard,/type OpponentRatings, type ScoutedForecast \} from "@\/lib\/matchups"/,
  'dashboard must import ScoutedForecast from the real matchup module');
assert.match(matchups,/opponentRating:\s*number\s*\|\s*null;/);
assert.match(matchups,/matchupAdjustmentPct:\s*number;/);
assert.match(dashboard,/players\.filter\(p => p\.opponentRating !== null/);

// A real strict TypeScript check on a fixture using the actual project types.
// Does not require Next.js/React packages, so it also runs offline.
execFileSync('tsc', ['--target','ES2020','--module','commonjs','--moduleResolution','node',
  '--strict','--skipLibCheck','--noEmit','tests/v392-build-types.ts'],{stdio:'pipe'});
console.log('V3.9.2: cached prediction preserves typed matchup fields (strict TypeScript) OK');

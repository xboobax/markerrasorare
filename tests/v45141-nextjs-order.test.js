"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Regression: Vercel/Next.js TypeScript typecheck rejects the dependency on a
// block-scoped const declared later in the component (v4.5.14 build failure).
const source = fs.readFileSync(path.join(__dirname, "../app/components/arcade-dashboard.tsx"), "utf8");
const playersDeclaration = source.indexOf("const players:CachedPrediction[] = useMemo(");
const kickoffEffect = source.indexOf("const needsNational=players.some(");
const kickoffDependencies = source.indexOf("[sport,activeTab,builderMode,footballWindow,nbaClock,players]");
assert.ok(playersDeclaration >= 0, "players declaration must exist");
assert.ok(kickoffEffect > playersDeclaration, "football fixture effect must follow players declaration");
assert.ok(kickoffDependencies > playersDeclaration, "football fixture useEffect deps must not access players before declaration");
console.log("V4.5.14.1: player declaration precedes football fixture effect and its dependencies OK");

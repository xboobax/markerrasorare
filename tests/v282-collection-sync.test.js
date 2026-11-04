const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const route = fs.readFileSync(path.join(__dirname, '../app/api/collection/route.ts'), 'utf8');
// Regressionsschutz: Sorare CurrentUser hat kein anyCards; die paginierte
// Kartenliste steht in Query.cardsWhere(ownedByMe: true), dokumentiert im
// öffentlichen Schema: https://api.sorare.com/graphql/schema
const query = route.match(/const QUERY=`([\s\S]*?)`;/)?.[1];
assert.ok(query, 'GraphQL-Synchronisierungsabfrage muss vorhanden sein');
assert.match(query, /currentUser\s*\{\s*slug\s*\}/);
assert.match(query, /cardsWhere\s*\(\s*first:\s*50,\s*after:\s*\$after,\s*ownedByMe:\s*true\s*\)/);
assert.doesNotMatch(query, /\banyCards\s*\(/, 'anyCards ist kein Feld von CurrentUser');
assert.match(query, /pageInfo\s*\{\s*hasNextPage\s+endCursor\s*\}/);
assert.match(route, /const data=result\.cardsWhere/);
assert.match(route, /if\(!current\?\.slug\|\|!data\|\|!Array\.isArray\(data\.nodes\)\)/);
assert.match(route, /Cache-Control":"private, no-store/);
console.log('V2.8.2 Collection-Sync-Schema-Regressionsschutz bestanden.');

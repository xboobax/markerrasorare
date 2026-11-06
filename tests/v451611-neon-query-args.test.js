/* Regression for Neon 1.x SQL query signature: query(text, params, options?). */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const file=path.resolve(__dirname,'../app/api/learning-diagnostics/route.ts');
const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
let calls=0;
function walk(node){
 if(ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
    && ts.isIdentifier(node.expression.expression) && node.expression.expression.text==='sql'
    && node.expression.name.text==='query'){
    calls++;
    assert(node.arguments.length>=2, `Neon sql.query requires a parameter array: ${source.getLineAndCharacterOfPosition(node.getStart(source)).line+1}`);
    assert(ts.isArrayLiteralExpression(node.arguments[1]), 'Second sql.query argument must be an array of parameters');
 }
 ts.forEachChild(node,walk);
}
walk(source);
assert(calls>=6, `Expected to inspect the diagnostic SQL queries, found ${calls}`);
console.log(`V4.5.16.1.1 Neon query typing: ${calls} SQL queries have explicit parameter arrays`);

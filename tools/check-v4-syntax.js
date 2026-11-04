const fs=require('node:fs');
const path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
const roots=['app','features','lib'];
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);
  else if(/\.(?:ts|tsx)$/.test(full))files.push(full);
}}
for(const dir of roots)walk(dir);
let bad=0;
for(const file of files){
  const code=fs.readFileSync(file,'utf8');
  const result=ts.transpileModule(code,{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.Preserve,strict:true,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}});
  const errors=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  if(errors.length){bad+=errors.length;console.error(file,errors.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')));}
}
if(bad){console.error(`${bad} syntax/transpile errors`);process.exit(1)}
console.log(`${files.length} TS/TSX Dateien: Syntax und Transpile erfolgreich.`);

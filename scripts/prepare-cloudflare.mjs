// Static migration inventory only. Does not load environment files or access providers.
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import ts from 'typescript';
const root=process.cwd();
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):/\.tsx?$/.test(e.name)?[join(dir,e.name)]:[]);}
const entries=[];
for(const path of files(join(root,'src/server'))){
 const source=readFileSync(path,'utf8'),ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);
 const imports=ast.statements.filter(ts.isImportDeclaration).map(n=>n.moduleSpecifier.text);
 const exports=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)).map(n=>n.name?.text).filter(Boolean);
 const risks=[];
 if(imports.some(i=>i.startsWith('next/')||i==='@clerk/nextjs/server'))risks.push('Next.js request-context coupling');
 if(imports.includes('server-only'))risks.push('server-only build marker needs a Workers-safe entry');
 if(imports.includes('sharp'))risks.push('Native image processing; keep on Node initially or replace after compatibility proof');
 if(imports.some(i=>i==='pg'||i.startsWith('drizzle-orm/')))risks.push('PostgreSQL connection lifetime/Hyperdrive review');
 if(imports.includes('@/server/db/client'))risks.push('Node database singleton dependency; inject request/transaction handle');
 if(imports.includes('@/server/auth'))risks.push('Clerk identity must be verified in Worker, then passed explicitly');
 if(imports.includes('@/server/env'))risks.push('process.env configuration must become explicit Worker bindings');
 entries.push({file:relative(root,path),serverAction:ast.statements.some(n=>ts.isExpressionStatement(n)&&ts.isStringLiteral(n.expression)&&n.expression.text==='use server'),exports,imports,risks});
}
const actions=entries.filter(e=>e.serverAction);
const result={generatedAt:new Date().toISOString(),scope:'Current working tree; static inventory, not a successful Workers compatibility test',serverModules:entries.length,serverActionModules:actions.length,exportedActionFunctions:actions.reduce((n,e)=>n+e.exports.length,0),entries};
const dir=join(root,'docs/deployment');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'cloudflare-inventory.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({serverModules:result.serverModules,serverActionModules:result.serverActionModules,exportedActionFunctions:result.exportedActionFunctions,output:'docs/deployment/cloudflare-inventory.json',providerAccess:false}));

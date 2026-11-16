import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createRequire} from 'node:module';import esbuild from 'esbuild';
const output=join(mkdtempSync(join(tmpdir(),'ent-knowledge-')),'test.cjs');
await esbuild.build({entryPoints:['tests/chat/knowledge.ts'],bundle:true,platform:'node',packages:'external',format:'cjs',outfile:output,banner:{js:`require=require('node:module').createRequire(${JSON.stringify(join(process.cwd(),'package.json'))});`},plugins:[{name:'server-marker',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'server-only',namespace:'marker'}));b.onLoad({filter:/.*/,namespace:'marker'},()=>({contents:''}));}}]});
await createRequire(import.meta.url)(output).checkKnowledge();

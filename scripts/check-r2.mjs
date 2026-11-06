// Opt-in live storage smoke test: creates one unique test object, then deletes it.
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {config} from 'dotenv';
import esbuild from 'esbuild';
config({path:'.env.local',quiet:true});
const output=join(mkdtempSync(join(tmpdir(),'ent-r2-check-')),'check.cjs');
const entry=`import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import sharp from 'sharp';import {putImage,getImage,deleteImage} from './src/server/storage';export async function run(){const key='backend-checks/'+randomUUID()+'.webp';const bytes=await sharp({create:{width:1,height:1,channels:3,background:'#6247aa'}}).webp().toBuffer();try{await putImage(key,bytes);assert.deepEqual(Buffer.from(await getImage(key)),bytes);}finally{await deleteImage(key);}await assert.rejects(getImage(key));}`;
await esbuild.build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'ts'},bundle:true,packages:'external',platform:'node',format:'cjs',outfile:output,banner:{js:`require=require('node:module').createRequire(${JSON.stringify(join(process.cwd(),'package.json'))});`},plugins:[{name:'server-marker',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'',loader:'js'}));}}]});
try{await createRequire(import.meta.url)(output).run();console.log('PASS R2: wrote and read a unique 1-pixel image, then deleted it and confirmed it was unavailable.');}catch(error){console.error('R2 smoke test failed:',error.name??'unknown');process.exitCode=1;}

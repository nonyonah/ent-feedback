import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';

test('Netlify docs preserves Mintlify deployment queries without forwarding credentials',async()=>{
 const directory=await mkdtemp(tmpdir()+'/ent-docs-edge-');
 const fetchBefore=globalThis.fetch;
 const globals=globalThis as typeof globalThis & {Netlify?:{env:{get:(key:string)=>string|undefined}}};
 const netlifyBefore=globals.Netlify;
 try{
  const outfile=directory+'/handler.mjs';
  await build({entryPoints:['netlify/edge-functions/documentation.js'],bundle:true,platform:'neutral',format:'esm',outfile,logLevel:'silent'});
  const {default:handler}=await import(pathToFileURL(outfile).href);
  globals.Netlify={env:{get:key=>key==='MINTLIFY_ORIGIN'?'https://ent-docs.mintlify.site':undefined}};
  let calls=0;
  globalThis.fetch=async(input,options)=>{
   calls++;
   assert.equal(String(input),'https://ent-docs.mintlify.site/docs/_mintlify/assets/style.css?dpl=deployment123');
   const headers=new Headers(options?.headers);
   assert.equal(headers.get('cookie'),null);
   assert.equal(headers.get('authorization'),null);
   return new Response('body{color:red}',{headers:{'content-type':'text/css','set-cookie':'upstream=private'}});
  };
  const response=await handler(new Request('https://ent-boards.netlify.app/docs/_mintlify/assets/style.css?dpl=deployment123',{headers:{cookie:'ent=private',authorization:'Bearer private'}}),{});
  assert.equal(calls,1);
  assert.equal(response.headers.get('set-cookie'),null);
  assert.equal(response.headers.get('content-type'),'text/css');
  assert.equal(await response.text(),'body{color:red}');
  globals.Netlify={env:{get:()=>undefined}};
  assert.equal((await handler(new Request('https://ent-boards.netlify.app/docs'),{})).status,503);
  assert.equal(calls,1,'missing origin must fail closed');
 }finally{
  globalThis.fetch=fetchBefore;
  if(netlifyBefore)globals.Netlify=netlifyBefore;else delete globals.Netlify;
  await rm(directory,{recursive:true,force:true});
 }
});

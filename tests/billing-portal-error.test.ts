import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';

test('portal failures explain recovery without exposing provider credentials',async()=>{
 const directory=await mkdtemp(tmpdir()+'/ent-portal-errors-');
 try{
  const outfile=directory+'/portal.mjs';
  await build({entryPoints:['src/server/billing/portal-error.ts'],bundle:true,platform:'node',format:'esm',outfile,logLevel:'silent',plugins:[{name:'server-only',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'server-only',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:''}));}}]});
  const {portalError}=await import(pathToFileURL(outfile).href);
  for(const [statusCode,expected] of [[401,/authentication/],[403,/customers:write/],[404,/live or sandbox/],[429,/Wait a minute/],[503,/portal configuration/]]){
   const error=portalError({statusCode,body:{url:'secret-session',email:'private@example.com'},message:'secret-session'});
   assert.match(error.message,expected as RegExp);
   assert.doesNotMatch(JSON.stringify(error),/secret-session|private@example.com/);
  }
  assert.match(portalError(new Error('secret-session')).message,/Please try again/);
  const existing=portalError({statusCode:404});assert.equal(portalError(existing),existing);
 }finally{await rm(directory,{recursive:true,force:true});}
});

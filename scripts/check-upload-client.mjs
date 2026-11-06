import assert from 'node:assert/strict';
import esbuild from 'esbuild';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const output=join(mkdtempSync(join(tmpdir(),'ent-upload-client-')),'upload.cjs');
await esbuild.build({entryPoints:['src/lib/feedback-uploads.ts'],bundle:true,platform:'node',format:'cjs',outfile:output});
const {createFeedbackUploader}=createRequire(import.meta.url)(output);
const original=global.fetch;
const image='data:image/png;base64,aGVsbG8=';
const scope={workspaceId:'workspace',boardId:'board',actorKey:'actor',guestToken:'visitor'};
let calls=0,fail=false;
global.fetch=async(url,options)=>{
 if(String(url).startsWith('data:'))return original(url,options);
 calls++;assert.equal(url,'/api/attachments');assert.equal(options.body.get('workspaceId'),scope.workspaceId);assert.equal(options.body.get('guestToken'),scope.guestToken);assert.ok(options.body.get('file') instanceof File);
 return fail?Response.json({ok:false,error:{message:'Upload unavailable'}},{status:503}):Response.json({ok:true,data:{id:'id-'+calls}});
};
try{
 const uploader=createFeedbackUploader();
 assert.equal(await uploader.upload(undefined,scope),undefined);
 const a=await uploader.upload([image],scope),b=await uploader.upload([image],scope);assert.deepEqual(a,b);assert.equal(calls,1);
 await uploader.upload([image],{...scope,actorKey:'another-account'});assert.equal(calls,2);
 uploader.clear();fail=true;await assert.rejects(uploader.upload([image],scope),/Upload unavailable/);fail=false;await uploader.upload([image],scope);assert.equal(calls,4);
 await assert.rejects(uploader.upload(['https://untrusted.example/image.png'],scope));
 await assert.rejects(uploader.upload(Array(4).fill(image),scope));
 console.log('PASS upload client: binary multipart, actor-scoped retry cache, failed upload retries, bounded image count and remote URL rejection. No remote calls.');
}finally{global.fetch=original;}

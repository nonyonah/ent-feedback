import assert from 'node:assert/strict';
import esbuild from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const output=join(mkdtempSync(join(tmpdir(),'ent-notification-route-')),'route.cjs');
await esbuild.build({entryPoints:['src/app/api/internal/notification-jobs/route.ts'],bundle:true,platform:'node',format:'cjs',outfile:output,plugins:[{name:'worker',setup(b){b.onResolve({filter:/@\/server\/(notification-worker|lifecycle-email-worker)/},()=>({path:'worker',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export async function processNotificationJobs(){global.workerCalls++;return {configured:true,succeeded:1,retried:0,failed:0}};export async function enqueueLifecycleEmails(){return {enabled:false,queued:0}};export async function processLifecycleEmails(){return {configured:false}}',loader:'js'}));}}]});
const {POST}=createRequire(import.meta.url)(output);
const previous=process.env.CRON_SECRET;
global.workerCalls=0;
try{
 for(const secret of [undefined,'short','a'.repeat(32)]){
  if(secret===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=secret;
  for(const authorization of ['', 'Bearer wrong', 'Bearer '+'b'.repeat(32)]){
   assert.equal((await POST(new Request('https://example.com/api/internal/notification-jobs',{method:'POST',headers:{authorization}}))).status,401);
  }
 }
 assert.equal(global.workerCalls,0);
 const response=await POST(new Request('https://example.com/api/internal/notification-jobs',{method:'POST',headers:{authorization:'Bearer '+'a'.repeat(32)}}));
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(global.workerCalls,1);
 console.log('PASS notification worker route: missing, weak and incorrect secrets rejected before worker access; valid bearer accepted. No email or database calls.');
}finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}

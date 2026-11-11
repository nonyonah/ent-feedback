import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {createHmac,randomUUID} from 'node:crypto';
import esbuild from 'esbuild';
const output=join(mkdtempSync(join(tmpdir(),'ent-unsubscribe-check-')),'route.cjs');
await esbuild.build({entryPoints:['src/app/api/email/unsubscribe/route.ts'],bundle:true,platform:'node',format:'cjs',outfile:output,plugins:[{name:'boundaries',setup(b){b.onResolve({filter:/^(server-only|@\/server\/db\/client)$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({loader:'js',contents:a.path==='server-only'?'':`export function getDb(){global.unsubscribeCalls++;if(global.unsubscribeFail)throw Error('private-db-error');return {update:()=>({set:()=>({where:async()=>[]})})}}`}));}}]});
const {GET,POST}=createRequire(import.meta.url)(output),previous=process.env.EMAIL_UNSUBSCRIBE_SECRET;
try{
 process.env.EMAIL_UNSUBSCRIBE_SECRET='s'.repeat(32);global.unsubscribeCalls=0;global.unsubscribeFail=false;
 const user=randomUUID(),token=createHmac('sha256',process.env.EMAIL_UNSUBSCRIBE_SECRET).update('ent-lifecycle-v1:'+user).digest('hex');
 const url='https://ent.riftlabs.xyz/api/email/unsubscribe?user='+user+'&token='+token;
 const page=GET(new Request(url));assert.equal(page.status,200);assert.equal(global.unsubscribeCalls,0);assert.match(await page.text(),/method="post"/);assert.equal(page.headers.get('referrer-policy'),'no-referrer');
 assert.equal((await POST(new Request(url.replace(token,'0'.repeat(64)),{method:'POST'}))).status,400);assert.equal(global.unsubscribeCalls,0);
 const saved=await POST(new Request(url,{method:'POST'}));assert.equal(saved.status,200);assert.equal(global.unsubscribeCalls,1);assert.equal(saved.headers.get('cache-control'),'no-store');
 global.unsubscribeFail=true;const failed=await POST(new Request(url,{method:'POST'}));assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('private-db-error'));
 console.log('PASS unsubscribe: scanner-safe GET, signed POST, tampering rejection, no-store/no-referrer, safe retryable error. No real database changes.');
}finally{if(previous===undefined)delete process.env.EMAIL_UNSUBSCRIBE_SECRET;else process.env.EMAIL_UNSUBSCRIBE_SECRET=previous;}

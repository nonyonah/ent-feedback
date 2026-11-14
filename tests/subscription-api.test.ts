import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';

test('subscription period changes use the documented PATCH with server-selected environment and no immediate invoice',async()=>{
 const directory=await mkdtemp(tmpdir()+'/ent-subscription-api-'),oldFetch=globalThis.fetch;
 const before=process.env.BACHS_API_KEY;
 try{
  const outfile=directory+'/subscription.mjs';
  await build({entryPoints:['src/server/billing/subscription-api.ts'],bundle:true,platform:'node',format:'esm',outfile,logLevel:'silent',plugins:[{name:'offline-boundaries',setup(b){
   b.onResolve({filter:/^(server-only|@\/server\/env|\.\/client)$/},args=>({path:args.path,namespace:'mock'}));
   b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='server-only'?'':args.path.endsWith('/env')?'export const getServerEnv=()=>({BACHS_API_KEY:process.env.BACHS_API_KEY});':'export const bachsClient=()=>({environment:process.env.BACHS_API_KEY.startsWith("sk_sandbox_")?"sandbox":"production"});'}));
  }}]});
  const {changeSubscriptionProduct}=await import(pathToFileURL(outfile).href);
  for(const environment of ['sandbox','live']){
   process.env.BACHS_API_KEY=`sk_${environment}_fixture`;
   globalThis.fetch=async(url,options)=>{
    assert.equal(String(url),`https://${environment==='sandbox'?'sandbox-api':'api'}.bachs.io/v1/subscriptions/sub_fixture`);
    assert.equal(options?.method,'PATCH');assert.equal(options?.redirect,'error');assert.equal(options?.cache,'no-store');
    const headers=new Headers(options?.headers);assert.equal(headers.get('Authorization'),`Bearer sk_${environment}_fixture`);assert.equal(headers.get('Idempotency-Key'),'fixture-operation');
    assert.deepEqual(JSON.parse(options?.body as string),{product_id:'prod_yearly',proration_behavior:'next_cycle'});
    return Response.json({id:'sub_fixture',pending_update:{product_id:'prod_yearly'}});
   };
   const result=await changeSubscriptionProduct('sub_fixture','prod_yearly','fixture-operation');assert.equal(result.pending_update.product_id,'prod_yearly');
  }
  globalThis.fetch=async()=>Response.json({secret:'never expose this'},{status:403});
  await assert.rejects(changeSubscriptionProduct('sub_fixture','prod_yearly','fixture'),error=>{assert.equal((error as {statusCode:number}).statusCode,403);assert.doesNotMatch(String(error),/never expose/);return true;});
  globalThis.fetch=async()=>{throw Error('Sensitive upstream detail')};
  await assert.rejects(changeSubscriptionProduct('sub_fixture','prod_yearly','fixture'),/Refresh the subscription/);
 }finally{globalThis.fetch=oldFetch;if(before===undefined)delete process.env.BACHS_API_KEY;else process.env.BACHS_API_KEY=before;await rm(directory,{recursive:true,force:true});}
});

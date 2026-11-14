import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {prepaidPeriodEnd,subscriptionHasAccess} from '../src/lib/billing';

test('prepaid calendar expiry, leap years, renewal and independent paid access',()=>{
 assert.equal(prepaidPeriodEnd(new Date('2026-01-31T12:00:00Z'),'monthly').toISOString(),'2026-02-28T12:00:00.000Z');
 assert.equal(prepaidPeriodEnd(new Date('2024-02-29T12:00:00Z'),'yearly').toISOString(),'2025-02-28T12:00:00.000Z');
 const now=new Date('2026-11-14T12:00:00Z').getTime();
 assert.equal(subscriptionHasAccess({status:'none',trialEnd:null,periodEnd:null,prepaidUntil:'2026-12-14T12:00:00Z'},now),true);
 assert.equal(subscriptionHasAccess({status:'canceled',trialEnd:null,periodEnd:null,prepaidUntil:'2026-11-14T12:00:00Z'},now),false);
 assert.equal(subscriptionHasAccess({status:'active',trialEnd:null,periodEnd:'2026-12-14T12:00:00Z',prepaidUntil:null},now),true);
});

test('prepaid checkout verification rejects forged workspace, amount, recurring and currency bindings',async()=>{
 const directory=await mkdtemp(tmpdir()+'/ent-prepaid-test-');
 try{
  const outfile=directory+'/prepaid.mjs';
  await build({entryPoints:['src/server/billing/prepaid.ts'],bundle:true,platform:'node',format:'esm',outfile,logLevel:'silent',plugins:[{name:'offline-boundaries',setup(b){
   b.onResolve({filter:/^(server-only|@\/server\/db\/client|\.\/client)$/},args=>({path:args.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='server-only'?'':args.path==='./client'?'export const bachsClient=()=>{};':'export const getDb=()=>{};'}));
  }}]});
  const {verifiedPrepaidCheckout}=await import(pathToFileURL(outfile).href);
  const id='6cd3bd10-4371-43a3-b630-c3b355e32344',workspaceId='6cd3bd10-4371-43a3-b630-c3b355e32345';
  const order={id,workspaceId,checkoutId:'chk_fixture',mode:'prepaid',interval:'monthly',amount:'7.00'};
  const raw={checkout_id:'chk_fixture',status:'completed',currency:'USD',amount:'7.00',reference:id,recurring:null,payment_status:'succeeded',charge:{payment_id:'pay_fixture'},metadata:{workspace_id:workspaceId,checkout_attempt_id:id,billing_mode:'prepaid'}};
  assert.equal(verifiedPrepaidCheckout(raw,order).checkout_id,'chk_fixture');
  for(const modified of[{...raw,amount:'1.00'},{...raw,currency:'NGN'},{...raw,recurring:{}},{...raw,checkout_id:'chk_other'},{...raw,metadata:{...raw.metadata,workspace_id:id}},{...raw,reference:workspaceId}])assert.throws(()=>verifiedPrepaidCheckout(modified,order));
  assert.throws(()=>verifiedPrepaidCheckout(raw,{...order,mode:'subscription'}));
 }finally{await rm(directory,{recursive:true,force:true});}
});

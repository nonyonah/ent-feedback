import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';

test('provider snapshots reject unexpected prices/products and separate scheduled billing periods from the current plan',async()=>{
 const directory=await mkdtemp(tmpdir()+'/ent-billing-snapshot-');
 try{
  const outfile=directory+'/snapshot.mjs';
  await build({stdin:{contents:"export * from './src/server/billing/snapshot';export * from './src/server/billing/pending';export * from './src/server/billing/management-error';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile,logLevel:'silent',plugins:[{name:'offline-boundaries',setup(b){
   b.onResolve({filter:/^(server-only|\.\/client)$/},args=>({path:args.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='server-only'?'':"export const billingProduct=period=>'prod_'+period;"}));
  }}]});
  const {billingSnapshot,subscriptionValues,recordedBillingProduct,pendingBillingInterval,subscriptionManagementError}=await import(pathToFileURL(outfile).href);
  const raw={id:'sub_fixture',customer:{customer_id:'cust_fixture'},status:'active',product:{id:'prod_monthly'},currency:'USD',amount:'7.00',quantity:1,billing_cycle:{interval:'month',frequency:1},current_period_end:'2026-12-14T12:00:00Z',cancel_at_period_end:false,pending_update:{product_id:'prod_yearly'}};
  assert.equal(subscriptionValues(billingSnapshot.parse(raw)).interval,'monthly');
  assert.deepEqual(pendingBillingInterval(raw),{pendingChange:true,pendingInterval:'yearly'});
  assert.deepEqual(pendingBillingInterval({...raw,pending_update:null}),{pendingChange:false,pendingInterval:null});
  assert.deepEqual(pendingBillingInterval({...raw,pending_update:{product_id:'prod_unknown'}}),{pendingChange:true,pendingInterval:null});
  assert.throws(()=>subscriptionValues(billingSnapshot.parse({...raw,amount:'1.00'})));
  assert.throws(()=>subscriptionValues(billingSnapshot.parse({...raw,product:{id:'prod_other'}})));
  assert.throws(()=>billingSnapshot.parse({...raw,quantity:2}));
  assert.throws(()=>subscriptionValues(billingSnapshot.parse({...raw,status:'trialing',trial_end:null})));

  const legacy=billingSnapshot.parse({...raw,product:{id:'prod_retired_trial'},metadata:{workspace_id:'workspace-fixture',checkout_attempt_id:'checkout-fixture'}});
  const checkout={id:'checkout-fixture',workspaceId:'workspace-fixture',productId:'prod_retired_trial',interval:'monthly',status:'completed'};
  assert.equal(subscriptionValues(legacy,recordedBillingProduct(legacy,checkout,'workspace-fixture')).interval,'monthly');
  for(const changed of [{...checkout,workspaceId:'other'},{...checkout,status:'open'},{...checkout,interval:'yearly'},{...checkout,productId:'prod_other'},{...checkout,id:'other-checkout'}])assert.throws(()=>subscriptionValues(legacy,recordedBillingProduct(legacy,changed,'workspace-fixture')));
  assert.throws(()=>subscriptionValues({...legacy,amount:'1.00'},recordedBillingProduct(legacy,checkout,'workspace-fixture')));
  assert.equal(subscriptionValues(billingSnapshot.parse({...raw,cancel_at_period_end:true})).cancelAtPeriodEnd,true);
  const canceled=subscriptionValues(billingSnapshot.parse({...raw,status:'canceled'}));assert.equal(canceled.status,'canceled');
  for(const statusCode of[400,401,403,404,409,429,503]){
   const error=subscriptionManagementError({statusCode,body:{secret:'session-secret'}});assert.match(error.message,/Refresh|support|try again/);assert.doesNotMatch(JSON.stringify(error),/session-secret/);
  }
 }finally{await rm(directory,{recursive:true,force:true});}
});

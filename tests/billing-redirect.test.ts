import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';

test('billing destinations allow the sandbox portal hostname without widening live redirects',async()=>{
 const directory=await mkdtemp(tmpdir()+'/ent-billing-redirect-');
 const before=process.env.BACHS_API_KEY;
 try{
  const outfile=directory+'/client.mjs';
  await build({entryPoints:['src/server/billing/client.ts'],bundle:true,platform:'node',format:'esm',outfile,logLevel:'silent',plugins:[{name:'offline-environment',setup(b){
   b.onResolve({filter:/^(server-only|@\/server\/env|@bachs\/sdk)$/},args=>({path:args.path,namespace:'fixture'}));
   b.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',contents:args.path==='server-only'?'':args.path==='@/server/env'?'export const getServerEnv=()=>({BACHS_API_KEY:process.env.BACHS_API_KEY,BACHS_WEBHOOK_SECRET:"fixture",BACHS_ORGANIZATION_ID:"acct_fixture",BACHS_MONTHLY_PRODUCT_ID:"prod_monthly",BACHS_YEARLY_PRODUCT_ID:"prod_yearly"});':'export class Bachs {constructor({apiKey}){this.environment=apiKey.startsWith("sk_sandbox_")?"sandbox":"live"}}'}));
  }}]});
  const {billingRedirect,billingProduct,billingReady}=await import(pathToFileURL(outfile).href);
  process.env.BACHS_API_KEY='sk_sandbox_fixture';
  assert.equal(billingReady(),true,'two configured products are sufficient');
  assert.equal(billingProduct('monthly'),'prod_monthly');
  assert.equal(billingProduct('yearly'),'prod_yearly');
  assert.equal(billingRedirect('https://sandbox-billing.bachs.io/s/fixture','portal'),'https://sandbox-billing.bachs.io/s/fixture');
  for(const value of ['http://sandbox-billing.bachs.io/s/test','https://sandbox-billing.bachs.io.evil.test/s/test','https://user:pass@sandbox-billing.bachs.io/s/test','https://sandbox-billing.bachs.io:444/s/test'])assert.throws(()=>billingRedirect(value,'portal'));
  assert.throws(()=>billingRedirect('https://sandbox-billing.bachs.io/s/test','checkout'));
  process.env.BACHS_API_KEY='sk_live_fixture';
  assert.throws(()=>billingRedirect('https://sandbox-billing.bachs.io/s/test','portal'));
  assert.equal(billingRedirect('https://portal.bachs.io/s/test','portal'),'https://portal.bachs.io/s/test');
 }finally{
  if(before===undefined)delete process.env.BACHS_API_KEY;else process.env.BACHS_API_KEY=before;
  await rm(directory,{recursive:true,force:true});
 }
});

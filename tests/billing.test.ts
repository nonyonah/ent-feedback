import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {webhooks} from '@bachs/sdk';
import {subscriptionHasAccess,billingPlan} from '../src/lib/billing';
const now=Date.now(),future=new Date(now+86400000),past=new Date(now-1);
test('Essentials prices are decimal USD amounts with a 14-day trial',()=>{assert.equal(billingPlan.monthly,'7.00');assert.equal(billingPlan.yearly,'70.00');assert.equal(billingPlan.trialDays,14);assert.equal(Number(billingPlan.monthly)*12-Number(billingPlan.yearly),14);});
test('entitlements require a confirmed trial or paid period; redirects cannot grant access',()=>{
 assert.equal(subscriptionHasAccess(null,now),false);
 for(const status of ['none','unpaid','canceled','paused','pending','checkout.completed'])assert.equal(subscriptionHasAccess({status,periodEnd:future,trialEnd:future},now),false);
 assert.equal(subscriptionHasAccess({status:'trialing',trialEnd:future,periodEnd:null},now),true);
 assert.equal(subscriptionHasAccess({status:'trialing',trialEnd:past,periodEnd:future},now),false);
 assert.equal(subscriptionHasAccess({status:'active',periodEnd:future,trialEnd:null},now),true);
 assert.equal(subscriptionHasAccess({status:'active',periodEnd:past,trialEnd:null},now),false);
 assert.equal(subscriptionHasAccess({status:'active',periodEnd:null,trialEnd:future},now),false);
 assert.equal(subscriptionHasAccess({status:'active',periodEnd:'invalid',trialEnd:null},now),false);
 assert.equal(subscriptionHasAccess({status:'past_due',periodEnd:past,trialEnd:null},now),true);
});
test('webhooks reject tampering, wrong secrets and stale timestamps; support rotation',()=>{
 const secret='test-signing-secret',timestamp=Math.floor(Date.now()/1000),body=JSON.stringify({id:'evt_test',type:'customer.subscription.created',created_at:new Date().toISOString(),organization_id:'acct_test',data:{subscription_id:'sub_test'}});
 const sign=(t:number)=>createHmac('sha256',secret).update(t+'.'+body).digest('hex');
 const headers={'X-Bachs-Signature-V2':`t=${timestamp},v1=${'0'.repeat(64)},v1=${sign(timestamp)}`};
 assert.equal(webhooks.constructEvent(body,headers,secret).id,'evt_test');
 assert.throws(()=>webhooks.constructEvent(body+' ',headers,secret));assert.throws(()=>webhooks.constructEvent(body,headers,'wrong-secret'));
 assert.throws(()=>webhooks.constructEvent(body,{'X-Bachs-Signature-V2':`t=${timestamp-1000},v1=${sign(timestamp-1000)}`},secret));
});

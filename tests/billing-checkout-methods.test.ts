import test from 'node:test';
import assert from 'node:assert/strict';
import {bachsCheckoutPricing} from '../src/lib/bachs-checkout';
import {prepaidReminderEligible,prepaidReminderLead} from '../src/lib/billing-reminders';
import {prepaidReminderEmail} from '../src/server/emails/templates';

test('one-time Bachs checkout leaves country, NGN/USD cards, transfer and crypto selection to Bachs',()=>{
 for(const interval of ['monthly','yearly'] as const){const pricing=bachsCheckoutPricing('prepaid',interval,'unused');assert.deepEqual(pricing,{pricing:{currency:'USD',amount:interval==='monthly'?'7.00':'70.00',price_type:'fixed'}});assert.equal('billing_currency' in pricing,false);assert.equal('payment_method_types' in pricing,false);assert.equal('product_cart' in pricing,false);}
});
test('card trial keeps Bachs supported recurring USD card settings',()=>{assert.deepEqual(bachsCheckoutPricing('subscription','monthly','prod_trial'),{product_cart:[{product_id:'prod_trial',quantity:1}],billing_currency:'USD',payment_method_types:['USD_CARD']});});
test('renewal reminders suppress extended, refunded, expired or independently subscribed access',()=>{
 const now=Date.parse('2026-11-16T12:00:00Z'),end=new Date(now+2*86400000).toISOString();
 const subscription={status:'none',trialEnd:null,periodEnd:null,prepaidUntil:end};
 assert.equal(prepaidReminderEligible(subscription,end,now),true);
 assert.equal(prepaidReminderEligible(subscription,end,now+2*86400000),false);
 assert.equal(prepaidReminderEligible(subscription,end,now-prepaidReminderLead),false);
 assert.equal(prepaidReminderEligible({...subscription,prepaidUntil:null},end,now),false);
 assert.equal(prepaidReminderEligible({...subscription,prepaidUntil:new Date(now+30*86400000).toISOString()},end,now),false);
 assert.equal(prepaidReminderEligible({...subscription,status:'active',periodEnd:end},end,now),false);
 assert.equal(prepaidReminderEligible({...subscription,status:'past_due'},end,now),false);
 assert.equal(prepaidReminderEligible({...subscription,status:'trialing',trialEnd:end},end,now),false);
});
test('prepaid reminder uses Ent email design and says renewal is manual with Bachs-owned payment choices',()=>{
 const email=prepaidReminderEmail({workspaceId:'workspace-fixture',workspaceName:'<Product & team>',accessUntil:'2026-11-19T12:00:00Z',appOrigin:'https://ent.riftlabs.xyz'});
 assert.match(email.html,/&lt;Product &amp; team&gt;/);assert.match(email.html,/class="email-bg"/);assert.match(email.text,/no automatic debit/i);assert.match(email.text,/local currency/);assert.match(email.text,/card, bank transfer or crypto/);assert.match(email.text,/workspace=workspace-fixture/);assert.ok(!email.text.includes('saved card will be charged'));
});

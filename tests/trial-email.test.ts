import test from 'node:test';
import assert from 'node:assert/strict';
import {trialEmail} from '../src/server/emails/templates';
const input={workspaceName:'<Acme & team>',trialEnd:'2026-11-28T12:00:00Z',cancelAtPeriodEnd:false,appOrigin:'https://ent.riftlabs.xyz'};
test('trial emails reuse the plain-background design, escape names and explain billing dates',()=>{
 for(const kind of ['started','ending'] as const){const email=trialEmail({...input,kind});assert.match(email.html,/class="email-bg"/);assert.match(email.html,/border-radius:10px/);assert.match(email.html,/&lt;Acme &amp; team&gt;/);assert.ok(!email.html.includes('<Acme'));assert.match(email.text,/Nov 28, 2026/);assert.match(email.text,/UTC/);assert.match(email.text,/saved card will be charged/);assert.match(email.text,/cancel renewal/);assert.match(email.text,/https:\/\/ent.riftlabs.xyz\/dashboard\/settings\/billing/);assert.ok(!email.html.includes('Stop these emails'));}
});
test('canceled trial copy explains access ending without incorrectly promising a charge',()=>{const email=trialEmail({...input,kind:'ending',cancelAtPeriodEnd:true});assert.match(email.text,/Renewal is canceled/);assert.match(email.text,/returns to Free/);assert.ok(!email.text.includes('saved card will be charged'));});

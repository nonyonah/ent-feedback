import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {lifecycleCopy,lifecycleEmail,activityEmail,emailLayout} from '../src/server/emails/templates';
import {eligibleLifecycleEmail,type LifecycleState} from '../src/server/emails/lifecycle-policy';
import {lifecycleUnsubscribeToken,verifyLifecycleUnsubscribe} from '../src/server/emails/unsubscribe';
const now=new Date('2026-11-11T12:00:00Z'),day=86_400_000;
const ago=(days:number)=>new Date(now.getTime()-days*day);
const state=(changes:Partial<LifecycleState>={}):LifecycleState=>({enrolledAt:ago(4),lastActiveAt:ago(1),onboardingStartedAt:ago(4),onboardingCompletedAt:null,optedOutAt:null,welcomeEligible:true,hasWorkspace:false,hasBoard:false,...changes});
test('approved lifecycle timing and current-state suppression',()=>{
 assert.equal(eligibleLifecycleEmail('welcome',state({enrolledAt:ago(0)}),now),true);
 assert.equal(eligibleLifecycleEmail('welcome',state(),now),false);
 assert.equal(eligibleLifecycleEmail('onboarding_reminder',state({onboardingStartedAt:ago(.99)}),now),false);
 assert.equal(eligibleLifecycleEmail('onboarding_reminder',state(),now),true);
 assert.equal(eligibleLifecycleEmail('onboarding_reminder',state({onboardingCompletedAt:ago(1)}),now),false);
 assert.equal(eligibleLifecycleEmail('first_board_reminder',state({hasWorkspace:true,enrolledAt:ago(2.99)}),now),false);
 assert.equal(eligibleLifecycleEmail('first_board_reminder',state({hasWorkspace:true}),now),true);
 assert.equal(eligibleLifecycleEmail('first_board_reminder',state({hasWorkspace:true,hasBoard:true}),now),false);
 assert.equal(eligibleLifecycleEmail('inactive',state({hasWorkspace:true,lastActiveAt:ago(30)}),now),true);
 assert.equal(eligibleLifecycleEmail('inactive',state({hasWorkspace:true,lastActiveAt:ago(29.99)}),now),false);
 for(const kind of Object.keys(lifecycleCopy) as (keyof typeof lifecycleCopy)[])assert.equal(eligibleLifecycleEmail(kind,state({optedOutAt:ago(1)}),now),false);
});
test('public-board-only accounts receive no workspace reminders; existing-user tips stay draft only',()=>{
 const visitor=state({onboardingStartedAt:null,hasWorkspace:false,lastActiveAt:ago(40)});
 for(const kind of ['onboarding_reminder','first_board_reminder','inactive','getting_value'] as const)assert.equal(eligibleLifecycleEmail(kind,visitor,now),false);
 assert.equal(eligibleLifecycleEmail('welcome',state({enrolledAt:now,welcomeEligible:false}),now),false);
});
test('all lifecycle drafts have safe links, plain text and a separate opt-out',()=>{
 for(const kind of Object.keys(lifecycleCopy) as (keyof typeof lifecycleCopy)[]){const email=lifecycleEmail({kind,appOrigin:'https://ent.riftlabs.xyz',unsubscribeUrl:'https://ent.riftlabs.xyz/api/email/unsubscribe?user=a&token=b'});assert.match(email.html,/Stop these emails/);assert.match(email.text,/Stop these emails:/);assert.ok(email.subject.length<70);assert.match(email.html,/&amp;token=b/);}
 const activity=activityEmail({subject:'A reply',title:'<script>private</script>',url:'https://example.com/a?x=1&y=2'});assert.ok(!activity.html.includes('<script>'));assert.match(activity.html,/&lt;script&gt;/);assert.ok(!activity.html.includes('Stop these emails'));
 assert.throws(()=>emailLayout({subject:'x',heading:'x',body:'x',action:'x',url:'javascript:alert(1)',footer:'x'}));
});
test('unsubscribe signatures resist tampering and cross-account reuse',()=>{
 const id=randomUUID(),secret='s'.repeat(32),token=lifecycleUnsubscribeToken(id,secret);
 assert.equal(verifyLifecycleUnsubscribe(id,token,secret),true);
 assert.equal(verifyLifecycleUnsubscribe(randomUUID(),token,secret),false);
 assert.equal(verifyLifecycleUnsubscribe(id,token,'t'.repeat(32)),false);
 assert.equal(verifyLifecycleUnsubscribe(id,'0'.repeat(63),secret),false);
 assert.equal(verifyLifecycleUnsubscribe(id,token,''),false);
});

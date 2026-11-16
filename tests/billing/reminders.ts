import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {and,eq} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {users,workspaces,workspaceMembers,workspaceSubscriptions,jobs} from '@/server/db/schema';
import {enqueuePrepaidReminders,processTrialEmails,enqueueTrialEmails} from '@/server/billing/trial-emails';
declare const global:typeof globalThis&{emailCalls:Record<string,unknown>[];chatEmailFail:boolean;trialProvider:Record<string,unknown>};
export async function run(){
 const db=getDb(),token=randomUUID();
 const [owner,member]=await db.insert(users).values(['owner','member'].map(role=>({clerkUserId:role+token,email:role+token+'@example.com'}))).returning();
 const [workspace]=await db.insert(workspaces).values({name:'Reminder fixture',handle:'renewal-'+token.replaceAll('-','')}).returning();
 await db.insert(workspaceMembers).values([{workspaceId:workspace.id,userId:owner.id,role:'owner'},{workspaceId:workspace.id,userId:member.id,role:'member'}]);
 let until=new Date(Date.now()+2*86400000);
 await db.insert(workspaceSubscriptions).values({workspaceId:workspace.id,status:'none',prepaidUntil:until});
 assert.equal((await enqueuePrepaidReminders()).queued,1);assert.equal((await enqueuePrepaidReminders()).queued,0);
 assert.equal((await processTrialEmails(3)).accepted,1);assert.equal(global.emailCalls.length,1);assert.equal(global.emailCalls[0].to,owner.email);assert.equal((await processTrialEmails(3)).accepted,0);
 const setEnd=async(end:Date)=>db.update(workspaceSubscriptions).set({prepaidUntil:end,status:'none',periodEnd:null}).where(eq(workspaceSubscriptions.workspaceId,workspace.id));
 until=new Date(until.getTime()-10000);await setEnd(until);assert.equal((await enqueuePrepaidReminders()).queued,1);
 await setEnd(new Date(Date.now()+30*86400000));assert.equal((await processTrialEmails(3)).suppressed,1);assert.equal(global.emailCalls.length,1);assert.equal((await enqueuePrepaidReminders()).queued,0);
 until=new Date(until.getTime()-10000);await setEnd(until);await enqueuePrepaidReminders();await db.update(workspaceSubscriptions).set({status:'active',periodEnd:until}).where(eq(workspaceSubscriptions.workspaceId,workspace.id));assert.equal((await processTrialEmails(3)).suppressed,1);assert.equal((await enqueuePrepaidReminders()).queued,0);
 until=new Date(until.getTime()-10000);await setEnd(until);await enqueuePrepaidReminders();await db.update(workspaceMembers).set({status:'suspended'}).where(and(eq(workspaceMembers.workspaceId,workspace.id),eq(workspaceMembers.userId,owner.id)));assert.equal((await processTrialEmails(3)).suppressed,1);assert.equal(global.emailCalls.length,1);
 await db.update(workspaceMembers).set({status:'active'}).where(and(eq(workspaceMembers.workspaceId,workspace.id),eq(workspaceMembers.userId,owner.id)));until=new Date(until.getTime()-10000);await setEnd(until);await enqueuePrepaidReminders();global.chatEmailFail=true;assert.equal((await processTrialEmails(3)).retried,1);
 const [retry]=await db.select().from(jobs).where(and(eq(jobs.type,'prepaid_email'),eq(jobs.status,'pending')));assert.equal(retry.lastError,'Renewal reminder acceptance not confirmed');assert.ok(retry.runAt>new Date());global.chatEmailFail=false;await db.update(jobs).set({runAt:new Date()}).where(eq(jobs.id,retry.id));assert.equal((await processTrialEmails(3)).accepted,1);assert.equal(global.emailCalls.at(-1)?.key,retry.dedupeKey);
 // The same worker retains the existing card-trial start and ending flow.
 const trialEnd=new Date(Date.now()+14*86400000),subscriptionId='sub_fixture';
 await db.update(workspaceSubscriptions).set({status:'trialing',subscriptionId,customerId:'cust_fixture',trialEnd,periodEnd:trialEnd,prepaidUntil:null}).where(eq(workspaceSubscriptions.workspaceId,workspace.id));
 global.trialProvider={id:subscriptionId,status:'trialing',customer:{customer_id:'cust_fixture'},product_id:'prod_fixture',currency:'USD',amount:'7.00',quantity:1,billing_cycle:{interval:'month',frequency:1},current_period_end:trialEnd.toISOString(),trial_end:trialEnd.toISOString(),cancel_at_period_end:false};
 await enqueueTrialEmails(db,{workspaceId:workspace.id,subscriptionId,trialEnd});assert.equal((await processTrialEmails(3)).accepted,1);assert.equal(global.emailCalls.at(-1)?.kind,'started');
 const ending=new Date(Date.now()+2*86400000);await db.update(workspaceSubscriptions).set({trialEnd:ending}).where(eq(workspaceSubscriptions.workspaceId,workspace.id));global.trialProvider={...global.trialProvider,trial_end:ending.toISOString(),cancel_at_period_end:true};await enqueueTrialEmails(db,{workspaceId:workspace.id,subscriptionId,trialEnd:ending});assert.equal((await processTrialEmails(3)).accepted,1);assert.equal(global.emailCalls.at(-1)?.kind,'ending');assert.equal(global.emailCalls.at(-1)?.cancelAtPeriodEnd,true);
 console.log('PASS prepaid reminders: owner-only delivery, three-day discovery, deduplication, extensions, active subscriptions, revoked membership, retry/backoff and stable email idempotency. Isolated schema; no live emails sent.');
}

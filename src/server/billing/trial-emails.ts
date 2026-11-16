import 'server-only';
import {and,asc,eq,lt,lte,sql,inArray,gt,not,or,isNotNull} from 'drizzle-orm';
import {z} from 'zod';
import {getDb,type Queryable} from '@/server/db/client';
import {jobs,users,workspaceMembers,workspaces,workspaceSubscriptions} from '@/server/db/schema';
import {getServerEnv} from '@/server/env';
import {prepaidReminderEligible,prepaidReminderLead} from '@/lib/billing-reminders';
import {sendTrialEmail,sendPrepaidReminderEmail} from '@/server/email';
import {bachsClient} from './client';
import {billingSnapshot} from './snapshot';

const payloadSchema=z.union([z.object({userId:z.uuid(),workspaceId:z.uuid(),subscriptionId:z.string().startsWith('sub_'),kind:z.enum(['started','ending']),trialEnd:z.iso.datetime({offset:true})}),z.object({userId:z.uuid(),workspaceId:z.uuid(),kind:z.literal('prepaid_ending'),prepaidUntil:z.iso.datetime({offset:true})})]);
const reminderLead=3*24*60*60*1000;
// Called in the verified subscription-webhook transaction, never by a browser.
export async function enqueueTrialEmails(db:Queryable,input:{workspaceId:string;subscriptionId:string;trialEnd:Date},now=new Date()){
 if(input.trialEnd<=now)return;
 const owners=await db.select({id:users.id}).from(workspaceMembers).innerJoin(users,eq(users.id,workspaceMembers.userId)).where(and(eq(workspaceMembers.workspaceId,input.workspaceId),eq(workspaceMembers.role,'owner'),eq(workspaceMembers.status,'active'),sql`${users.email} is not null`));
 for(const owner of owners)for(const kind of ['started','ending'] as const){
  const trialEnd=input.trialEnd.toISOString();
  await db.insert(jobs).values({type:'trial_email',payload:{userId:owner.id,...input,trialEnd,kind},runAt:kind==='started'?now:new Date(Math.max(now.getTime(),input.trialEnd.getTime()-reminderLead)),dedupeKey:`trial:${input.subscriptionId}:${owner.id}:${kind}${kind==='ending'?':'+trialEnd:''}`}).onConflictDoNothing();
 }
}

/** Finds due prepaid renewals, including access purchased before this reminder existed. */
export async function enqueuePrepaidReminders(limit=3){
 const db=getDb(),now=new Date();
 const noOtherAccess=not(or(eq(workspaceSubscriptions.status,'past_due'),and(eq(workspaceSubscriptions.status,'active'),isNotNull(workspaceSubscriptions.periodEnd),gt(workspaceSubscriptions.periodEnd,now)),and(eq(workspaceSubscriptions.status,'trialing'),isNotNull(workspaceSubscriptions.trialEnd),gt(workspaceSubscriptions.trialEnd,now)))!);
 const missing=sql`not exists (select 1 from ${jobs} where ${jobs.dedupeKey} = 'prepaid:' || ${workspaceSubscriptions.workspaceId}::text || ':' || ${users.id}::text || ':' || floor(extract(epoch from ${workspaceSubscriptions.prepaidUntil})*1000)::bigint::text)`;
 const rows=await db.select({workspaceId:workspaceSubscriptions.workspaceId,userId:users.id,until:workspaceSubscriptions.prepaidUntil}).from(workspaceSubscriptions).innerJoin(workspaceMembers,eq(workspaceMembers.workspaceId,workspaceSubscriptions.workspaceId)).innerJoin(users,eq(users.id,workspaceMembers.userId)).where(and(gt(workspaceSubscriptions.prepaidUntil,now),lte(workspaceSubscriptions.prepaidUntil,new Date(now.getTime()+prepaidReminderLead)),eq(workspaceMembers.role,'owner'),eq(workspaceMembers.status,'active'),isNotNull(users.email),noOtherAccess,missing)).orderBy(asc(workspaceSubscriptions.prepaidUntil)).limit(Math.max(1,Math.min(100,limit)));
 let queued=0;
 for(const row of rows){if(!row.until)continue;const inserted=await db.insert(jobs).values({type:'prepaid_email',payload:{userId:row.userId,workspaceId:row.workspaceId,kind:'prepaid_ending',prepaidUntil:row.until.toISOString()},dedupeKey:`prepaid:${row.workspaceId}:${row.userId}:${row.until.getTime()}`}).onConflictDoNothing().returning({id:jobs.id});queued+=inserted.length;}
 return {queued};
}

export async function processTrialEmails(limit=1){
 const env=getServerEnv(),result={configured:Boolean(env.SENDBYTE_API_KEY&&env.EMAIL_FROM),accepted:0,suppressed:0,retried:0,failed:0};
 if(!result.configured)return result;
 const db=getDb(),now=new Date();
 const claimed=await db.transaction(async tx=>{
  const expired=and(inArray(jobs.type,['trial_email','prepaid_email']),eq(jobs.status,'running'),lt(jobs.lockedAt,new Date(now.getTime()-10*60_000)));
  await tx.update(jobs).set({status:'failed',lockedAt:null,lastError:'Worker lease expired after final attempt',updatedAt:now}).where(and(expired,sql`${jobs.attempts} >= ${jobs.maxAttempts}`));
  await tx.update(jobs).set({status:'pending',lockedAt:null,updatedAt:now}).where(and(expired,sql`${jobs.attempts} < ${jobs.maxAttempts}`));
  const due=await tx.select().from(jobs).where(and(inArray(jobs.type,['trial_email','prepaid_email']),eq(jobs.status,'pending'),lte(jobs.runAt,now),sql`${jobs.attempts} < ${jobs.maxAttempts}`)).orderBy(asc(jobs.runAt),asc(jobs.id)).limit(Math.max(1,Math.min(3,limit))).for('update',{skipLocked:true});
  const rows:(typeof jobs.$inferSelect)[]=[];
  for(const job of due){const [row]=await tx.update(jobs).set({status:'running',attempts:job.attempts+1,lockedAt:now,updatedAt:now}).where(eq(jobs.id,job.id)).returning();rows.push(row);}
  return rows;
 });
 for(const job of claimed){
  const lease=and(eq(jobs.id,job.id),eq(jobs.status,'running'),eq(jobs.attempts,job.attempts),eq(jobs.lockedAt,now));
  try{
   const parsed=payloadSchema.safeParse(job.payload);
   if(!parsed.success){await db.update(jobs).set({status:'failed',lockedAt:null,lastError:'Invalid trial email payload',updatedAt:new Date()}).where(lease);result.failed++;continue;}
   const payload=parsed.data;
   const [recipient]=await db.select({email:users.email,name:workspaces.name,subscription:workspaceSubscriptions}).from(workspaceMembers).innerJoin(users,eq(users.id,workspaceMembers.userId)).innerJoin(workspaces,eq(workspaces.id,workspaceMembers.workspaceId)).innerJoin(workspaceSubscriptions,eq(workspaceSubscriptions.workspaceId,workspaces.id)).where(and(eq(workspaceMembers.userId,payload.userId),eq(workspaceMembers.workspaceId,payload.workspaceId),eq(workspaceMembers.role,'owner'),eq(workspaceMembers.status,'active'))).limit(1);
   let sent=false;
   if(payload.kind==='prepaid_ending'){
    if(recipient?.email&&prepaidReminderEligible(recipient.subscription,payload.prepaidUntil)){await sendPrepaidReminderEmail({to:recipient.email,key:job.dedupeKey!,workspaceName:recipient.name,workspaceId:payload.workspaceId,accessUntil:payload.prepaidUntil,appOrigin:env.NEXT_PUBLIC_APP_URL});sent=true;}
   }else if(recipient?.email&&recipient.subscription.subscriptionId===payload.subscriptionId&&recipient.subscription.status==='trialing'){
    // Fresh provider truth suppresses delayed messages after cancellation, payment
    // or trial extensions, even when the corresponding webhook is still delayed.
    const current=billingSnapshot.parse(await bachsClient().subscriptions.get(payload.subscriptionId));
    if(current.id!==payload.subscriptionId||current.customer.customer_id!==recipient.subscription.customerId)throw Error('Trial billing identity mismatch');
    const end=current.trial_end?new Date(current.trial_end):null;
    const eligible=current.status==='trialing'&&end&&end>new Date()&&(payload.kind==='started'||(end.toISOString()===new Date(payload.trialEnd).toISOString()&&end.getTime()-Date.now()<=reminderLead));
    if(eligible&&end){await sendTrialEmail({to:recipient.email,key:job.dedupeKey!,kind:payload.kind,workspaceName:recipient.name,trialEnd:end.toISOString(),cancelAtPeriodEnd:Boolean(current.cancel_at_period_end),appOrigin:env.NEXT_PUBLIC_APP_URL});sent=true;}
   }
   await db.update(jobs).set({status:'succeeded',lockedAt:null,lastError:null,updatedAt:new Date()}).where(lease);
   result[sent?'accepted':'suppressed']++;
  }catch{
   const failed=job.attempts>=job.maxAttempts;
   await db.update(jobs).set({status:failed?'failed':'pending',lockedAt:null,lastError:job.type==='prepaid_email'?'Renewal reminder acceptance not confirmed':'Trial email acceptance not confirmed',runAt:new Date(Date.now()+Math.min(3600,30*2**(job.attempts-1))*1000),updatedAt:new Date()}).where(lease);
   result[failed?'failed':'retried']++;
  }
 }
 return result;
}

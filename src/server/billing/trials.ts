import 'server-only';
import {createHash} from 'node:crypto';
import {and,eq,inArray,isNotNull,isNull,or} from 'drizzle-orm';
import type {Queryable} from '@/server/db/client';
import {billingCheckouts,billingTrialClaims,workspaceMembers,workspaceSubscriptions} from '@/server/db/schema';
import {getServerEnv} from '@/server/env';
import {ServiceError} from '@/server/result';
import {bachsClient} from './client';

type Actor={clerkUserId:string;email:string|null;id:string};
export function trialSubjects(workspaceId:string,user:Actor){
 const environment=getServerEnv().BACHS_API_KEY?.startsWith('sk_live_')?'live':'sandbox';
 const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
 return [`${environment}:workspace:${workspaceId}`,`${environment}:account:${hash(user.clerkUserId)}`,...(user.email?[`${environment}:email:${hash(user.email.trim().toLowerCase())}`]:[])].sort();
}
export async function trialAlreadyUsed(db:Queryable,workspaceId:string,user:Actor){
 const [claim]=await db.select({subject:billingTrialClaims.subject}).from(billingTrialClaims).where(and(inArray(billingTrialClaims.subject,trialSubjects(workspaceId,user)),isNotNull(billingTrialClaims.usedAt))).limit(1);
 if(claim)return true;
 // Legacy subscriptions predate the ledger; retain their recorded restriction.
 const [legacy]=await db.select({id:workspaceSubscriptions.workspaceId}).from(workspaceSubscriptions).innerJoin(workspaceMembers,eq(workspaceMembers.workspaceId,workspaceSubscriptions.workspaceId)).where(and(eq(workspaceMembers.userId,user.id),eq(workspaceMembers.role,'owner'),eq(workspaceSubscriptions.trialUsed,true))).limit(1);
 return Boolean(legacy);
}
export const trialUsedMessage='Your free trial has already been used. Use a one-time payment to continue with Essentials.';

// An old reservation is reusable only once Bachs confirms the checkout cannot
// still start a trial. Never assume an elapsed local timer means it was unpaid.
export async function releasableTrialAttempts(db:Queryable,subjects:string[]){
 const claims=await db.select().from(billingTrialClaims).where(inArray(billingTrialClaims.subject,subjects));
 const releasable:string[]=[];
 for(const id of new Set(claims.filter(c=>!c.usedAt&&c.expiresAt<=new Date()&&c.checkoutAttemptId).map(c=>c.checkoutAttemptId!))){
  const [attempt]=await db.select().from(billingCheckouts).where(eq(billingCheckouts.id,id)).limit(1);
  if(!attempt?.checkoutId)continue;
  const checkout=await bachsClient().checkoutSessions.get(attempt.checkoutId);
  if(checkout.checkout_id===attempt.checkoutId&&['expired','canceled','cancelled'].includes(checkout.status))releasable.push(id);
 }
 return releasable;
}
export async function reserveTrial(db:Queryable,subjects:string[],attemptId:string,expiresAt:Date,releasable:string[]){
 for(const subject of subjects){
  const [claim]=await db.insert(billingTrialClaims).values({subject,checkoutAttemptId:attemptId,expiresAt}).onConflictDoUpdate({target:billingTrialClaims.subject,set:{checkoutAttemptId:attemptId,expiresAt,updatedAt:new Date()},setWhere:and(isNull(billingTrialClaims.usedAt),or(eq(billingTrialClaims.checkoutAttemptId,attemptId),...(releasable.length?[inArray(billingTrialClaims.checkoutAttemptId,releasable)]:[])))}).returning({subject:billingTrialClaims.subject});
  if(!claim)throw new ServiceError('conflict','A trial is already used or reserved for this account or workspace. Complete the existing checkout, or choose Pay once.');
 }
}
export async function consumeTrial(db:Queryable,attemptId:string){
 await db.update(billingTrialClaims).set({usedAt:new Date(),updatedAt:new Date()}).where(and(eq(billingTrialClaims.checkoutAttemptId,attemptId),isNull(billingTrialClaims.usedAt)));
}

import 'server-only';
import {z} from 'zod';
import {createHash} from 'node:crypto';
import {and,eq,lt} from 'drizzle-orm';
import {requireAppUser} from '@/server/auth';
import {getDb} from '@/server/db/client';
import {workspaces,workspaceSubscriptions,billingCheckouts,rateLimits} from '@/server/db/schema';
import {requireWorkspaceRole} from '@/server/services/access';
import {consumeRateLimit} from '@/server/rate-limit';
import {ServiceError} from '@/server/result';
import {bachsClient,billingProduct} from './client';
import {billingSnapshot,subscriptionValues,recordedBillingProduct} from './snapshot';
import {readBillingSummary} from './summary';
import {pendingBillingInterval} from './pending';
import {changeSubscriptionProduct} from './subscription-api';
import type {BillingInterval} from '@/lib/billing';

export type SubscriptionChange={kind:'interval';interval:BillingInterval}|{kind:'cancel'};
async function authorizedSubscription(workspaceId:string){
 const user=await requireAppUser(),db=getDb();
 await requireWorkspaceRole(db,{workspaceId,userId:user.id,minimumRole:'owner'});
 const [row]=await db.select().from(workspaceSubscriptions).where(eq(workspaceSubscriptions.workspaceId,workspaceId)).limit(1);
 if(!row?.subscriptionId||!row.customerId)throw new ServiceError('not_found','No subscription was found. Refresh billing or contact support.');
 return row;
}
async function syncCurrent(workspaceId:string,row:Awaited<ReturnType<typeof authorizedSubscription>>){
 const db=getDb();
 for(let attempt=0;attempt<3;attempt++){
  const fetchedAt=new Date(),raw=await bachsClient().subscriptions.get(row.subscriptionId!);
  const candidate=billingSnapshot.parse(raw);
  if(candidate.id!==row.subscriptionId||candidate.customer.customer_id!==row.customerId)throw new ServiceError('forbidden','Billing ownership could not be verified. Contact support.');
  const checkoutId=z.uuid().safeParse(candidate.metadata?.checkout_attempt_id);
  const [checkout]=checkoutId.success?await db.select().from(billingCheckouts).where(and(eq(billingCheckouts.id,checkoutId.data),eq(billingCheckouts.workspaceId,workspaceId))).limit(1):[];
  const values=subscriptionValues(candidate,recordedBillingProduct(candidate,checkout,workspaceId));
  const applied=await db.transaction(async tx=>{
   await tx.select({id:workspaces.id}).from(workspaces).where(eq(workspaces.id,workspaceId)).for('update');
   const [current]=await tx.select().from(workspaceSubscriptions).where(eq(workspaceSubscriptions.workspaceId,workspaceId)).limit(1);
   if(current?.subscriptionId!==candidate.id||current.customerId!==candidate.customer.customer_id)throw new ServiceError('conflict','The subscription changed. Refresh billing and try again.');
   if(current.updatedAt>fetchedAt)return false;
   await tx.update(workspaceSubscriptions).set(values).where(eq(workspaceSubscriptions.workspaceId,workspaceId));return true;
  });
  if(applied)return {candidate,...pendingBillingInterval(raw)};
 }
 throw new ServiceError('conflict','Billing is updating. Refresh the subscription in a moment.');
}
export async function loadSubscriptionManagement(workspaceId:string){
 const row=await authorizedSubscription(workspaceId);
 await consumeRateLimit('billing-management-read:'+workspaceId,30,60);
 const state=await syncCurrent(workspaceId,row);
 return {summary:await readBillingSummary(workspaceId,true),pendingChange:state.pendingChange,pendingInterval:state.pendingInterval};
}
export async function manageSubscription(workspaceId:string,change:SubscriptionChange){
 const row=await authorizedSubscription(workspaceId),db=getDb();
 await consumeRateLimit('billing-management-write:'+workspaceId,6,60);
 // A short durable lease serializes writes across tabs/instances without holding a DB lock over HTTP.
 const key=createHash('sha256').update('billing-management-lease:'+workspaceId).digest('hex');
 const expiresAt=new Date(Date.now()+120_000);
 const [lease]=await db.insert(rateLimits).values({key,count:1,expiresAt}).onConflictDoUpdate({target:rateLimits.key,set:{count:1,expiresAt},setWhere:lt(rateLimits.expiresAt,new Date())}).returning({key:rateLimits.key});
 if(!lease)throw new ServiceError('conflict','A subscription change is already in progress. Refresh in a moment.');
 try{
  const before=await syncCurrent(workspaceId,row),current=before.candidate;
  const active=['active','trialing','past_due','unpaid','paused'].includes(current.status);
  if(change.kind==='cancel'){
   if(active&&!current.cancel_at_period_end){
    await bachsClient().subscriptions.cancel(current.id,{cancel_at_period_end:true,reason:'Requested by workspace owner'},{idempotencyKey:`ent-cancel:${current.id}:${current.current_period_end}`});
   }
  }else{
   if(!['active','trialing'].includes(current.status))throw new ServiceError('conflict','Plan changes are available for active subscriptions and trials. Resolve any payment issue first.');
   if(current.cancel_at_period_end)throw new ServiceError('conflict','Cancellation is scheduled. Contact support before changing the billing period.');
   if(before.pendingChange&&before.pendingInterval!==change.interval)throw new ServiceError('conflict','A billing-period change is already scheduled. Refresh billing to review it.');
   const currentInterval=current.billing_cycle.interval==='month'?'monthly':'yearly';
   if(currentInterval!==change.interval&&!before.pendingChange){
    const targetId=billingProduct(change.interval),target=await bachsClient().products.get(targetId);
    if(target.id!==targetId||target.archived_at||target.price.currency!=='USD'||target.price.price_type!=='fixed'||Number(target.price.amount)!==(change.interval==='monthly'?7:70)||target.billing_cycle?.frequency!==1||target.billing_cycle.interval!==(change.interval==='monthly'?'month':'year'))throw new ServiceError('retryable','The billing plan needs attention. Contact support.');
    await changeSubscriptionProduct(current.id,target.id,`ent-period:${current.id}:${current.current_period_end}:${change.interval}`);
   }
  }
  const after=await syncCurrent(workspaceId,row);
  if(change.kind==='cancel'&&after.candidate.status!=='canceled'&&!after.candidate.cancel_at_period_end)throw new ServiceError('retryable','Bachs has not confirmed cancellation yet. Refresh the subscription to check its status.');
  if(change.kind==='interval'&&(after.candidate.billing_cycle.interval==='month'?'monthly':'yearly')!==change.interval&&(!after.pendingChange||after.pendingInterval!==change.interval))throw new ServiceError('retryable','Bachs has not confirmed the new billing period yet. Refresh the subscription before trying again.');
  return {summary:await readBillingSummary(workspaceId,true),pendingChange:after.pendingChange,pendingInterval:after.pendingInterval};
 }finally{await db.delete(rateLimits).where(and(eq(rateLimits.key,key),eq(rateLimits.expiresAt,expiresAt)));}
}

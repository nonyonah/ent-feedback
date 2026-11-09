import 'server-only';
import {z} from 'zod';
import {and,eq,desc} from 'drizzle-orm';
import type {WebhookEvent} from '@bachs/sdk';
import {getDb} from '@/server/db/client';
import {workspaces,workspaceSubscriptions,billingCheckouts,billingWebhookEvents} from '@/server/db/schema';
import {getServerEnv} from '@/server/env';
import {bachsClient,billingProduct} from './client';
import {billingPlan,type BillingInterval} from '@/lib/billing';

const snapshot=z.object({id:z.string().startsWith('sub_'),status:z.enum(['trialing','active','past_due','unpaid','canceled','paused']),customer:z.object({customer_id:z.string().startsWith('cust_')}),product_id:z.string().startsWith('prod_').optional(),product:z.object({id:z.string().startsWith('prod_')}).optional(),currency:z.literal('USD'),amount:z.string(),billing_cycle:z.object({interval:z.enum(['month','year']),frequency:z.literal(1)}),quantity:z.literal(1),current_period_end:z.iso.datetime({offset:true}),trial_end:z.iso.datetime({offset:true}).nullable().optional(),cancel_at_period_end:z.boolean().optional(),metadata:z.record(z.string(),z.unknown()).optional()}).refine(value=>Boolean(value.product_id||value.product?.id),{message:'Missing subscription product',path:['product']}).refine(value=>!value.product_id||!value.product||value.product_id===value.product.id,{message:'Subscription product mismatch',path:['product']}).transform(value=>({...value,product_id:value.product_id??value.product!.id}));
const supported=new Set(['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed']);
export async function applyBillingEvent(event:WebhookEvent){
 if(event.organization_id!==getServerEnv().BACHS_ORGANIZATION_ID)throw Error('Billing organization mismatch');
 if(!supported.has(event.type))return;
 const nested=z.object({subscription_id:z.string()}).safeParse(event.data.subscription);
 const rawId=event.type.startsWith('invoice.')?(nested.success?nested.data.subscription_id:null):event.data.subscription_id;
 if(event.type.startsWith('invoice.')&&!rawId)return;
 const subscriptionId=z.string().startsWith('sub_').parse(rawId);
 const db=getDb();
 // Event IDs are unique, but the current provider snapshot also protects against out-of-order deliveries.
 await db.transaction(async tx=>{
  const [receipt]=await tx.insert(billingWebhookEvents).values({id:event.id,type:event.type}).onConflictDoNothing().returning();if(!receipt)return;
  const remote=await bachsClient().subscriptions.get(subscriptionId);
  const candidate=snapshot.parse(remote);
  if(candidate.id!==subscriptionId)throw Error('Subscription identity mismatch');
  const [known]=await tx.select().from(workspaceSubscriptions).where(eq(workspaceSubscriptions.subscriptionId,subscriptionId)).limit(1);
  const attemptId=z.uuid().safeParse(candidate.metadata?.checkout_attempt_id);
  const [attempt]=attemptId.success?await tx.select().from(billingCheckouts).where(eq(billingCheckouts.id,attemptId.data)).limit(1):[];
  const workspaceId=known?.workspaceId??attempt?.workspaceId;
  if(!workspaceId)throw Error('Subscription has no checkout binding');
  await tx.select({id:workspaces.id}).from(workspaces).where(eq(workspaces.id,workspaceId)).for('update');
  const [current]=await tx.select().from(workspaceSubscriptions).where(eq(workspaceSubscriptions.workspaceId,workspaceId)).limit(1);
  if(!known&&attempt){const [latestAttempt]=await tx.select({id:billingCheckouts.id}).from(billingCheckouts).where(eq(billingCheckouts.workspaceId,workspaceId)).orderBy(desc(billingCheckouts.createdAt)).limit(1);if(latestAttempt?.id!==attempt.id)return;}
  if(current?.subscriptionId&&current.subscriptionId!==subscriptionId&&current.status!=='canceled')throw Error('Workspace already has another subscription');
  if(!known&&(!attempt||candidate.metadata?.workspace_id!==workspaceId||attempt.productId!==candidate.product_id))throw Error('Checkout binding mismatch');
  // Fetch once more under the workspace lock; a concurrent webhook cannot write an older fetched state afterwards.
  const latest=snapshot.parse(await bachsClient().subscriptions.get(subscriptionId));
  if(latest.id!==subscriptionId||latest.customer.customer_id!==candidate.customer.customer_id)throw Error('Subscription identity changed');
  const interval:BillingInterval=latest.billing_cycle.interval==='month'?'monthly':'yearly';
  if(![billingProduct(interval,false),billingProduct(interval,true)].includes(latest.product_id)||Number(latest.amount)!==Number(interval==='monthly'?billingPlan.monthly:billingPlan.yearly))throw Error('Unexpected billing plan');
  if(latest.status==='trialing'&&!latest.trial_end)throw Error('Missing trial end');
  const values={customerId:latest.customer.customer_id,subscriptionId,status:latest.status,interval,trialUsed:true,trialEnd:latest.trial_end?new Date(latest.trial_end):null,periodEnd:new Date(latest.current_period_end),cancelAtPeriodEnd:latest.cancel_at_period_end??false,updatedAt:new Date()};
  await tx.insert(workspaceSubscriptions).values({workspaceId,...values}).onConflictDoUpdate({target:workspaceSubscriptions.workspaceId,set:values});
  if(attempt)await tx.update(billingCheckouts).set({status:'completed',checkoutUrl:null,updatedAt:new Date()}).where(and(eq(billingCheckouts.id,attempt.id),eq(billingCheckouts.workspaceId,workspaceId)));
 });
}

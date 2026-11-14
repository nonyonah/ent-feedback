import 'server-only';
import {z} from 'zod';
import {and,eq,desc} from 'drizzle-orm';
import type {WebhookEvent} from '@bachs/sdk';
import {getDb} from '@/server/db/client';
import {workspaces,workspaceSubscriptions,billingCheckouts,billingWebhookEvents} from '@/server/db/schema';
import {applyPrepaidEvent} from './prepaid';
import {getServerEnv} from '@/server/env';
import {bachsClient} from './client';
import {billingSnapshot,subscriptionValues,recordedBillingProduct} from './snapshot';

const supported=new Set(['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed']);
/** Raised when another webhook wrote newer provider state while this one waited for the lock. */
const staleSnapshot=Error('Stale billing snapshot');
export async function applyBillingEvent(event:WebhookEvent){
 if(event.organization_id!==getServerEnv().BACHS_ORGANIZATION_ID)throw Error('Billing organization mismatch');
 if(event.type==='checkout.completed'||event.type.startsWith('collection.')||event.type.startsWith('refund.')){await applyPrepaidEvent(event);return;}
 if(!supported.has(event.type))return;
 const nested=z.object({subscription_id:z.string()}).safeParse(event.data.subscription);
 const rawId=event.type.startsWith('invoice.')?(nested.success?nested.data.subscription_id:null):event.data.subscription_id;
 if(event.type.startsWith('invoice.')&&!rawId)return;
 const subscriptionId=z.string().startsWith('sub_').parse(rawId);
 const db=getDb();
 // Provider calls happen outside the transaction. Holding a pooled connection
 // and a workspace row lock across network calls blocks every other request
 // for that workspace and can exhaust the pool.
 for(let attempt=0;attempt<3;attempt++){
  const fetchedAt=new Date();
  const candidate=billingSnapshot.parse(await bachsClient().subscriptions.get(subscriptionId));
  if(candidate.id!==subscriptionId)throw Error('Subscription identity mismatch');
  try{
   await db.transaction(async tx=>{
    // Event IDs are unique, but the current provider snapshot also protects against out-of-order deliveries.
    const [receipt]=await tx.insert(billingWebhookEvents).values({id:event.id,type:event.type}).onConflictDoNothing().returning();if(!receipt)return;
    const [known]=await tx.select().from(workspaceSubscriptions).where(eq(workspaceSubscriptions.subscriptionId,subscriptionId)).limit(1);
    const attemptId=z.uuid().safeParse(candidate.metadata?.checkout_attempt_id);
    const [checkout]=attemptId.success?await tx.select().from(billingCheckouts).where(eq(billingCheckouts.id,attemptId.data)).limit(1):[];
    const workspaceId=known?.workspaceId??checkout?.workspaceId;
    if(!workspaceId)throw Error('Subscription has no checkout binding');
    await tx.select({id:workspaces.id}).from(workspaces).where(eq(workspaces.id,workspaceId)).for('update');
    const [current]=await tx.select().from(workspaceSubscriptions).where(eq(workspaceSubscriptions.workspaceId,workspaceId)).limit(1);
    // Another webhook wrote after this snapshot was fetched. Roll back and fetch again.
    if(current&&current.updatedAt>fetchedAt)throw staleSnapshot;
    if(!known&&checkout){const [latestAttempt]=await tx.select({id:billingCheckouts.id}).from(billingCheckouts).where(eq(billingCheckouts.workspaceId,workspaceId)).orderBy(desc(billingCheckouts.createdAt)).limit(1);if(latestAttempt?.id!==checkout.id)return;}
    if(current?.subscriptionId&&current.subscriptionId!==subscriptionId&&current.status!=='canceled')throw Error('Workspace already has another subscription');
    if(current?.customerId&&current.customerId!==candidate.customer.customer_id)throw Error('Subscription identity changed');
    if(!known&&(!checkout||checkout.mode!=='subscription'||candidate.metadata?.workspace_id!==workspaceId||checkout.productId!==candidate.product_id))throw Error('Checkout binding mismatch');
    const values=subscriptionValues(candidate,known?recordedBillingProduct(candidate,checkout,workspaceId):undefined);
    await tx.insert(workspaceSubscriptions).values({workspaceId,...values}).onConflictDoUpdate({target:workspaceSubscriptions.workspaceId,set:values});
    if(checkout)await tx.update(billingCheckouts).set({status:'completed',checkoutUrl:null,updatedAt:new Date()}).where(and(eq(billingCheckouts.id,checkout.id),eq(billingCheckouts.workspaceId,workspaceId)));
   });
   return;
  }catch(error){
   if(error!==staleSnapshot)throw error;
  }
 }
 throw Error('Billing state kept changing while applying the event');
}

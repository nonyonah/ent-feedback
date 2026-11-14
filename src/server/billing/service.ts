import 'server-only';
import {randomUUID} from 'node:crypto';
import {and,desc,eq,inArray} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {workspaces,workspaceSubscriptions,billingCheckouts} from '@/server/db/schema';
import {requireAppUser} from '@/server/auth';
import {requireWorkspaceRole} from '@/server/services/access';
import {getServerEnv} from '@/server/env';
import {ServiceError} from '@/server/result';
import {consumeRateLimit} from '@/server/rate-limit';
import {billingPlan,type BillingInterval} from '@/lib/billing';
import {bachsClient,billingProduct,billingReady,billingRedirect} from './client';

export async function startCheckout(workspaceId:string,interval:BillingInterval){
 const user=await requireAppUser();const db=getDb();
 await requireWorkspaceRole(db,{workspaceId,userId:user.id,minimumRole:'owner'});
 if(!billingReady())throw new ServiceError('retryable','Billing setup is still in progress. Please try again later.');
 if(!user.email)throw new ServiceError('validation','Add a verified email address to your account before subscribing.');
 await consumeRateLimit('billing:'+workspaceId,6,60);
 const attempt=await db.transaction(async tx=>{
  await tx.select({id:workspaces.id}).from(workspaces).where(eq(workspaces.id,workspaceId)).for('update');
  const [subscription]=await tx.select().from(workspaceSubscriptions).where(eq(workspaceSubscriptions.workspaceId,workspaceId)).limit(1);
  if(subscription&&['active','trialing','past_due','paused','unpaid'].includes(subscription.status))throw new ServiceError('conflict','This workspace already has a subscription. Use Manage subscription instead.');
  const [pending]=await tx.select().from(billingCheckouts).where(and(eq(billingCheckouts.workspaceId,workspaceId),inArray(billingCheckouts.status,['creating','open']))).orderBy(desc(billingCheckouts.createdAt)).limit(1);
  if(pending&&pending.expiresAt.getTime()>Date.now()&&pending.productId===billingProduct(pending.interval)){
   if(pending.interval!==interval)throw new ServiceError('conflict','A checkout is already open for the other billing period. Complete it or wait for it to expire before switching.');
   return pending;
  }
  if(pending)await tx.update(billingCheckouts).set({status:'expired',checkoutUrl:null,updatedAt:new Date()}).where(eq(billingCheckouts.id,pending.id));
  const [created]=await tx.insert(billingCheckouts).values({id:randomUUID(),workspaceId,interval,productId:billingProduct(interval),expiresAt:new Date(Date.now()+31*60_000)}).returning();
  return created;
 });
 if(attempt.status==='open'&&attempt.checkoutUrl)return {url:billingRedirect(attempt.checkoutUrl,'checkout')};
 const client=bachsClient();
 // Verify the catalog rather than trusting a client amount or a dashboard label.
 const product=await client.products.get(attempt.productId);
 const expected=interval==='monthly'?billingPlan.monthly:billingPlan.yearly;
 const trialPeriod=product.trial_period as {interval?:unknown;frequency?:unknown}|undefined;
 if(product.price.currency!=='USD'||product.price.price_type!=='fixed'||Number(product.price.amount)!==Number(expected)||product.billing_cycle?.interval!==(interval==='monthly'?'month':'year')||product.billing_cycle?.frequency!==1||!trialPeriod||trialPeriod.interval!=='day'||trialPeriod.frequency!==14||product.archived_at)throw new ServiceError('retryable','The billing catalog needs attention. Please contact the workspace owner.');
 const env=getServerEnv();
 const origin=env.BACHS_RETURN_ORIGIN??env.NEXT_PUBLIC_APP_URL;
 if(new URL(origin).hostname==='localhost'||new URL(origin).hostname==='127.0.0.1')throw new ServiceError('retryable','Checkout needs a public return URL. Configure BACHS_RETURN_ORIGIN with your HTTPS test tunnel.');
 const checkout=await client.checkoutSessions.create({product_cart:[{product_id:attempt.productId,quantity:1}],customer:{email:user.email,name:user.name||'Workspace owner'},billing_currency:'USD',payment_method_types:['USD_CARD'],reference:attempt.id,metadata:{workspace_id:workspaceId,checkout_attempt_id:attempt.id},success_url:new URL('/dashboard/settings/billing?checkout=returned',origin).href,cancel_url:new URL('/dashboard/settings/billing?checkout=canceled',origin).href,expires_in_minutes:30},{idempotencyKey:'ent-checkout:'+attempt.id});
 const url=billingRedirect(checkout.checkout_url,'checkout');
 await db.update(billingCheckouts).set({checkoutId:checkout.checkout_id,checkoutUrl:url,status:'open',expiresAt:new Date(checkout.expires_at),updatedAt:new Date()}).where(and(eq(billingCheckouts.id,attempt.id),eq(billingCheckouts.status,'creating')));
 return {url};
}
export async function openBillingPortal(workspaceId:string){
 const user=await requireAppUser();const db=getDb();await requireWorkspaceRole(db,{workspaceId,userId:user.id,minimumRole:'owner'});
 await consumeRateLimit('billing-portal:'+workspaceId,6,60);
 const [subscription]=await db.select().from(workspaceSubscriptions).where(eq(workspaceSubscriptions.workspaceId,workspaceId)).limit(1);
 if(!subscription?.customerId)throw new ServiceError('not_found','Start a subscription before opening billing management.');
 const session=await bachsClient().customerPortal.createSession(subscription.customerId);
 return {url:billingRedirect(session.url,'portal')};
}

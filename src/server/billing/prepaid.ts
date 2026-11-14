import 'server-only';
import {z} from 'zod';
import {and,eq,asc} from 'drizzle-orm';
import type {WebhookEvent} from '@bachs/sdk';
import {getDb} from '@/server/db/client';
import {workspaces,workspaceSubscriptions,billingCheckouts,billingWebhookEvents} from '@/server/db/schema';
import {bachsClient} from './client';
import {billingPlan,prepaidPeriodEnd,type BillingInterval} from '@/lib/billing';

const prepaidCheckout=z.object({checkout_id:z.string().startsWith('chk_'),status:z.string(),currency:z.literal('USD'),amount:z.string(),reference:z.uuid(),recurring:z.null(),payment_status:z.string().nullable(),charge:z.object({payment_id:z.string()}).nullable(),metadata:z.object({workspace_id:z.uuid(),checkout_attempt_id:z.uuid(),billing_mode:z.literal('prepaid')})});
export function verifiedPrepaidCheckout(raw:unknown,order:{id:string;workspaceId:string;checkoutId:string|null;mode:string;interval:string;amount:string|null}){
 const checkout=prepaidCheckout.parse(raw);
 if(order.mode!=='prepaid'||(order.interval!=='monthly'&&order.interval!=='yearly')||checkout.reference!==order.id||checkout.metadata.checkout_attempt_id!==order.id||checkout.metadata.workspace_id!==order.workspaceId||(order.checkoutId&&checkout.checkout_id!==order.checkoutId)||Number(checkout.amount)!==Number(order.amount)||Number(order.amount)!==Number(billingPlan[order.interval]))throw Error('Prepaid checkout binding mismatch');
 return checkout;
}
const stale=Error('Prepaid snapshot changed');
/** Called only after the Bachs webhook signature and organization have been verified. */
export async function applyPrepaidEvent(event:WebhookEvent){
 const data=event.data as Record<string,unknown>,db=getDb();
 const id=z.string().startsWith('chk_').safeParse(data.checkout_id);
 const paymentId=z.string().safeParse(data.charge_id??data.payment_id);
 if(!id.success&&!paymentId.success)return false;
 let [order]=await db.select().from(billingCheckouts).where(id.success?eq(billingCheckouts.checkoutId,id.data):eq(billingCheckouts.paymentId,paymentId.data!)).limit(1);
 // A completion can arrive before checkout creation's final DB update.
 if(!order&&id.success){const raw=await bachsClient().checkoutSessions.get(id.data);const ref=z.uuid().safeParse(raw.reference);if(ref.success)[order]=await db.select().from(billingCheckouts).where(eq(billingCheckouts.id,ref.data)).limit(1);}
 if(!order||order.mode!=='prepaid')return false;
 for(let retry=0;retry<3;retry++){
  const fetchedAt=new Date(),checkout=verifiedPrepaidCheckout(await bachsClient().checkoutSessions.get(order.checkoutId??id.data!),order);
  if(!checkout.charge)return true;
  const payment=await bachsClient().payments.get(checkout.charge.payment_id);
  if(payment.payment_id!==checkout.charge.payment_id||payment.checkout_id!==checkout.checkout_id)throw Error('Prepaid payment identity mismatch');
  const paid=checkout.status==='completed'&&checkout.payment_status==='succeeded'&&['succeeded','overpaid'].includes(payment.status);
  const revoked=['refunded','partially_refunded','auto_refunded','reversed','disputed'].includes(payment.status);
  if(!paid&&!revoked){if(['failed','expired','cancelled','canceled','underpaid'].includes(payment.status))return true;throw Error('Prepaid payment is not confirmed yet');}
  try{
   await db.transaction(async tx=>{
    await tx.select({id:workspaces.id}).from(workspaces).where(eq(workspaces.id,order.workspaceId)).for('update');
    const [current]=await tx.select().from(billingCheckouts).where(eq(billingCheckouts.id,order.id)).limit(1);
    if(current.updatedAt>fetchedAt)throw stale;
    const [receipt]=await tx.insert(billingWebhookEvents).values({id:event.id,type:event.type}).onConflictDoNothing().returning();if(!receipt)return;
    if(current.paymentId&&current.paymentId!==payment.payment_id)throw Error('Prepaid payment changed');
    if(paid&&current.paidAt)return;
    const [subscription]=await tx.select().from(workspaceSubscriptions).where(eq(workspaceSubscriptions.workspaceId,order.workspaceId)).limit(1);
    // Unexpected delayed payments are credited after an already-paid card period.
    const paidAt=current.paidAt??new Date(Math.max(Date.now(),subscription?.periodEnd?.getTime()??0));
    await tx.update(billingCheckouts).set({status:revoked?'revoked':'completed',checkoutId:checkout.checkout_id,checkoutUrl:null,paymentId:payment.payment_id,paidAt,updatedAt:new Date()}).where(eq(billingCheckouts.id,order.id));
    const grants=await tx.select().from(billingCheckouts).where(and(eq(billingCheckouts.workspaceId,order.workspaceId),eq(billingCheckouts.mode,'prepaid'),eq(billingCheckouts.status,'completed'))).orderBy(asc(billingCheckouts.paidAt),asc(billingCheckouts.id));
    let until:Date|null=null,lastInterval:BillingInterval|null=null;
    for(const grant of grants){if(!grant.paidAt||(grant.interval!=='monthly'&&grant.interval!=='yearly'))throw Error('Invalid prepaid grant');const start=new Date(Math.max(grant.paidAt.getTime(),until?.getTime()??0));until=prepaidPeriodEnd(start,grant.interval);lastInterval=grant.interval;await tx.update(billingCheckouts).set({accessUntil:until}).where(eq(billingCheckouts.id,grant.id));}
    await tx.insert(workspaceSubscriptions).values({workspaceId:order.workspaceId,prepaidUntil:until,prepaidInterval:lastInterval}).onConflictDoUpdate({target:workspaceSubscriptions.workspaceId,set:{prepaidUntil:until,prepaidInterval:lastInterval,updatedAt:new Date()}});
   });return true;
  }catch(error){if(error!==stale)throw error;}
 }
 throw Error('Prepaid state kept changing');
}

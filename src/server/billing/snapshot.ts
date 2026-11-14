import 'server-only';
import {z} from 'zod';
import type {billingCheckouts} from '@/server/db/schema';
import {billingProduct} from './client';
import {billingPlan,type BillingInterval} from '@/lib/billing';
export const billingSnapshot=z.object({id:z.string().startsWith('sub_'),status:z.enum(['trialing','active','past_due','unpaid','canceled','paused']),customer:z.object({customer_id:z.string().startsWith('cust_')}),product_id:z.string().startsWith('prod_').optional(),product:z.object({id:z.string().startsWith('prod_')}).optional(),currency:z.literal('USD'),amount:z.string(),billing_cycle:z.object({interval:z.enum(['month','year']),frequency:z.literal(1)}),quantity:z.literal(1),current_period_end:z.iso.datetime({offset:true}),trial_end:z.iso.datetime({offset:true}).nullable().optional(),cancel_at_period_end:z.boolean().optional(),metadata:z.record(z.string(),z.unknown()).optional()}).refine(value=>Boolean(value.product_id||value.product?.id),{message:'Missing subscription product',path:['product']}).refine(value=>!value.product_id||!value.product||value.product_id===value.product.id,{message:'Subscription product mismatch',path:['product']}).transform(value=>({...value,product_id:value.product_id??value.product!.id}));
// Catalog rotation must not strand an existing subscription. A legacy product is
// trusted only when its completed checkout belongs to this workspace and cadence.
export function recordedBillingProduct(candidate:ReturnType<typeof billingSnapshot.parse>,checkout:typeof billingCheckouts.$inferSelect|undefined,workspaceId:string){
 const interval=candidate.billing_cycle.interval==='month'?'monthly':'yearly';
 return checkout?.workspaceId===workspaceId&&checkout.status==='completed'&&checkout.id===candidate.metadata?.checkout_attempt_id&&candidate.metadata?.workspace_id===workspaceId&&checkout.productId===candidate.product_id&&checkout.interval===interval?checkout.productId:undefined;
}
export function subscriptionValues(candidate:ReturnType<typeof billingSnapshot.parse>,recordedProduct?:string){
 const interval:BillingInterval=candidate.billing_cycle.interval==='month'?'monthly':'yearly';
 if((candidate.product_id!==billingProduct(interval)&&candidate.product_id!==recordedProduct)||Number(candidate.amount)!==Number(interval==='monthly'?billingPlan.monthly:billingPlan.yearly))throw Error('Unexpected billing plan');
 if(candidate.status==='trialing'&&!candidate.trial_end)throw Error('Missing trial end');
 return {customerId:candidate.customer.customer_id,subscriptionId:candidate.id,status:candidate.status,interval,trialUsed:true,trialEnd:candidate.trial_end?new Date(candidate.trial_end):null,periodEnd:new Date(candidate.current_period_end),cancelAtPeriodEnd:candidate.cancel_at_period_end??false,updatedAt:new Date()};
}

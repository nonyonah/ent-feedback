import 'server-only';
import {z} from 'zod';
import {billingProduct} from './client';
import type {BillingInterval} from '@/lib/billing';

export function pendingBillingInterval(raw:unknown):{pendingChange:boolean;pendingInterval:BillingInterval|null}{
 const parsed=z.object({pending_update:z.unknown().optional()}).parse(raw);
 if(parsed.pending_update==null)return {pendingChange:false,pendingInterval:null};
 const pending=z.object({product_id:z.string().optional(),product:z.object({id:z.string()}).optional()}).passthrough().safeParse(parsed.pending_update);
 const product=pending.success?(pending.data.product_id??pending.data.product?.id):undefined;
 return {pendingChange:true,pendingInterval:product===billingProduct('monthly')?'monthly':product===billingProduct('yearly')?'yearly':null};
}

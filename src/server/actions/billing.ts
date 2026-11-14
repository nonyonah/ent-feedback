'use server';
import {z} from 'zod';
import {requireAppUser} from '@/server/auth';
import {getDb} from '@/server/db/client';
import {requireWorkspaceRole} from '@/server/services/access';
import {runService,ServiceError} from '@/server/result';
import {startCheckout,openBillingPortal} from '@/server/billing/service';
import {portalError} from '@/server/billing/portal-error';
import {loadSubscriptionManagement,manageSubscription} from '@/server/billing/management';
import {subscriptionManagementError} from '@/server/billing/management-error';
import {readBillingSummary} from '@/server/billing/summary';
export async function loadBillingAction(workspaceId:string){return runService(async()=>{
 const wid=z.uuid().parse(workspaceId),user=await requireAppUser();const db=getDb();const membership=await requireWorkspaceRole(db,{workspaceId:wid,userId:user.id,minimumRole:'member'});
 return readBillingSummary(wid,membership.role==='owner');
});}
export async function checkoutAction(workspaceId:string,interval:'monthly'|'yearly',mode:'subscription'|'prepaid'='subscription'){return runService(async()=>{
 try{return await startCheckout(z.uuid().parse(workspaceId),z.enum(['monthly','yearly']).parse(interval),z.enum(['subscription','prepaid']).parse(mode));}catch(error){if(error instanceof ServiceError||error instanceof z.ZodError)throw error;throw new ServiceError('retryable','Checkout could not be opened. Try again; an existing checkout will be reused.');}
});}
export async function portalAction(workspaceId:string){return runService(async()=>{
 try{return await openBillingPortal(z.uuid().parse(workspaceId));}catch(error){if(error instanceof z.ZodError)throw error;throw portalError(error);}
});}

export async function loadSubscriptionManagementAction(workspaceId:string){return runService(async()=>{
 const wid=z.uuid().parse(workspaceId);
 try{return await loadSubscriptionManagement(wid);}catch(error){throw subscriptionManagementError(error);}
});}
export async function manageSubscriptionAction(workspaceId:string,input:{kind:'interval';interval:'monthly'|'yearly'}|{kind:'cancel'}){return runService(async()=>{
 const wid=z.uuid().parse(workspaceId),change=z.discriminatedUnion('kind',[z.object({kind:z.literal('cancel')}),z.object({kind:z.literal('interval'),interval:z.enum(['monthly','yearly'])})]).parse(input);
 try{return await manageSubscription(wid,change);}catch(error){throw subscriptionManagementError(error);}
});}

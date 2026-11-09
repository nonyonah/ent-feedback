'use server';
import {z} from 'zod';
import {requireAppUser} from '@/server/auth';
import {getDb} from '@/server/db/client';
import {requireWorkspaceRole} from '@/server/services/access';
import {runService,ServiceError} from '@/server/result';
import {startCheckout,openBillingPortal} from '@/server/billing/service';
import {readBillingSummary} from '@/server/billing/summary';
export async function loadBillingAction(workspaceId:string){return runService(async()=>{
 const wid=z.uuid().parse(workspaceId),user=await requireAppUser();const db=getDb();const membership=await requireWorkspaceRole(db,{workspaceId:wid,userId:user.id,minimumRole:'member'});
 return readBillingSummary(wid,membership.role==='owner');
});}
export async function checkoutAction(workspaceId:string,interval:'monthly'|'yearly'){return runService(async()=>{
 try{return await startCheckout(z.uuid().parse(workspaceId),z.enum(['monthly','yearly']).parse(interval));}catch(error){if(error instanceof ServiceError||error instanceof z.ZodError)throw error;throw new ServiceError('retryable','Checkout could not be opened. Try again; an existing checkout will be reused.');}
});}
export async function portalAction(workspaceId:string){return runService(async()=>{
 try{return await openBillingPortal(z.uuid().parse(workspaceId));}catch(error){if(error instanceof ServiceError)throw error;throw new ServiceError('retryable','Billing management could not be opened. Please try again.');}
});}

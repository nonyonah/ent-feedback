import 'server-only';
import {randomUUID} from 'node:crypto';
import {and,eq,inArray} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {billingCheckouts} from '@/server/db/schema';
import {ServiceError} from '@/server/result';
import {bachsClient} from './client';
import {applyPrepaidEvent} from './prepaid';
import {applyBillingEvent} from './webhook';
import {getServerEnv} from '@/server/env';

/** Verify outside the deletion transaction; the caller rechecks the rows under the workspace lock. */
export async function verifyDeletionCheckouts(workspaceId:string){
 const attempts=await getDb().select().from(billingCheckouts).where(and(eq(billingCheckouts.workspaceId,workspaceId),inArray(billingCheckouts.status,['creating','open','expired'])));
 for(const attempt of attempts){
  if(attempt.expiresAt.getTime()>Date.now())throw new ServiceError('conflict','Wait for the pending checkout to finish before deleting this workspace.');
  if(!attempt.checkoutId)throw new ServiceError('conflict','The checkout could not be verified. Contact support before deleting this workspace.');
  try{
   const session=await bachsClient().checkoutSessions.get(attempt.checkoutId);
   if(session.checkout_id!==attempt.checkoutId||session.reference!==attempt.id||session.metadata?.workspace_id!==workspaceId||session.metadata?.checkout_attempt_id!==attempt.id||session.metadata?.billing_mode!==attempt.mode)throw Error('Checkout binding mismatch');
   if(session.status==='completed'){
    const eventId='reconcile-deletion:'+randomUUID();
    if(attempt.mode==='prepaid')await applyPrepaidEvent({id:eventId,type:'checkout.completed',created_at:new Date().toISOString(),organization_id:getServerEnv().BACHS_ORGANIZATION_ID!,data:{checkout_id:attempt.checkoutId}});
    else{
     const subscriptionId=session.charge?.subscription_id;
     if(!subscriptionId)throw Error('Completed checkout has no subscription binding');
     await applyBillingEvent({id:eventId,type:'customer.subscription.updated',created_at:new Date().toISOString(),organization_id:getServerEnv().BACHS_ORGANIZATION_ID!,data:{subscription_id:subscriptionId}});
    }
    throw new ServiceError('conflict','This checkout completed. Review billing before deleting the workspace.');
   }
   if(!['expired','canceled','cancelled'].includes(session.status)||session.payment_status!=='unpaid'||session.charge!==null)throw Error('Checkout is not confirmed terminal and unpaid');
  }catch(error){
   if(error instanceof ServiceError&&error.code==='conflict')throw error;
   throw new ServiceError('retryable','The checkout could not be verified with the billing provider. Try again or contact support.');
  }
 }
 return attempts;
}

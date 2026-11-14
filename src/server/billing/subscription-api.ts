import 'server-only';
import {getServerEnv} from '@/server/env';
import {bachsClient} from './client';
import {ServiceError} from '@/server/result';

// SDK 2.0 has no subscription update method. Use the documented PATCH endpoint.
export async function changeSubscriptionProduct(subscriptionId:string,productId:string,idempotencyKey:string){
 const client=bachsClient();
 const origin=client.environment==='sandbox'?'https://sandbox-api.bachs.io':'https://api.bachs.io';
 let response:Response;
 try{response=await fetch(`${origin}/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,{
  method:'PATCH',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15_000),
  headers:{Authorization:`Bearer ${getServerEnv().BACHS_API_KEY}`,'Content-Type':'application/json',Accept:'application/json','Idempotency-Key':idempotencyKey},
  body:JSON.stringify({product_id:productId,proration_behavior:'next_cycle'}),
 });}catch{throw new ServiceError('retryable','Billing did not confirm the change. Refresh the subscription before trying again.');}
 if(!response.ok)throw Object.assign(new Error('Subscription update failed'),{statusCode:response.status});
 // Bachs returns the full subscription; never expose the response body to the browser.
 return response.json() as Promise<unknown>;
}

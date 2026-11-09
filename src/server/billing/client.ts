import 'server-only';
import {Bachs} from '@bachs/sdk';
import {getServerEnv} from '@/server/env';
import {ServiceError} from '@/server/result';
import type {BillingInterval} from '@/lib/billing';
export function bachsClient(){
 const key=getServerEnv().BACHS_API_KEY;
 if(!key||!/^sk_(sandbox|live)_/.test(key))throw new ServiceError('retryable','Billing is not configured yet. Please try again later.');
 return new Bachs({apiKey:key,timeoutMs:15_000,maxRetries:1,logLevel:'off'});
}
export function billingProduct(interval:BillingInterval,trial:boolean){
 const env=getServerEnv();
 const id=interval==='monthly'?(trial?env.BACHS_MONTHLY_TRIAL_PRODUCT_ID:env.BACHS_MONTHLY_PRODUCT_ID):(trial?env.BACHS_YEARLY_TRIAL_PRODUCT_ID:env.BACHS_YEARLY_PRODUCT_ID);
 if(!id?.startsWith('prod_'))throw new ServiceError('retryable','This billing option is not configured yet. Please try again later.');
 return id;
}
export function billingReady(){const e=getServerEnv();return Boolean(e.BACHS_API_KEY&&e.BACHS_WEBHOOK_SECRET&&e.BACHS_ORGANIZATION_ID&&e.BACHS_MONTHLY_PRODUCT_ID&&e.BACHS_YEARLY_PRODUCT_ID&&e.BACHS_MONTHLY_TRIAL_PRODUCT_ID&&e.BACHS_YEARLY_TRIAL_PRODUCT_ID);}
export function billingRedirect(value:string,kind:'checkout'|'portal'){
 const url=new URL(value);const sandbox=bachsClient().environment==='sandbox';
 const hosts=kind==='checkout'?['checkout.bachs.io',...(sandbox?['sandbox-checkout.bachs.io']:[])]:['portal.bachs.io',...(sandbox?['sandbox-portal.bachs.io']:[])];
 if(url.protocol!=='https:'||url.username||url.password||!hosts.includes(url.hostname)||url.port)throw new ServiceError('retryable','Billing returned an invalid destination. Please try again.');
 return url.href;
}

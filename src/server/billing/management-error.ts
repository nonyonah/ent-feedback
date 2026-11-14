import 'server-only';
import {ZodError} from 'zod';
import {ServiceError} from '@/server/result';
export function subscriptionManagementError(error:unknown){
 if(error instanceof ServiceError)return error;
 const status=error&&typeof error==='object'&&'statusCode' in error?error.statusCode:undefined;
 console.warn('[billing.management] Request failed',{statusCode:typeof status==='number'?status:null,type:error instanceof ZodError?'validation':error instanceof Error?error.constructor.name:'unknown',...(error instanceof ZodError?{fields:error.issues.map(issue=>({path:issue.path.join('.'),code:issue.code}))}:{})});
 if(status===401||status===403)return new ServiceError('retryable','Billing access needs attention. Contact support to check the API key and subscription permissions.');
 if(status===404)return new ServiceError('not_found','This subscription could not be found in the billing account. Contact support to check the sandbox or live configuration.');
 if(status===400||status===409)return new ServiceError('conflict','Bachs could not apply this change. Refresh the subscription and try again, or contact support.');
 if(status===429)return new ServiceError('rate_limited','Too many billing requests. Wait a minute and try again.');
 return new ServiceError('retryable','Billing did not confirm the request. Refresh the subscription to check its status before trying again.');
}

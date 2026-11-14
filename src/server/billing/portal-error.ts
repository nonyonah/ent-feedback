import 'server-only';
import {ServiceError} from '@/server/result';

/** Never expose provider bodies: they can contain customer data or session credentials. */
export function portalError(error:unknown):ServiceError {
 if(error instanceof ServiceError)return error;
 const status=error&&typeof error==='object'&&'statusCode' in error?error.statusCode:undefined;
 // Only log a numeric status; provider messages and bodies may contain credentials.
 console.warn('[billing.portal] Session request failed', {statusCode:typeof status==='number'?status:null});
 if(error instanceof Error&&['BachsNetworkError','BachsTimeoutError'].includes(error.constructor.name))return new ServiceError('retryable','Secure billing could not be reached. Please try again in a moment.');
 switch(status){
  case 401:return new ServiceError('retryable','Billing authentication needs attention. Please contact support.');
  case 403:return new ServiceError('retryable','Billing access needs attention. The billing API key requires customers:write permission. Please contact support.');
  case 404:return new ServiceError('not_found','This billing customer could not be found. Please contact support to check the billing account and live or sandbox environment.');
  case 429:return new ServiceError('rate_limited','Too many billing requests. Wait a minute and try again.');
  case 503:return new ServiceError('retryable','The billing portal is unavailable. If this continues, contact support to check the portal configuration.');
  default:return new ServiceError('retryable','Billing management could not be opened. Please try again.');
 }
}

export type BillingMode='subscription'|'prepaid';
export type BillingInterval='monthly'|'yearly';
export const billingPlan={name:'Essentials',monthly:'7.00',yearly:'70.00',currency:'USD',trialDays:14} as const;
export function subscriptionHasAccess(subscription:{status:string;trialEnd:Date|string|null;periodEnd:Date|string|null;prepaidUntil?:Date|string|null}|null|undefined,now=Date.now()){
 if(!subscription)return false;
 if(subscription.prepaidUntil&&new Date(subscription.prepaidUntil).getTime()>now)return true;
 if(subscription.status==='past_due')return true; // Bachs recovery keeps access until unpaid.
 const end=subscription.status==='trialing'?subscription.trialEnd:subscription.periodEnd;
 return ['active','trialing'].includes(subscription.status)&&Boolean(end)&&new Date(end!).getTime()>now;
}

/** UTC calendar periods clamp the day at month end (Jan 31 → Feb 28/29). */
export function prepaidPeriodEnd(start:Date,interval:BillingInterval){
 const result=new Date(start);const day=result.getUTCDate();result.setUTCDate(1);
 if(interval==='yearly')result.setUTCFullYear(result.getUTCFullYear()+1);else result.setUTCMonth(result.getUTCMonth()+1);
 const lastDay=new Date(Date.UTC(result.getUTCFullYear(),result.getUTCMonth()+1,0)).getUTCDate();result.setUTCDate(Math.min(day,lastDay));return result;
}

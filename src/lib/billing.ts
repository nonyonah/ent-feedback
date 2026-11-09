export type BillingInterval='monthly'|'yearly';
export const billingPlan={name:'Essentials',monthly:'7.00',yearly:'70.00',currency:'USD',trialDays:14} as const;
export function subscriptionHasAccess(subscription:{status:string;trialEnd:Date|string|null;periodEnd:Date|string|null}|null|undefined,now=Date.now()){
 if(!subscription)return false;
 if(subscription.status==='past_due')return true; // Bachs recovery keeps access until unpaid.
 const end=subscription.status==='trialing'?subscription.trialEnd:subscription.periodEnd;
 return ['active','trialing'].includes(subscription.status)&&Boolean(end)&&new Date(end!).getTime()>now;
}

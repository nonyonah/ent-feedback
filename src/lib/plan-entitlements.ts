import {subscriptionHasAccess} from './billing';
export const PLAN_LIMITS={free:{boards:2},essentials:{boards:5}} as const;
export function planEntitlements(subscription:Parameters<typeof subscriptionHasAccess>[0],now=Date.now()){
 const paid=subscriptionHasAccess(subscription,now);
 return {plan:paid?'essentials' as const:'free' as const,boardLimit:paid?PLAN_LIMITS.essentials.boards:PLAN_LIMITS.free.boards,hideAttribution:paid,canExport:paid};
}

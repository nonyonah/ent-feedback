import {subscriptionHasAccess} from './billing';
export const prepaidReminderLead=3*86400000;
export function prepaidReminderEligible(subscription:{status:string;trialEnd:Date|string|null;periodEnd:Date|string|null;prepaidUntil?:Date|string|null},expectedEnd:string,now=Date.now()){
 const end=subscription.prepaidUntil?new Date(subscription.prepaidUntil).getTime():NaN;
 return end===new Date(expectedEnd).getTime()&&end>now&&end-now<=prepaidReminderLead&&!subscriptionHasAccess({...subscription,prepaidUntil:null},now);
}

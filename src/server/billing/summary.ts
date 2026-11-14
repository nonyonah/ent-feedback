import 'server-only';
import {eq,count} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {workspaceSubscriptions,boards} from '@/server/db/schema';
import {billingReady} from './client';
import {planEntitlements} from '@/lib/plan-entitlements';
import {subscriptionHasAccess} from '@/lib/billing';
// Call only after verifying workspace membership (or from authenticated workspace bootstrap).
export async function readBillingSummary(workspaceId:string,owner:boolean){
 const db=getDb();
 const [[row],[usage]]=await Promise.all([
  db.select().from(workspaceSubscriptions).where(eq(workspaceSubscriptions.workspaceId,workspaceId)).limit(1),
  db.select({boards:count()}).from(boards).where(eq(boards.workspaceId,workspaceId)),
 ]);
 return buildBillingSummary(row,usage.boards,owner);
}
export type BillingSummary=Awaited<ReturnType<typeof readBillingSummary>>;

export function buildBillingSummary(row:typeof workspaceSubscriptions.$inferSelect|undefined,boardCount:number,owner:boolean){
 const prepaid=Boolean(row?.prepaidUntil&&row.prepaidUntil.getTime()>Date.now());
 const prepaidOnly=prepaid&&!subscriptionHasAccess(row?{...row,prepaidUntil:null}:undefined);
 return {...planEntitlements(row),boardCount:boardCount,configured:billingReady(),enforced:true,owner,status:prepaidOnly?'prepaid':row?.status??'none',interval:prepaidOnly?(row?.prepaidInterval??'monthly'):row?.interval??'monthly',hasAccess:subscriptionHasAccess(row),trialUsed:row?.trialUsed??false,trialEnd:row?.trialEnd?.toISOString()??null,prepaidUntil:row?.prepaidUntil?.toISOString()??null,prepaidActive:prepaid,periodEnd:prepaidOnly?row?.prepaidUntil?.toISOString()??null:row?.periodEnd?.toISOString()??null,cancelAtPeriodEnd:row?.cancelAtPeriodEnd??false,canManage:Boolean(!prepaidOnly&&row?.subscriptionId&&row.customerId)};
}

import 'server-only';
import {eq} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {workspaceSubscriptions} from '@/server/db/schema';
import {boardUsage} from './board-count';
import {billingReady} from './client';
import {planEntitlements} from '@/lib/plan-entitlements';
import {subscriptionHasAccess} from '@/lib/billing';
// Call only after verifying workspace membership (or from authenticated workspace bootstrap).
export async function readBillingSummary(workspaceId:string,owner:boolean){
 const db=getDb();
 const [[row],usage]=await Promise.all([
  db.select().from(workspaceSubscriptions).where(eq(workspaceSubscriptions.workspaceId,workspaceId)).limit(1),
  boardUsage(db,workspaceId),
 ]);
 return buildBillingSummary(row,usage.billable,owner,usage.total);
}
export type BillingSummary=Awaited<ReturnType<typeof readBillingSummary>>;

export function buildBillingSummary(row:typeof workspaceSubscriptions.$inferSelect|undefined,boardCount:number,owner:boolean,totalBoards=boardCount){
 const prepaid=Boolean(row?.prepaidUntil&&row.prepaidUntil.getTime()>Date.now());
 const prepaidOnly=prepaid&&!subscriptionHasAccess(row?{...row,prepaidUntil:null}:undefined);
 return {...planEntitlements(row),boardCount,totalBoards,configured:billingReady(),enforced:true,owner,status:prepaidOnly?'prepaid':row?.status??'none',interval:prepaidOnly?(row?.prepaidInterval??'monthly'):row?.interval??'monthly',hasAccess:subscriptionHasAccess(row),trialUsed:row?.trialUsed??false,trialEnd:row?.trialEnd?.toISOString()??null,prepaidUntil:row?.prepaidUntil?.toISOString()??null,prepaidActive:prepaid,periodEnd:prepaidOnly?row?.prepaidUntil?.toISOString()??null:row?.periodEnd?.toISOString()??null,cancelAtPeriodEnd:row?.cancelAtPeriodEnd??false,canManage:Boolean(!prepaidOnly&&row?.subscriptionId&&row.customerId)};
}

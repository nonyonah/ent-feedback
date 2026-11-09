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
 return {...planEntitlements(row),boardCount:usage.boards,configured:billingReady(),enforced:true,owner,status:row?.status??'none',interval:row?.interval??'monthly',hasAccess:subscriptionHasAccess(row),trialUsed:row?.trialUsed??false,trialEnd:row?.trialEnd?.toISOString()??null,periodEnd:row?.periodEnd?.toISOString()??null,cancelAtPeriodEnd:row?.cancelAtPeriodEnd??false,canManage:Boolean(row?.customerId)};
}
export type BillingSummary=Awaited<ReturnType<typeof readBillingSummary>>;

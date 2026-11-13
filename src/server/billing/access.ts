import 'server-only';
import {eq} from 'drizzle-orm';
import {getDb,type Queryable} from '@/server/db/client';
import {workspaceSubscriptions} from '@/server/db/schema';
import {planEntitlements} from '@/lib/plan-entitlements';
/**
 * Resolve plan entitlements for a workspace.
 * Pass the open transaction handle when called inside a transaction so the
 * read never waits for a second pooled connection.
 */
export async function getWorkspaceEntitlements(workspaceId:string,db:Queryable=getDb()){
 const [subscription]=await db.select().from(workspaceSubscriptions).where(eq(workspaceSubscriptions.workspaceId,workspaceId)).limit(1);
 return planEntitlements(subscription);
}

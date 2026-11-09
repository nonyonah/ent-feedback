import 'server-only';
import {eq} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {workspaceSubscriptions} from '@/server/db/schema';
import {planEntitlements} from '@/lib/plan-entitlements';
export async function getWorkspaceEntitlements(workspaceId:string){
 const [subscription]=await getDb().select().from(workspaceSubscriptions).where(eq(workspaceSubscriptions.workspaceId,workspaceId)).limit(1);
 return planEntitlements(subscription);
}

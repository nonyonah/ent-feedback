import 'server-only';
import {and,eq,asc,lte,sql} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {chatSettings,integrationConnections,jobs,operatorPresence,users,workspaceMembers} from '@/server/db/schema';
import {operationsSchema,teamAvailable} from '@/lib/chat/availability';
import {getServerEnv} from '@/server/env';
import {secretSchema} from '@/server/integrations';
import {unseal} from '@/server/integration-crypto';
import {readSlackPresence} from './slack-presence-client';

/** One bounded batch per workspace/minute, shared across visitors and instances. */
export async function refreshSlackPresence(workspaceId:string){
 const db=getDb();const key=getServerEnv().INTEGRATION_ENCRYPTION_KEY;if(!key)return;
 const [settings]=await db.select().from(chatSettings).where(eq(chatSettings.workspaceId,workspaceId)).limit(1);
 if(!settings?.enabled)return;const operations=operationsSchema.parse(settings.operations);if(!teamAvailable(operations))return;
 const [connection]=await db.select().from(integrationConnections).where(and(eq(integrationConnections.workspaceId,workspaceId),eq(integrationConnections.provider,'slack'),eq(integrationConnections.scope,'workspace'),eq(integrationConnections.authorizationState,'connected'))).limit(1);
 if(!connection?.encryptedSecretRef)return;
 const version=connection.id+':'+connection.updatedAt.toISOString();
 const now=new Date();const leaseValues={status:'running' as const,lockedAt:now,runAt:new Date(now.getTime()+60000),payload:{workspaceId}};
 const [lease]=await db.insert(jobs).values({type:'chat_presence',dedupeKey:`chat:presence:${workspaceId}`,...leaseValues}).onConflictDoUpdate({target:jobs.dedupeKey,targetWhere:sql`${jobs.dedupeKey} is not null`,set:leaseValues,setWhere:lte(jobs.runAt,now)}).returning({id:jobs.id});
 if(!lease)return;
 try{
  const secret=secretSchema.parse(unseal(connection.encryptedSecretRef,key,workspaceId+':slack'));
  const operators=await db.select({id:users.id,email:users.email,presence:operatorPresence}).from(workspaceMembers).innerJoin(users,eq(users.id,workspaceMembers.userId)).leftJoin(operatorPresence,and(eq(operatorPresence.workspaceId,workspaceId),eq(operatorPresence.userId,users.id))).where(and(eq(workspaceMembers.workspaceId,workspaceId),eq(workspaceMembers.status,'active'))).orderBy(asc(operatorPresence.slackCheckedAt));
  const selected=operators.filter(user=>Boolean(user.email)&&(operations.allOperators||operations.operatorIds.includes(user.id))).sort((a,b)=>(a.presence?.slackCheckedAt?.getTime()??0)-(b.presence?.slackCheckedAt?.getTime()??0)).slice(0,3);
  for(const operator of selected){
   if(!operator.email)continue;
   let result:{userId:string|null;online:boolean}={userId:null,online:false};
   try{result=await readSlackPresence(secret.accessToken,operator.email,operator.presence?.slackConnectionVersion===version?operator.presence.slackUserId:null);}catch{/* Unknown presence must never be reported as online. */}
   const values={slackCheckedAt:new Date(),slackOnline:result.online,slackUserId:result.userId,slackConnectionVersion:version};
   await db.insert(operatorPresence).values({workspaceId,userId:operator.id,...values}).onConflictDoUpdate({target:[operatorPresence.workspaceId,operatorPresence.userId],set:values});
  }
  await db.update(jobs).set({status:'succeeded',lockedAt:null,updatedAt:new Date()}).where(eq(jobs.id,lease.id));
 }catch{
  await db.update(jobs).set({status:'failed',lockedAt:null,lastError:'Presence refresh unavailable',updatedAt:new Date()}).where(eq(jobs.id,lease.id));
 }
}

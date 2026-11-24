import 'server-only';
import {and,asc,eq,isNull,lt,lte,sql} from 'drizzle-orm';
import {z} from 'zod';
import {getDb,type Queryable} from '@/server/db/client';
import {feedback,feedbackAiSuggestions,jobs,tags,workspaceAiSettings} from '@/server/db/schema';
import {aiProviderConfigured,readWorkspaceAiSettings} from './settings';
import {generateClassification} from './classification';
import {features} from '@/lib/features';

const type='ai_feedback_classification';
const payload=z.object({workspaceId:z.uuid(),feedbackId:z.uuid()}).strict();
export async function enqueueClassification(tx:Queryable,workspaceId:string,feedbackId:string){
 if(!features.feedbackAi)return;
 const [settings]=await tx.select({enabled:workspaceAiSettings.feedbackEnabled}).from(workspaceAiSettings).where(eq(workspaceAiSettings.workspaceId,workspaceId));
 if(settings?.enabled)await tx.insert(jobs).values({type,dedupeKey:'ai:classify:'+feedbackId,payload:{workspaceId,feedbackId}}).onConflictDoNothing();
}
export async function processClassificationJob(){
 if(!aiProviderConfigured())return {configured:false,processed:0};
 const db=getDb(),now=new Date();
 const [job]=await db.transaction(async tx=>{
  const expired=and(eq(jobs.type,type),eq(jobs.status,'running'),lt(jobs.lockedAt,new Date(now.getTime()-600000)));
  await tx.update(jobs).set({status:'failed',lockedAt:null,lastError:'Classification lease expired',updatedAt:now}).where(and(expired,sql`${jobs.attempts}>=${jobs.maxAttempts}`));
  await tx.update(jobs).set({status:'pending',lockedAt:null,updatedAt:now}).where(and(expired,sql`${jobs.attempts}<${jobs.maxAttempts}`));
  const [next]=await tx.select().from(jobs).where(and(eq(jobs.type,type),eq(jobs.status,'pending'),lte(jobs.runAt,now),sql`${jobs.attempts}<${jobs.maxAttempts}`)).orderBy(asc(jobs.runAt),asc(jobs.id)).limit(1).for('update',{skipLocked:true});
  if(!next)return [];
  return tx.update(jobs).set({status:'running',attempts:next.attempts+1,lockedAt:now,updatedAt:now}).where(eq(jobs.id,next.id)).returning();
 });
 if(!job)return {configured:true,processed:0};
 const lease=and(eq(jobs.id,job.id),eq(jobs.status,'running'),eq(jobs.attempts,job.attempts),eq(jobs.lockedAt,now));
 try{
  const p=payload.parse(job.payload);
  const [post]=await db.select({title:feedback.title,body:feedback.body,updatedAt:feedback.updatedAt}).from(feedback).where(and(eq(feedback.workspaceId,p.workspaceId),eq(feedback.id,p.feedbackId),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId))).limit(1);
  if(!post||!(await readWorkspaceAiSettings(p.workspaceId)).feedbackEnabled){await db.update(jobs).set({status:'succeeded',lockedAt:null,updatedAt:new Date()}).where(lease);return {configured:true,processed:1};}
  const available=await db.select({id:tags.id,name:tags.name}).from(tags).where(eq(tags.workspaceId,p.workspaceId)).limit(100),suggestion=await generateClassification(post,available);
  await db.transaction(async tx=>{
   const [active]=await tx.select({id:jobs.id}).from(jobs).where(lease).for('update');if(!active)return;
   const [settings]=await tx.select({enabled:workspaceAiSettings.feedbackEnabled}).from(workspaceAiSettings).where(eq(workspaceAiSettings.workspaceId,p.workspaceId)).for('update');
   const [current]=await tx.select({title:feedback.title,body:feedback.body,updatedAt:feedback.updatedAt}).from(feedback).where(and(eq(feedback.workspaceId,p.workspaceId),eq(feedback.id,p.feedbackId),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId))).for('update');
   if(settings?.enabled&&current&&current.title===post.title&&current.body===post.body&&current.updatedAt.getTime()===post.updatedAt.getTime())await tx.insert(feedbackAiSuggestions).values({workspaceId:p.workspaceId,feedbackId:p.feedbackId,...suggestion,sourceUpdatedAt:post.updatedAt}).onConflictDoNothing();
   await tx.update(jobs).set({status:'succeeded',lockedAt:null,lastError:null,updatedAt:new Date()}).where(lease);
  });
 }catch{
  const failed=job.attempts>=job.maxAttempts;
  await db.update(jobs).set({status:failed?'failed':'pending',lockedAt:null,lastError:'Classification suggestion could not be generated',runAt:new Date(Date.now()+Math.min(3600,30*2**(job.attempts-1))*1000),updatedAt:new Date()}).where(lease);
 }
 return {configured:true,processed:1};
}

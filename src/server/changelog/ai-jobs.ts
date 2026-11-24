import 'server-only';
import {and,asc,eq,isNull,lt,lte,sql} from 'drizzle-orm';
import {z} from 'zod';
import type {Queryable} from '@/server/db/client';
import {getDb} from '@/server/db/client';
import {changelogEntries,changelogFeedback,feedback,jobs,workspaceAiSettings} from '@/server/db/schema';
import {aiProviderConfigured,readWorkspaceAiSettings} from '@/server/ai/settings';
import {generateFeedbackChangelog} from '@/server/ai/changelog-draft';
import {slugifyChangelogTitle} from '@/lib/changelog';
import {features} from '@/lib/features';

const type='ai_shipped_changelog';
const payload=z.object({workspaceId:z.uuid(),feedbackId:z.uuid(),actorId:z.uuid()}).strict();

/** Called inside the status-change transaction; opting in is required before queuing. */
export async function enqueueShippedChangelog(tx:Queryable,workspaceId:string,feedbackId:string,actorId:string){
 if(!features.feedbackAi)return;
 const [settings]=await tx.select({enabled:workspaceAiSettings.feedbackEnabled}).from(workspaceAiSettings).where(eq(workspaceAiSettings.workspaceId,workspaceId));
 if(!settings?.enabled)return;
 await tx.insert(jobs).values({type,dedupeKey:'ai:shipped-changelog:'+feedbackId,payload:{workspaceId,feedbackId,actorId}}).onConflictDoNothing();
}

/** AI is called outside locks. The draft, link and lease completion commit together. */
export async function processShippedChangelogJob(){
 if(!aiProviderConfigured())return {configured:false,processed:0};
 const db=getDb(),now=new Date();
 const [job]=await db.transaction(async tx=>{
  const expired=and(eq(jobs.type,type),eq(jobs.status,'running'),lt(jobs.lockedAt,new Date(now.getTime()-10*60000)));
  await tx.update(jobs).set({status:'failed',lockedAt:null,lastError:'AI draft lease expired',updatedAt:now}).where(and(expired,sql`${jobs.attempts}>=${jobs.maxAttempts}`));
  await tx.update(jobs).set({status:'pending',lockedAt:null,updatedAt:now}).where(and(expired,sql`${jobs.attempts}<${jobs.maxAttempts}`));
  const [next]=await tx.select().from(jobs).where(and(eq(jobs.type,type),eq(jobs.status,'pending'),lte(jobs.runAt,now),sql`${jobs.attempts}<${jobs.maxAttempts}`)).orderBy(asc(jobs.runAt),asc(jobs.id)).limit(1).for('update',{skipLocked:true});
  if(!next)return [];
  return tx.update(jobs).set({status:'running',attempts:next.attempts+1,lockedAt:now,updatedAt:now}).where(eq(jobs.id,next.id)).returning();
 });
 if(!job)return {configured:true,processed:0};
 const lease=and(eq(jobs.id,job.id),eq(jobs.status,'running'),eq(jobs.attempts,job.attempts),eq(jobs.lockedAt,now));
 try{
  const p=payload.parse(job.payload);
  const [post]=await db.select({title:feedback.title,body:feedback.body,category:feedback.category}).from(feedback).where(and(eq(feedback.id,p.feedbackId),eq(feedback.workspaceId,p.workspaceId),eq(feedback.status,'shipped'),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId))).limit(1);
  if(!post||!(await readWorkspaceAiSettings(p.workspaceId)).feedbackEnabled){await db.update(jobs).set({status:'succeeded',lockedAt:null,updatedAt:new Date()}).where(lease);return {configured:true,processed:1};}
  const draft=await generateFeedbackChangelog([post]);
  await db.transaction(async tx=>{
   const [active]=await tx.select({id:jobs.id}).from(jobs).where(lease).for('update');if(!active)return;
   const [settings]=await tx.select({enabled:workspaceAiSettings.feedbackEnabled}).from(workspaceAiSettings).where(eq(workspaceAiSettings.workspaceId,p.workspaceId)).for('update');
   const [current]=await tx.select({id:feedback.id,title:feedback.title,body:feedback.body,category:feedback.category}).from(feedback).where(and(eq(feedback.id,p.feedbackId),eq(feedback.workspaceId,p.workspaceId),eq(feedback.status,'shipped'),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId))).for('update');
   const [existing]=await tx.select({id:changelogFeedback.id}).from(changelogFeedback).where(and(eq(changelogFeedback.workspaceId,p.workspaceId),eq(changelogFeedback.feedbackId,p.feedbackId))).limit(1);
   if(settings?.enabled&&current&&!existing){
    if(current.title!==post.title||current.body!==post.body||current.category!==post.category)throw Error('Feedback changed during drafting');
    const suffix='-shipped-'+p.feedbackId,base=slugifyChangelogTitle(draft.title).slice(0,80-suffix.length).replace(/-+$/,'')||'update';
    const [entry]=await tx.insert(changelogEntries).values({workspaceId:p.workspaceId,title:draft.title,body:draft.body,slug:base+suffix,status:'draft',category:current.category==='bug'?'bug-fix':current.category==='feature_request'?'new-feature':'improvement'}).returning({id:changelogEntries.id});
    await tx.insert(changelogFeedback).values({workspaceId:p.workspaceId,changelogId:entry.id,feedbackId:p.feedbackId});
   }
   await tx.update(jobs).set({status:'succeeded',lockedAt:null,lastError:null,updatedAt:new Date()}).where(lease);
  });
 }catch{
  const failed=job.attempts>=job.maxAttempts;
  await db.update(jobs).set({status:failed?'failed':'pending',lockedAt:null,lastError:'AI changelog draft could not be generated',runAt:new Date(Date.now()+Math.min(3600,30*2**(job.attempts-1))*1000),updatedAt:new Date()}).where(lease);
 }
 return {configured:true,processed:1};
}

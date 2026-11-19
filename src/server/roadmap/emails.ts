import 'server-only';
import {createHash} from 'node:crypto';
import {and,eq,gt,lte,lt,asc,desc,sql,isNotNull,inArray,isNull} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {jobs,feedback,votes,users,guestEmailVerifications,voterEmailOptouts,workspaces,notificationPreferences} from '@/server/db/schema';
import {getServerEnv} from '@/server/env';
import {guestEmailHash} from '@/server/guest-email';
import {sendRoadmapEmail} from '@/server/email';
import {roadmapUnsubscribeToken} from '@/lib/roadmap-unsubscribe';
const payload=z.object({workspaceId:z.uuid(),feedbackId:z.uuid(),cutoff:z.iso.datetime(),cursor:z.uuid().nullable().optional(),to:z.email().optional(),userId:z.uuid().nullable().optional(),guestId:z.uuid().nullable().optional()});
const emailHash=(email:string)=>createHash('sha256').update(email.toLowerCase()).digest('hex');
export async function processRoadmapJobs(limit=1){
 const env=getServerEnv(),db=getDb(),now=new Date(),result={configured:Boolean(env.SENDBYTE_API_KEY&&env.EMAIL_FROM&&env.EMAIL_UNSUBSCRIBE_SECRET),sent:0,queued:0,suppressed:0,retried:0,failed:0};if(!result.configured)return result;
 const claimed=await db.transaction(async tx=>{
  const expired=and(inArray(jobs.type,['roadmap_fanout','roadmap_email']),eq(jobs.status,'running'),lt(jobs.lockedAt,new Date(now.getTime()-10*60000)));
  await tx.update(jobs).set({status:'failed',lockedAt:null,lastError:'Roadmap email lease expired',updatedAt:now}).where(and(expired,sql`${jobs.attempts}>=${jobs.maxAttempts}`));
  await tx.update(jobs).set({status:'pending',lockedAt:null,updatedAt:now}).where(and(expired,sql`${jobs.attempts}<${jobs.maxAttempts}`));
  const rows=await tx.select().from(jobs).where(and(inArray(jobs.type,['roadmap_fanout','roadmap_email']),eq(jobs.status,'pending'),lte(jobs.runAt,now),sql`${jobs.attempts}<${jobs.maxAttempts}`)).orderBy(asc(jobs.runAt),asc(jobs.id)).limit(Math.max(1,Math.min(3,limit))).for('update',{skipLocked:true});
  const claimed:typeof rows=[];for(const row of rows){const [next]=await tx.update(jobs).set({status:'running',attempts:row.attempts+1,lockedAt:now,updatedAt:now}).where(eq(jobs.id,row.id)).returning();claimed.push(next);}return claimed;
 });
 for(const job of claimed){const lease=and(eq(jobs.id,job.id),eq(jobs.status,'running'),eq(jobs.attempts,job.attempts),eq(jobs.lockedAt,now));try{
  const p=payload.parse(job.payload);
  const [post]=await db.select({title:feedback.title,note:feedback.publicNote,handle:workspaces.handle}).from(feedback).innerJoin(workspaces,eq(workspaces.id,feedback.workspaceId)).where(and(eq(feedback.id,p.feedbackId),eq(feedback.workspaceId,p.workspaceId),eq(feedback.status,'shipped'),eq(feedback.roadmapVisible,true),isNull(feedback.deletedAt))).limit(1);
  if(!post){await db.update(jobs).set({status:'succeeded',lockedAt:null,updatedAt:new Date()}).where(lease);result.suppressed++;continue;}
  if(job.type==='roadmap_fanout'){
   const rows=await db.select({id:votes.id,userId:votes.userId,guestId:votes.guestActorId,email:users.email}).from(votes).leftJoin(users,eq(users.id,votes.userId)).where(and(eq(votes.workspaceId,p.workspaceId),eq(votes.feedbackId,p.feedbackId),lte(votes.createdAt,new Date(p.cutoff)),p.cursor?gt(votes.id,p.cursor):undefined)).orderBy(asc(votes.id)).limit(51);
   const page=rows.slice(0,50),hashes=page.flatMap(row=>row.guestId?[guestEmailHash(row.guestId)]:[]);
   const guests=hashes.length?await db.select({hash:guestEmailVerifications.requesterHash,email:guestEmailVerifications.email}).from(guestEmailVerifications).where(and(eq(guestEmailVerifications.workspaceId,p.workspaceId),inArray(guestEmailVerifications.requesterHash,hashes),isNotNull(guestEmailVerifications.verifiedAt))).orderBy(desc(guestEmailVerifications.verifiedAt)):[];
   await db.transaction(async tx=>{
    for(const row of page){const to=(row.email??guests.find(guest=>guest.hash===guestEmailHash(row.guestId??''))?.email)?.toLowerCase();if(!to)continue;
     const inserted=await tx.insert(jobs).values({type:'roadmap_email',dedupeKey:'roadmap:shipped:'+p.feedbackId+':'+emailHash(to),payload:{workspaceId:p.workspaceId,feedbackId:p.feedbackId,cutoff:p.cutoff,to,userId:row.userId,guestId:row.guestId}}).onConflictDoNothing().returning({id:jobs.id});result.queued+=inserted.length;
    }
    await tx.update(jobs).set(rows.length>50?{status:'pending',attempts:0,lockedAt:null,payload:{...p,cursor:page[page.length-1].id},runAt:new Date(),updatedAt:new Date()}:{status:'succeeded',lockedAt:null,updatedAt:new Date()}).where(lease);
   });continue;
  }
  if(!p.to)throw Error('Missing recipient');
  const [optout]=await db.select({email:voterEmailOptouts.email}).from(voterEmailOptouts).where(and(eq(voterEmailOptouts.workspaceId,p.workspaceId),eq(voterEmailOptouts.email,p.to))).limit(1);
  const [vote]=await db.select({id:votes.id}).from(votes).where(and(eq(votes.workspaceId,p.workspaceId),eq(votes.feedbackId,p.feedbackId),p.userId?eq(votes.userId,p.userId):p.guestId?eq(votes.guestActorId,p.guestId):sql`false`)).limit(1);
  let permitted=Boolean(vote&&!optout);
  if(p.userId){const [person]=await db.select({email:users.email,enabled:notificationPreferences.statusChanges}).from(users).leftJoin(notificationPreferences,eq(notificationPreferences.userId,users.id)).where(eq(users.id,p.userId)).limit(1);permitted=permitted&&person?.email?.toLowerCase()===p.to&&person.enabled!==false;}
  else if(p.guestId){const [verified]=await db.select({id:guestEmailVerifications.id}).from(guestEmailVerifications).where(and(eq(guestEmailVerifications.workspaceId,p.workspaceId),eq(guestEmailVerifications.requesterHash,guestEmailHash(p.guestId)),eq(guestEmailVerifications.email,p.to),isNotNull(guestEmailVerifications.verifiedAt))).limit(1);permitted=permitted&&Boolean(verified);}
  if(permitted){const origin=env.NEXT_PUBLIC_APP_URL,token=roadmapUnsubscribeToken({workspaceId:p.workspaceId,email:p.to},env.EMAIL_UNSUBSCRIBE_SECRET!);await sendRoadmapEmail({to:p.to,key:job.dedupeKey!,title:post.title,note:post.note,url:new URL('/p/'+post.handle+'/roadmap',origin).href,unsubscribeUrl:new URL('/api/email/roadmap-unsubscribe?token='+token,origin).href});result.sent++;}else result.suppressed++;
  await db.update(jobs).set({status:'succeeded',lockedAt:null,lastError:null,updatedAt:new Date()}).where(lease);
 }catch{const failed=job.attempts>=job.maxAttempts;await db.update(jobs).set({status:failed?'failed':'pending',lockedAt:null,lastError:'Roadmap email delivery not confirmed',runAt:new Date(Date.now()+Math.min(3600,30*2**(job.attempts-1))*1000),updatedAt:new Date()}).where(lease);result[failed?'failed':'retried']++;console.error('Roadmap notification delivery deferred',{jobId:job.id,failed});}}
 return result;
}

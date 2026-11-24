import 'server-only';
import {and,asc,eq,lt,lte,sql} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {jobs,workspaces,workspaceWeeklySummaries} from '@/server/db/schema';
import {generateWeeklySummary,mondayUtc} from './weekly-summary';

const type='ai_weekly_summary';
const payload=z.object({workspaceId:z.uuid(),weekStart:z.iso.datetime()}).strict();
export async function processWeeklySummaries(){
 const db=getDb(),now=new Date(),week=mondayUtc(now),weekKey=week.toISOString();
 const eligible=await db.select({workspaceId:workspaces.id}).from(workspaces).where(sql`not exists (select 1 from ${jobs} where ${jobs.dedupeKey} = 'weekly:metrics:' || ${workspaces.id}::text || ':' || ${weekKey})`).limit(50);
 if(eligible.length)await db.insert(jobs).values(eligible.map(row=>({type,dedupeKey:'weekly:metrics:'+row.workspaceId+':'+weekKey,payload:{workspaceId:row.workspaceId,weekStart:weekKey},runAt:now}))).onConflictDoNothing();
 const [job]=await db.transaction(async tx=>{
  const expired=and(eq(jobs.type,type),eq(jobs.status,'running'),lt(jobs.lockedAt,new Date(now.getTime()-10*60000)));
  await tx.update(jobs).set({status:'failed',lockedAt:null,lastError:'Weekly summary lease expired',updatedAt:now}).where(and(expired,sql`${jobs.attempts}>=${jobs.maxAttempts}`));
  await tx.update(jobs).set({status:'pending',lockedAt:null,updatedAt:now}).where(and(expired,sql`${jobs.attempts}<${jobs.maxAttempts}`));
  const [next]=await tx.select().from(jobs).where(and(eq(jobs.type,type),eq(jobs.status,'pending'),lte(jobs.runAt,now),sql`${jobs.attempts}<${jobs.maxAttempts}`)).orderBy(asc(jobs.runAt),asc(jobs.id)).limit(1).for('update',{skipLocked:true});
  if(!next)return [];
  return tx.update(jobs).set({status:'running',attempts:next.attempts+1,lockedAt:now,updatedAt:now}).where(eq(jobs.id,next.id)).returning();
 });
 if(!job)return {configured:true,processed:0};
 const lease=and(eq(jobs.id,job.id),eq(jobs.status,'running'),eq(jobs.attempts,job.attempts),eq(jobs.lockedAt,now));
 try{
  const p=payload.parse(job.payload),end=new Date(p.weekStart),start=new Date(end.getTime()-7*86400000);
  const summary=await generateWeeklySummary(p.workspaceId,start,end);
  await db.transaction(async tx=>{
   const [active]=await tx.select({id:jobs.id}).from(jobs).where(lease).for('update');if(!active)return;
   const [workspace]=await tx.select({id:workspaces.id}).from(workspaces).where(eq(workspaces.id,p.workspaceId)).for('update');
   if(workspace)await tx.insert(workspaceWeeklySummaries).values({workspaceId:p.workspaceId,weekStart:end,source:'metrics',...summary}).onConflictDoUpdate({target:[workspaceWeeklySummaries.workspaceId,workspaceWeeklySummaries.weekStart],set:{...summary,source:'metrics'}});
   await tx.update(jobs).set({status:'succeeded',lockedAt:null,lastError:null,updatedAt:new Date()}).where(lease);
  });
 }catch{
  const failed=job.attempts>=job.maxAttempts;
  await db.update(jobs).set({status:failed?'failed':'pending',lockedAt:null,lastError:'Weekly summary could not be generated',runAt:new Date(Date.now()+Math.min(3600,30*2**(job.attempts-1))*1000),updatedAt:new Date()}).where(lease);
 }
 return {configured:true,processed:1};
}

import 'server-only';
import {and,asc,eq,isNull,lt,lte,sql,or} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {users,lifecycleEmailState,jobs,workspaceMembers,boards} from '@/server/db/schema';
import {getServerEnv} from '@/server/env';
import {eligibleLifecycleEmail,lifecycleKinds} from '@/server/emails/lifecycle-policy';
import {lifecycleUnsubscribeToken} from '@/server/emails/unsubscribe';
import {sendLifecycleEmail} from '@/server/email';
const payloadSchema=z.object({userId:z.uuid(),kind:z.enum(lifecycleKinds)});
async function recipient(userId:string){
  const db=getDb();
  const [row]=await db.select({user:users,state:lifecycleEmailState}).from(lifecycleEmailState).innerJoin(users,eq(users.id,lifecycleEmailState.userId)).where(eq(users.id,userId)).limit(1);
  if(!row)return null;
  const owned=and(eq(workspaceMembers.userId,userId),eq(workspaceMembers.role,'owner'),eq(workspaceMembers.status,'active'));
  const [workspace]=await db.select({id:workspaceMembers.workspaceId,createdAt:workspaceMembers.createdAt}).from(workspaceMembers).where(owned).orderBy(asc(workspaceMembers.createdAt)).limit(1);
  const [board]=await db.select({id:boards.id}).from(boards).innerJoin(workspaceMembers,eq(workspaceMembers.workspaceId,boards.workspaceId)).where(owned).limit(1);
  return {...row,state:{...row.state,hasWorkspace:Boolean(workspace),workspaceCreatedAt:workspace?.createdAt,hasBoard:Boolean(board)}};
}
/** Bounded discovery, idempotent per user/kind. Do not run a retroactive account blast. */
export async function enqueueLifecycleEmails(limit=100){
  const env=getServerEnv();
  if(env.LIFECYCLE_EMAILS_ENABLED!=='true')return {enabled:false,queued:0};
  const db=getDb(),now=new Date();
  const state=lifecycleEmailState;
  const missing=(kind:string)=>sql`not exists (select 1 from ${jobs} where ${jobs.dedupeKey} = 'lifecycle:' || ${state.userId}::text || ':' || ${kind})`;
  const ownsWorkspace=sql`exists (select 1 from ${workspaceMembers} where ${workspaceMembers.userId}=${state.userId} and ${workspaceMembers.role}='owner' and ${workspaceMembers.status}='active')`;
  const workspaceOldEnough=sql`exists (select 1 from ${workspaceMembers} where ${workspaceMembers.userId}=${state.userId} and ${workspaceMembers.role}='owner' and ${workspaceMembers.status}='active' and ${workspaceMembers.createdAt} <= ${new Date(now.getTime()-3*86_400_000)})`;
  const noBoard=sql`not exists (select 1 from ${boards} inner join ${workspaceMembers} on ${workspaceMembers.workspaceId}=${boards.workspaceId} where ${workspaceMembers.userId}=${state.userId} and ${workspaceMembers.role}='owner' and ${workspaceMembers.status}='active')`;
  const day=86_400_000;
  // Filter due, unqueued kinds before LIMIT: ineligible older accounts cannot
  // starve the next batch. Ownership excludes public-board-only participants.
  const due=or(
    and(eq(state.welcomeEligible,true),sql`${state.enrolledAt} > ${new Date(now.getTime()-day)}`,missing('welcome')),
    and(lte(state.onboardingStartedAt,new Date(now.getTime()-day)),isNull(state.onboardingCompletedAt),missing('onboarding_reminder')),
    and(lte(state.enrolledAt,new Date(now.getTime()-3*day)),workspaceOldEnough,noBoard,missing('first_board_reminder')),
    and(lte(state.lastActiveAt,new Date(now.getTime()-30*day)),ownsWorkspace,missing('inactive')),
  );
  const rows=await db.select({id:state.userId}).from(state).innerJoin(users,eq(users.id,state.userId)).where(and(isNull(state.optedOutAt),sql`${users.email} is not null`,due)).orderBy(asc(state.enrolledAt)).limit(Math.min(100,Math.max(1,limit)));
  let queued=0;
  for(const row of rows){
    const current=await recipient(row.id);
    if(!current?.user.email)continue;
    for(const kind of lifecycleKinds){
      if(!eligibleLifecycleEmail(kind,current.state,now))continue;
      const inserted=await db.insert(jobs).values({type:'lifecycle_email',payload:{userId:row.id,kind},dedupeKey:`lifecycle:${row.id}:${kind}`}).onConflictDoNothing().returning({id:jobs.id});
      queued+=inserted.length;
    }
  }
  return {enabled:true,queued};
}
export async function processLifecycleEmails(limit=1){
  const env=getServerEnv();
  const configured=Boolean(env.LIFECYCLE_EMAILS_ENABLED==='true'&&env.SENDBYTE_API_KEY&&env.EMAIL_FROM&&env.EMAIL_UNSUBSCRIBE_SECRET);
  const result={configured,accepted:0,suppressed:0,retried:0,failed:0};
  if(!configured)return result;
  const db=getDb(),now=new Date();
  const claimed=await db.transaction(async tx=>{
    const expired=and(eq(jobs.type,'lifecycle_email'),eq(jobs.status,'running'),lt(jobs.lockedAt,new Date(now.getTime()-10*60_000)));
    await tx.update(jobs).set({status:'failed',lockedAt:null,lastError:'Worker lease expired after final attempt',updatedAt:now}).where(and(expired,sql`${jobs.attempts} >= ${jobs.maxAttempts}`));
    await tx.update(jobs).set({status:'pending',lockedAt:null,updatedAt:now}).where(and(expired,sql`${jobs.attempts} < ${jobs.maxAttempts}`));
    const rows=await tx.select().from(jobs).where(and(eq(jobs.type,'lifecycle_email'),eq(jobs.status,'pending'),lte(jobs.runAt,now),sql`${jobs.attempts} < ${jobs.maxAttempts}`)).orderBy(asc(jobs.runAt),asc(jobs.id)).limit(Math.min(3,Math.max(1,limit))).for('update',{skipLocked:true});
    const result:(typeof jobs.$inferSelect)[]=[];
    for(const row of rows){const [locked]=await tx.update(jobs).set({status:'running',attempts:row.attempts+1,lockedAt:now,updatedAt:now}).where(eq(jobs.id,row.id)).returning();result.push(locked);}
    return result;
  });
  for(const job of claimed){
    const lease=and(eq(jobs.id,job.id),eq(jobs.status,'running'),eq(jobs.attempts,job.attempts),eq(jobs.lockedAt,now));
    try{
      const payload=payloadSchema.safeParse(job.payload);
      if(!payload.success){await db.update(jobs).set({status:'failed',lockedAt:null,lastError:'Invalid lifecycle job payload',updatedAt:new Date()}).where(lease);result.failed++;continue;}
      const {userId,kind}=payload.data;
      const current=await recipient(userId);
      if(current?.user.email&&eligibleLifecycleEmail(kind,current.state,new Date())){
        const url=new URL('/api/email/unsubscribe',env.NEXT_PUBLIC_APP_URL);
        url.searchParams.set('user',userId);url.searchParams.set('token',lifecycleUnsubscribeToken(userId,env.EMAIL_UNSUBSCRIBE_SECRET!));
        await sendLifecycleEmail({to:current.user.email,kind,appOrigin:env.NEXT_PUBLIC_APP_URL,unsubscribeUrl:url.href,key:`lifecycle:${userId}:${kind}`});
        result.accepted++;
      }else result.suppressed++;
      await db.update(jobs).set({status:'succeeded',lockedAt:null,lastError:null,updatedAt:new Date()}).where(lease);
    }catch{
      const failed=job.attempts>=job.maxAttempts;
      await db.update(jobs).set({status:failed?'failed':'pending',lockedAt:null,lastError:'Lifecycle email acceptance not confirmed',runAt:new Date(Date.now()+Math.min(3600,30*2**(job.attempts-1))*1000),updatedAt:new Date()}).where(lease);
      result[failed?'failed':'retried']++;
    }
  }
  return result;
}

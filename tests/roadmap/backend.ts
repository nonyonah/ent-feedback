import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {and,eq,sql} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {users,workspaces,boards,feedback,votes,comments,workspaceMembers,voterEmailOptouts,jobs,notificationPreferences,guestActors,guestEmailVerifications} from '@/server/db/schema';
import {roadmapVotesAction} from '@/server/actions/roadmap';
import {loadFeedbackAction} from '@/server/actions/feedback';
import {readRoadmap,updateRoadmap} from '@/server/roadmap/service';
import {processRoadmapJobs} from '@/server/roadmap/emails';
import {GET as publicRoute} from '@/app/api/public/roadmap/route';
import {GET as unsubscribe} from '@/app/api/email/roadmap-unsubscribe/route';
import {roadmapUnsubscribeToken} from '@/lib/roadmap-unsubscribe';
import {guestEmailHash} from '@/server/guest-email';
declare const global:typeof globalThis&{chatUser:typeof users.$inferSelect|null;chatEnv:Record<string,string>;roadmapEmails:{key:string;to:string;title:string;note:string;unsubscribeUrl:string}[];roadmapFail:boolean};
export async function run(){
 const db=getDb();global.chatEnv.EMAIL_UNSUBSCRIBE_SECRET='roadmap-unsubscribe-fixture-secret-32';global.roadmapEmails=[];
 const [owner,outsider,voter,opted,disabled]=await db.insert(users).values(['owner','outside','voter','opted','disabled'].map(name=>({clerkUserId:randomUUID(),name,email:name+'@example.com'}))).returning();
 const [workspace,other]=await db.insert(workspaces).values([{name:'Roadmap',handle:'roadmap-fixture'},{name:'Other',handle:'other-roadmap'}]).returning();
 await db.insert(workspaceMembers).values([{workspaceId:workspace.id,userId:owner.id,role:'owner'},{workspaceId:other.id,userId:outsider.id,role:'owner'}]);
 const [board,otherBoard]=await db.insert(boards).values([{workspaceId:workspace.id,name:'First',handle:'first'},{workspaceId:other.id,name:'Other',handle:'other'}]).returning();
 const [open,planned,second,hidden,progress,shipped,otherPost]=await db.insert(feedback).values([
  {workspaceId:workspace.id,boardId:board.id,title:'Open'},
  {workspaceId:workspace.id,boardId:board.id,title:'Planned',status:'planned' as const,roadmapOrder:0},
  {workspaceId:workspace.id,boardId:board.id,title:'Second',status:'planned' as const,roadmapOrder:2},
  {workspaceId:workspace.id,boardId:board.id,title:'Hidden',status:'planned' as const,roadmapVisible:false},
  {workspaceId:workspace.id,boardId:board.id,title:'Progress',status:'in-progress' as const},
  {workspaceId:workspace.id,boardId:board.id,title:'Shipped',status:'shipped' as const},
  {workspaceId:other.id,boardId:otherBoard.id,title:'Other secret',status:'planned' as const},
 ]).returning();
 const publicData=await readRoadmap(workspace.id);assert.deepEqual(publicData.planned.map(row=>row.id),[planned.id,second.id]);assert.equal(publicData.in_progress.length,1);assert.equal(publicData.shipped.length,1);assert.ok(!JSON.stringify(publicData).includes('email'));assert.ok(!JSON.stringify(publicData).includes(otherPost.id));assert.ok(!JSON.stringify(publicData).includes(open.id));
 // Public readers must see guest-authored and anonymized registered posts.
 global.chatUser=null;
 const [anonymous,masked]=await db.insert(feedback).values([
  {workspaceId:workspace.id,boardId:board.id,title:'Guest public visibility',body:'Anonymous visitor report',guestName:'Anonymous',status:'planned',roadmapOrder:20},
  {workspaceId:workspace.id,boardId:board.id,title:'Masked public visibility',body:'Registered anonymous report',authorUserId:owner.id,guestName:'Anonymous',status:'planned',roadmapOrder:21},
 ]).returning();
 const guestBoard=await loadFeedbackAction(workspace.id,board.id);assert.equal(guestBoard.ok,true);
 if(guestBoard.ok){for(const id of [anonymous.id,masked.id]){const row:{author:string;avatarUrl?:string}|undefined=guestBoard.data.items.find(item=>item.id===id);assert.ok(row);assert.equal(row.author,'Anonymous');assert.equal(row.avatarUrl,undefined);}}
 const guestRoadmap=await publicRoute(new Request('https://ent.test/api/public/roadmap?projectKey=roadmap-fixture'));assert.equal(guestRoadmap.status,200);const guestColumns=await guestRoadmap.json();for(const id of [anonymous.id,masked.id])assert.ok(guestColumns.planned.some((item:{id:string})=>item.id===id));assert.ok(!JSON.stringify(guestColumns).includes('authorUserId'));
 await db.delete(feedback).where(sql`${feedback.id} in (${anonymous.id},${masked.id})`);
 global.chatUser=owner;assert.ok((await readRoadmap(workspace.id,{admin:true})).open_items?.some(row=>row.id===open.id));assert.ok((await readRoadmap(workspace.id,{admin:true})).planned.some(row=>row.id===hidden.id));
 const api=await publicRoute(new Request('https://ent.test/api/public/roadmap?projectKey=roadmap-fixture'));assert.equal(api.status,200);assert.ok(api.headers.get('Cache-Control')?.includes('no-store'));const safe=JSON.stringify(await api.json());assert.ok(!safe.includes(hidden.id));assert.ok(!safe.includes('roadmap_visible'));assert.equal((await publicRoute(new Request('https://ent.test/api/public/roadmap?projectKey=invalid!'))).status,400);
 global.chatUser=outsider;await assert.rejects(()=>updateRoadmap(planned.id,{projectId:workspace.id,status:'shipped'}));await assert.rejects(()=>readRoadmap(workspace.id,{admin:true}));
 global.chatUser=owner;await assert.rejects(()=>updateRoadmap(otherPost.id,{projectId:workspace.id,status:'shipped'}));await assert.rejects(()=>updateRoadmap(planned.id,{projectId:workspace.id,status:'reviewing'}));await assert.rejects(()=>updateRoadmap(planned.id,{projectId:workspace.id,public_note:'x'.repeat(141)}));
 const moved=await updateRoadmap(progress.id,{projectId:workspace.id,status:'planned',before_id:planned.id,after_id:second.id});assert.equal(moved.roadmap_order,1);assert.equal((await readRoadmap(workspace.id)).planned[1].id,progress.id);const rebased=await updateRoadmap(hidden.id,{projectId:workspace.id,before_id:planned.id,after_id:second.id});assert.equal(rebased.roadmap_order,0.5,'stale adjacent anchors resolve to the current successor');
 await updateRoadmap(progress.id,{projectId:workspace.id,roadmap_order:-1});assert.equal((await readRoadmap(workspace.id)).planned[0].id,progress.id);
 await updateRoadmap(progress.id,{projectId:workspace.id,roadmap_visible:false});assert.ok(!(await readRoadmap(workspace.id)).planned.some(row=>row.id===progress.id));await updateRoadmap(progress.id,{projectId:workspace.id,roadmap_visible:true});
 await db.insert(votes).values([voter,opted,disabled].map(user=>({workspaceId:workspace.id,feedbackId:planned.id,userId:user.id})));
 await db.insert(comments).values([{workspaceId:workspace.id,feedbackId:planned.id,authorUserId:voter.id,body:'Count this comment'},{workspaceId:workspace.id,feedbackId:planned.id,authorUserId:owner.id,body:'Count this reply'},{workspaceId:workspace.id,feedbackId:planned.id,body:'Deleted comment',deletedAt:new Date()},{workspaceId:other.id,feedbackId:otherPost.id,body:'Other workspace comment'}]);
 for(const admin of [false,true]){const totals=await readRoadmap(workspace.id,{admin});const row=totals.planned.find(item=>item.id===planned.id);assert.equal(row?.vote_count,3);assert.equal(row?.comment_count,2);assert.equal(totals.planned.find(item=>item.id===second.id)?.vote_count,0);assert.equal(totals.planned.find(item=>item.id===second.id)?.comment_count,0);}
 global.chatUser=voter;const own=await roadmapVotesAction(workspace.id,[planned.id,second.id]);assert.equal(own.ok,true);if(own.ok){assert.equal(own.data.items.find(row=>row.id===planned.id)?.voted,true);assert.equal(own.data.items.find(row=>row.id===second.id)?.voted,false);}global.chatUser=owner;
 const withVoters=await readRoadmap(workspace.id);assert.equal(withVoters.planned.find(row=>row.id===planned.id)?.voters?.length,3);assert.ok(withVoters.planned.find(row=>row.id===planned.id)?.voters?.every(row=>Object.keys(row).sort().join(',')==='avatar_url,name'));
 await db.insert(notificationPreferences).values({userId:disabled.id,statusChanges:false});await db.insert(voterEmailOptouts).values({workspaceId:workspace.id,email:opted.email!});
 const [guest]=await db.insert(guestActors).values({workspaceId:workspace.id,tokenHash:randomUUID()}).returning();await db.insert(votes).values({workspaceId:workspace.id,feedbackId:planned.id,guestActorId:guest.id});await db.insert(guestEmailVerifications).values({workspaceId:workspace.id,kind:'feedback',subjectId:planned.id,requesterHash:guestEmailHash(guest.id),email:'guest@example.com',tokenHash:randomUUID(),expiresAt:new Date(),verifiedAt:new Date()});
 const finished=await updateRoadmap(planned.id,{projectId:workspace.id,status:'shipped',public_note:'Now available',notify_voters:true});assert.ok(finished.shipped_at);
 global.roadmapFail=true;await processRoadmapJobs(3);await processRoadmapJobs(3);await db.update(jobs).set({runAt:new Date(0)}).where(eq(jobs.type,'roadmap_email'));for(let i=0;i<5;i++)await processRoadmapJobs(3);
 assert.deepEqual(global.roadmapEmails.map(message=>message.to).sort(),['guest@example.com',voter.email].sort());assert.ok(global.roadmapEmails.every(message=>message.note==='Now available'));
 const link=global.roadmapEmails[0].unsubscribeUrl;assert.ok(!link.includes('@'));assert.equal((await unsubscribe(new Request(link))).status,200);assert.equal((await unsubscribe(new Request(link+'broken'))).status,400);
 await updateRoadmap(planned.id,{projectId:workspace.id,status:'planned'});await updateRoadmap(planned.id,{projectId:workspace.id,status:'shipped',notify_voters:true});for(let i=0;i<2;i++)await processRoadmapJobs(3);assert.equal(global.roadmapEmails.length,2);await updateRoadmap(planned.id,{projectId:workspace.id,status:'planned'});const [back]=await db.select().from(feedback).where(eq(feedback.id,planned.id));assert.equal(back.shippedAt,null);assert.ok(back.shippedNotifiedAt);
 await updateRoadmap(planned.id,{projectId:workspace.id,status:'shipped',notify_voters:true});for(let i=0;i<3;i++)await processRoadmapJobs(3);assert.equal(global.roadmapEmails.length,2);
 await updateRoadmap(progress.id,{projectId:workspace.id,status:'shipped',notify_voters:false});assert.equal((await db.select().from(jobs).where(eq(jobs.dedupeKey,'roadmap:fanout:'+progress.id))).length,0);
 await db.update(feedback).set({shippedAt:new Date(Date.now()-40*86400000)}).where(eq(feedback.id,shipped.id));assert.equal((await readRoadmap(workspace.id)).has_older_shipped,true);assert.ok(!(await readRoadmap(workspace.id)).shipped.some(row=>row.id===shipped.id));assert.ok((await readRoadmap(workspace.id,{allShipped:true})).shipped.some(row=>row.id===shipped.id));
 await updateRoadmap(progress.id,{projectId:workspace.id,status:'open'});assert.ok((await readRoadmap(workspace.id,{admin:true})).open_items?.some(row=>row.id===progress.id));assert.ok(!(await readRoadmap(workspace.id)).shipped.some(row=>row.id===progress.id));
 // The database trigger also covers status updates outside the roadmap service.
 await db.update(feedback).set({status:'shipped'}).where(eq(feedback.id,open.id));const [triggered]=await db.select().from(feedback).where(eq(feedback.id,open.id));assert.ok(triggered.shippedAt);await db.update(feedback).set({status:'open'}).where(eq(feedback.id,open.id));assert.equal((await db.select().from(feedback).where(eq(feedback.id,open.id)))[0].shippedAt,null);
 const token=roadmapUnsubscribeToken({workspaceId:workspace.id,email:'other@example.com'},global.chatEnv.EMAIL_UNSUBSCRIBE_SECRET);assert.equal((await unsubscribe(new Request('https://ent.test/api/email/roadmap-unsubscribe?token='+token))).status,200);assert.equal((await db.select().from(voterEmailOptouts).where(and(eq(voterEmailOptouts.workspaceId,workspace.id),eq(voterEmailOptouts.email,'other@example.com')))).length,1);
 const rls=await db.execute(sql`select relrowsecurity from pg_class where relname='feedback' and relnamespace=(select oid from pg_namespace where nspname=current_schema())`);assert.equal(rls.rows[0].relrowsecurity,true);
 console.log('PASS: roadmap per-item vote/comment totals, public filtering, owner/tenant enforcement, fractional moves, hide/show, note limits, central shipped timestamps, recent/all shipped, queued retryable deduplicated voter emails, verified guests, preferences and signed unsubscribe.');
}

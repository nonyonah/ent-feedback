import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {and,eq,sql} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {users,workspaces,boards,feedback,comments,statusHistory,chatSettings,widgetSettings,chatMessages,guestEmailVerifications,jobs} from '@/server/db/schema';
import {loadFeedbackAction,loadFeedbackActivityAction,mutateFeedbackAction} from '@/server/actions/feedback';
import {startConversation,updateContact,snapshot,resendChatVerification} from '@/server/chat/service';
import {confirmGuestEmail,guestEmailVerified,requestGuestVerification} from '@/server/guest-email';
import {deliverChatJob} from '@/server/chat/notifications';
import {publishActivity} from '@/server/activity';
import {processNotificationJobs} from '@/server/notification-worker';
import {GET as chatConfiguration} from '@/app/api/chat/[workspaceId]/route';
import {GET as verificationPage,POST as verificationConfirm} from '@/app/api/email/verify/route';
declare const global:typeof globalThis&{verificationEmails:{to:string;url:string}[];emailCalls:unknown[];activityEmails:unknown[];chatUser:unknown;chatAfter?:()=>Promise<void>};
function data<T>(result:{ok:true;data:T}|{ok:false;error:{message:string}}):T{if(!result.ok)assert.fail(result.error.message);return result.data;}
export async function run(){
 const db=getDb();global.chatUser=null;
 const [workspace]=await db.insert(workspaces).values({name:'Security fixture',handle:'security-fixture'}).returning();
 const [other]=await db.insert(workspaces).values({name:'Other fixture',handle:'other-fixture'}).returning();
 const [board]=await db.insert(boards).values({workspaceId:workspace.id,name:'Feedback',handle:'product',color:'#737373'}).returning();
 const [team]=await db.insert(users).values({clerkUserId:'security-clerk',email:'team@example.com',name:'Team'}).returning();
 const at=new Date('2026-11-01T12:00:00Z');
 const posts=await db.insert(feedback).values(Array.from({length:32},(_,i)=>({workspaceId:workspace.id,boardId:board.id,title:'Fixture '+i,body:'Body',createdAt:sql`'2026-11-01T12:00:00Z'::timestamptz + ${i} * interval '1 microsecond'`}))).returning();
 await db.insert(comments).values(Array.from({length:47},(_,i)=>({workspaceId:workspace.id,feedbackId:posts[0].id,body:'Comment '+i,createdAt:at})));
 await db.insert(statusHistory).values(Array.from({length:24},()=>({workspaceId:workspace.id,feedbackId:posts[0].id,previousStatus:'open' as const,newStatus:'planned' as const,actorUserId:team.id,createdAt:at})));
 const guestToken='a'.repeat(64);
 const first=data(await loadFeedbackAction(workspace.id,board.id,guestToken));assert.equal(first.items.length,25);assert.ok(first.nextCursor);
 const second=data(await loadFeedbackAction(workspace.id,board.id,guestToken,first.nextCursor!));assert.equal(second.items.length,7);assert.equal(second.nextCursor,null);
 const loaded=[...first.items,...second.items];assert.equal(new Set(loaded.map(p=>p.id)).size,32);
 const target=loaded.find(p=>p.id===posts[0].id)!;assert.equal(target.comments.length,20);assert.equal(target.commentCount,47);assert.equal(target.statusHistory.length,20);
 const earlier=data(await loadFeedbackActivityAction(workspace.id,board.id,target.id,guestToken,target.nextCommentCursor!,target.nextHistoryCursor!)).items[0];assert.equal(earlier.comments.length,20);assert.equal(earlier.statusHistory.length,4);
 const last=data(await loadFeedbackActivityAction(workspace.id,board.id,target.id,guestToken,earlier.nextCommentCursor!)).items[0];assert.equal(last.comments.length,7);assert.equal(last.nextCommentCursor,null);
 assert.equal(new Set([...target.comments,...earlier.comments,...last.comments].map(c=>c.id)).size,47);
 assert.equal((await loadFeedbackAction(other.id,board.id,guestToken)).ok,false);
 assert.equal((await loadFeedbackAction(workspace.id,board.id,guestToken,'not-json')).ok,false);
 const changed=data(await mutateFeedbackAction(workspace.id,board.id,{type:'vote',id:target.id,active:true},guestToken));assert.equal(changed.items.length,1);assert.equal(changed.items[0].id,target.id);assert.equal(changed.items[0].voted,true);
 console.log('PASS: bounded posts/comments/history, tied-date cursors, no missing records, one-record mutation response, tenant checks');

 await db.insert(chatSettings).values({workspaceId:workspace.id,enabled:true});await db.insert(widgetSettings).values({workspaceId:workspace.id,details:'optional',collectEmail:true});
 const session=await startConversation(workspace.id);
 await updateContact(workspace.id,session.id,session.token,{email:'Visitor@example.com'});
 assert.equal(global.verificationEmails.length,1);const link=new URL(global.verificationEmails[0].url);const id=link.searchParams.get('id')!,token=link.searchParams.get('token')!;
 const [claim]=await db.select().from(guestEmailVerifications).where(eq(guestEmailVerifications.id,id));assert.notEqual(claim.tokenHash,token);assert.equal(claim.email,'visitor@example.com');
 assert.equal((await snapshot(workspace.id,session.id,undefined,session.token)).emailVerified,false);
 await assert.rejects(()=>resendChatVerification(workspace.id,session.id,'b'.repeat(64)));
 const get=await verificationPage(new Request(link));assert.equal(get.status,200);assert.equal(await guestEmailVerified({workspaceId:workspace.id,kind:'chat',subjectId:session.id,email:claim.email}),false);
 const forged=await verificationConfirm(new Request(link,{method:'POST',headers:{Origin:'https://evil.example'},body:new URLSearchParams({id,token})}));assert.equal(forged.status,403);
 await assert.rejects(()=>confirmGuestEmail(id,'b'.repeat(64)));
 const requestId=randomUUID();await db.insert(chatMessages).values({workspaceId:workspace.id,conversationId:session.id,requestId,role:'team',authorUserId:team.id,body:'Private team reply'});
 const [job]=await db.insert(jobs).values({type:'chat_delivery',payload:{workspaceId:workspace.id,conversationId:session.id,event:'reply',eventId:requestId,delivery:'email'}}).returning();
 await deliverChatJob(job);assert.equal(global.emailCalls.length,0);
 await confirmGuestEmail(id,token);await assert.rejects(()=>confirmGuestEmail(id,token));
 assert.equal((await snapshot(workspace.id,session.id,undefined,session.token)).emailVerified,true);
 await deliverChatJob(job);assert.equal(global.emailCalls.length,1);
 assert.equal(await guestEmailVerified({workspaceId:other.id,kind:'chat',subjectId:session.id,email:claim.email}),false);
 assert.equal(await guestEmailVerified({workspaceId:workspace.id,kind:'feedback',subjectId:session.id,email:claim.email}),false);
 await updateContact(workspace.id,session.id,session.token,{email:'changed@example.com'});assert.equal((await snapshot(workspace.id,session.id,undefined,session.token)).emailVerified,false);
 await deliverChatJob(job);assert.equal(global.emailCalls.length,1);
 const newest=new URL(global.verificationEmails.at(-1)!.url);await db.update(guestEmailVerifications).set({expiresAt:new Date(Date.now()-1000)}).where(eq(guestEmailVerifications.id,newest.searchParams.get('id')!));await assert.rejects(()=>confirmGuestEmail(newest.searchParams.get('id')!,newest.searchParams.get('token')!));
 console.log('PASS: hashed/single-use/expiring verification, GET scanners and cross-origin POST cannot confirm, chat emails fail closed, address-change invalidation');

 const [guestPost]=await db.insert(feedback).values({workspaceId:workspace.id,boardId:board.id,title:'Guest feedback',guestEmail:'feedback@example.com'}).returning();
 await requestGuestVerification({workspaceId:workspace.id,kind:'feedback',subjectId:guestPost.id,email:guestPost.guestEmail!},'fixture-requester');
 const activity={type:'status_changed' as const,workspaceId:workspace.id,feedbackId:guestPost.id,actorId:team.id,eventId:randomUUID()};
 await db.transaction(tx=>publishActivity(tx,activity));assert.equal((await db.select().from(jobs).where(sql`${jobs.payload}->>'guestFeedbackId'=${guestPost.id}`)).length,0);
 const feedbackLink=new URL(global.verificationEmails.at(-1)!.url);await confirmGuestEmail(feedbackLink.searchParams.get('id')!,feedbackLink.searchParams.get('token')!);
 await db.transaction(tx=>publishActivity(tx,{...activity,eventId:randomUUID()}));assert.equal((await db.select().from(jobs).where(sql`${jobs.payload}->>'guestFeedbackId'=${guestPost.id}`)).length,1);
 // Revocation after enqueue must prevent delivery, too.
 await db.update(guestEmailVerifications).set({verifiedAt:null}).where(and(eq(guestEmailVerifications.workspaceId,workspace.id),eq(guestEmailVerifications.subjectId,guestPost.id)));
 await processNotificationJobs(3);assert.equal(global.activityEmails?.length??0,0);
 // Different subjects avoid depending on a minute-window boundary during a
 // slow remote DB run. The mailbox budget still blocks the fourth request.
 for(let i=0;i<2;i++)await requestGuestVerification({workspaceId:workspace.id,kind:'feedback',subjectId:randomUUID(),email:guestPost.guestEmail!},'budget-fixture-'+i);
 await assert.rejects(()=>requestGuestVerification({workspaceId:workspace.id,kind:'feedback',subjectId:randomUUID(),email:guestPost.guestEmail!},'budget-fixture-last'),/Too many/);
 console.log('PASS: guest feedback queue and delivery enforce verification; resend budgets enforced');
 const configuration=await chatConfiguration(new Request('https://ent.test/api/chat/'+workspace.id),{params:Promise.resolve({workspaceId:workspace.id})});assert.equal(configuration.status,200);
}

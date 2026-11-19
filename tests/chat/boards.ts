import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {eq} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {users,workspaces,workspaceMembers,boards,feedback,comments,votes,attachments} from '@/server/db/schema';
import {createBoardAction,deleteBoardAction} from '@/server/actions/boards';
import {loadFeedbackAction} from '@/server/actions/feedback';
import {getWorkspaceEntitlements} from '@/server/billing/access';
declare const global:typeof globalThis&{chatUser:typeof users.$inferSelect|null};
function data<T>(result:{ok:true;data:T}|{ok:false;error:{message:string}}):T{if(!result.ok)assert.fail(result.error.message);return result.data;}
export async function run(){
 const db=getDb();const [owner,member,outsider]=await db.insert(users).values(['owner','member','outside'].map(name=>({clerkUserId:randomUUID(),name,email:name+'@example.com'}))).returning();
 const [workspace,other]=await db.insert(workspaces).values([{name:'Delete fixture',handle:'delete-fixture'},{name:'Other workspace',handle:'other-fixture'}]).returning();
 await db.insert(workspaceMembers).values([{workspaceId:workspace.id,userId:owner.id,role:'owner'},{workspaceId:workspace.id,userId:member.id,role:'member'},{workspaceId:other.id,userId:outsider.id,role:'owner'}]);
 global.chatUser=owner;
 const create=(name:string)=>createBoardAction(workspace.id,{name,color:'#737373'});
 const first=data(await create('First board')),second=data(await create('Second board'));
 assert.equal((await getWorkspaceEntitlements(workspace.id)).boardLimit,2);
 assert.equal((await create('Blocked third board')).ok,false);
 const [post]=await db.insert(feedback).values({workspaceId:workspace.id,boardId:first.id,title:'Delete this feedback',body:'Body'}).returning();
 const [reply]=await db.insert(comments).values({workspaceId:workspace.id,feedbackId:post.id,body:'Reply'}).returning();
 await db.insert(votes).values({workspaceId:workspace.id,feedbackId:post.id,userId:member.id});
 const [file]=await db.insert(attachments).values({workspaceId:workspace.id,commentId:reply.id,uploadedByUserId:owner.id,storageKey:'fixture/delete.webp',mimeType:'image/webp',byteSize:100,status:'attached',attachedAt:new Date()}).returning();
 for(const actor of [null,member,outsider]){global.chatUser=actor;assert.equal((await deleteBoardAction(workspace.id,first.id)).ok,false);}
 global.chatUser=owner;assert.equal((await deleteBoardAction(other.id,first.id)).ok,false);
 data(await deleteBoardAction(workspace.id,first.id));
 assert.equal((await db.select().from(boards).where(eq(boards.workspaceId,workspace.id))).length,1);
 assert.equal((await db.select().from(feedback).where(eq(feedback.id,post.id))).length,0);
 assert.equal((await db.select().from(comments).where(eq(comments.id,reply.id))).length,0);
 assert.equal((await db.select().from(votes).where(eq(votes.feedbackId,post.id))).length,0);
 const [cleanup]=await db.select().from(attachments).where(eq(attachments.id,file.id));assert.equal(cleanup.status,'pending');assert.equal(cleanup.commentId,null);assert.equal(cleanup.feedbackId,null);assert.ok(cleanup.expiresAt!<new Date());
 assert.equal((await loadFeedbackAction(workspace.id,first.id)).ok,false);
 assert.equal((await deleteBoardAction(workspace.id,first.id)).ok,false);
 const replacement=data(await create('Replacement board'));assert.ok(replacement.id);
 assert.equal((await create('Still limited')).ok,false);
 data(await deleteBoardAction(workspace.id,second.id));data(await deleteBoardAction(workspace.id,replacement.id));
 assert.equal((await db.select().from(boards).where(eq(boards.workspaceId,workspace.id))).length,0);
 assert.ok(data(await create('First after empty')).id);
 console.log('PASS: admin-only tenant-scoped deletion, dependent feedback/comments/votes removed, storage cleanup retained, public reads rejected, Free slots reusable, final board deletion and recreation.');
}

import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {eq} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {users,workspaces,workspaceMembers,workspaceSubscriptions,jobs,boards,feedback,attachments,billingCheckouts} from '@/server/db/schema';
import {cleanDeletedWorkspaceFiles} from '@/server/workspace-cleanup';
import {deleteWorkspaceAction} from '@/server/actions/workspaces';
declare const global:typeof globalThis&{chatUser:typeof users.$inferSelect|null;chatImages:Map<string,Buffer>};
export async function run(){
 const db=getDb();const [owner,member]=await db.insert(users).values([{clerkUserId:randomUUID()},{clerkUserId:randomUUID()}]).returning();
 const [workspace]=await db.insert(workspaces).values({name:'Delete fixture',handle:'delete-fixture'}).returning();
 await db.insert(workspaceMembers).values([{workspaceId:workspace.id,userId:owner.id,role:'owner'},{workspaceId:workspace.id,userId:member.id,role:'member'}]);
 const [board]=await db.insert(boards).values({workspaceId:workspace.id,name:'Board',handle:'board'}).returning();
 const [post]=await db.insert(feedback).values({workspaceId:workspace.id,boardId:board.id,title:'Request',body:'Details'}).returning();
 await db.insert(attachments).values({workspaceId:workspace.id,feedbackId:post.id,uploadedByUserId:owner.id,storageKey:'fixture/test.webp',mimeType:'image/webp',byteSize:100,status:'attached',attachedAt:new Date()});
 global.chatUser=member;assert.equal((await deleteWorkspaceAction({workspaceId:workspace.id,confirmation:workspace.name})).ok,false);
 global.chatUser=owner;assert.equal((await deleteWorkspaceAction({workspaceId:workspace.id,confirmation:'wrong'})).ok,false);
 await db.insert(workspaceSubscriptions).values({workspaceId:workspace.id,status:'active'});assert.equal((await deleteWorkspaceAction({workspaceId:workspace.id,confirmation:workspace.name})).ok,false);
 await db.update(workspaceSubscriptions).set({status:'canceled'}).where(eq(workspaceSubscriptions.workspaceId,workspace.id));
 assert.ok((await deleteWorkspaceAction({workspaceId:workspace.id,confirmation:workspace.name})).ok);
 assert.equal((await db.select().from(workspaces).where(eq(workspaces.id,workspace.id))).length,0);
 const cleanup=await db.select().from(jobs).where(eq(jobs.type,'workspace_file_cleanup'));assert.equal(cleanup.length,1);assert.equal(cleanup[0].payload.storageKey,'fixture/test.webp');
 global.chatImages.set('fixture/test.webp',Buffer.from('fixture'));assert.equal((await cleanDeletedWorkspaceFiles()).deleted,1);assert.equal(global.chatImages.has('fixture/test.webp'),false);assert.equal((await db.select().from(jobs).where(eq(jobs.type,'workspace_file_cleanup'))).length,0);
 for(const status of ['creating','open'] as const){
  const [checkoutOwner]=await db.insert(users).values({clerkUserId:randomUUID()}).returning();
  const [checkoutWorkspace]=await db.insert(workspaces).values({name:'Checkout fixture',handle:'checkout-'+randomUUID()}).returning();
  await db.insert(workspaceMembers).values({workspaceId:checkoutWorkspace.id,userId:checkoutOwner.id,role:'owner'});
  const [attempt]=await db.insert(billingCheckouts).values({workspaceId:checkoutWorkspace.id,productId:'fixture',interval:'monthly',status,checkoutUrl:'https://checkout.example',expiresAt:new Date(Date.now()+60_000)}).returning();
  global.chatUser=checkoutOwner;
  assert.equal((await deleteWorkspaceAction({workspaceId:checkoutWorkspace.id,confirmation:checkoutWorkspace.name})).ok,false,`${status} checkout should block deletion while live`);
  assert.equal((await db.select().from(billingCheckouts).where(eq(billingCheckouts.id,attempt.id)))[0].status,status);
  await db.update(billingCheckouts).set({expiresAt:new Date(Date.now()-60_000)}).where(eq(billingCheckouts.id,attempt.id));
  assert.ok((await deleteWorkspaceAction({workspaceId:checkoutWorkspace.id,confirmation:checkoutWorkspace.name})).ok,`${status} checkout should not block deletion after expiry`);
  assert.equal((await db.select().from(workspaces).where(eq(workspaces.id,checkoutWorkspace.id))).length,0);
 }
 console.log('PASS: owner authorization, confirmation, live and expired checkout guards, workspace deletion and durable file cleanup.');
}

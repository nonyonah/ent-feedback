import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {eq} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {users,workspaces,workspaceMembers,workspaceSubscriptions,jobs,boards,feedback,attachments,billingCheckouts} from '@/server/db/schema';
import {cleanDeletedWorkspaceFiles} from '@/server/workspace-cleanup';
import {deleteWorkspaceAction} from '@/server/actions/workspaces';
declare const global:typeof globalThis&{chatUser:typeof users.$inferSelect|null;chatImages:Map<string,Buffer>;chatEnv:Record<string,string>;billingProvider:unknown};
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
 global.chatEnv.BACHS_ORGANIZATION_ID='org_fixture';
 const sessions=new Map<string,Record<string,unknown>>();
 global.billingProvider={checkoutSessions:{get:async(id:string)=>{const session=sessions.get(id);if(!session)throw Error('Provider unavailable');return session;}},payments:{get:async(id:string)=>({payment_id:id,checkout_id:'chk_prepaid',status:'succeeded'})},subscriptions:{get:async(id:string)=>({id,status:'active',customer:{customer_id:'cust_fixture'},product_id:'prod_monthly',currency:'USD',amount:'7',billing_cycle:{interval:'month',frequency:1},quantity:1,current_period_end:new Date(Date.now()+86400000).toISOString(),metadata:subscriptionMetadata})}};
 let subscriptionMetadata:Record<string,string>={};
 for(const status of ['creating','open'] as const){
  const [checkoutOwner]=await db.insert(users).values({clerkUserId:randomUUID()}).returning();
  const [checkoutWorkspace]=await db.insert(workspaces).values({name:'Checkout fixture',handle:'checkout-'+randomUUID()}).returning();
  await db.insert(workspaceMembers).values({workspaceId:checkoutWorkspace.id,userId:checkoutOwner.id,role:'owner'});
  const checkoutId='chk_'+status;
  const [attempt]=await db.insert(billingCheckouts).values({workspaceId:checkoutWorkspace.id,productId:'fixture',interval:'monthly',status,checkoutId,checkoutUrl:'https://checkout.example',expiresAt:new Date(Date.now()+60_000)}).returning();
  sessions.set(checkoutId,{checkout_id:checkoutId,reference:attempt.id,status:'expired',payment_status:'unpaid',charge:null,metadata:{workspace_id:checkoutWorkspace.id,checkout_attempt_id:attempt.id,billing_mode:'subscription'}});
  global.chatUser=checkoutOwner;
  assert.equal((await deleteWorkspaceAction({workspaceId:checkoutWorkspace.id,confirmation:checkoutWorkspace.name})).ok,false,`${status} checkout should block deletion while live`);
  assert.equal((await db.select().from(billingCheckouts).where(eq(billingCheckouts.id,attempt.id)))[0].status,status);
  await db.update(billingCheckouts).set({expiresAt:new Date(Date.now()-60_000)}).where(eq(billingCheckouts.id,attempt.id));
  const saved=sessions.get(checkoutId)!;sessions.delete(checkoutId);
  assert.equal((await deleteWorkspaceAction({workspaceId:checkoutWorkspace.id,confirmation:checkoutWorkspace.name})).ok,false,'provider failures must block deletion');
  sessions.set(checkoutId,saved);
  sessions.set(checkoutId,{...sessions.get(checkoutId),status:'open'});
  assert.equal((await deleteWorkspaceAction({workspaceId:checkoutWorkspace.id,confirmation:checkoutWorkspace.name})).ok,false,'provider must confirm terminal state');
  sessions.set(checkoutId,{...sessions.get(checkoutId),status:'expired',payment_status:'succeeded'});
  assert.equal((await deleteWorkspaceAction({workspaceId:checkoutWorkspace.id,confirmation:checkoutWorkspace.name})).ok,false,'provider must confirm unpaid');
  sessions.set(checkoutId,{...sessions.get(checkoutId),payment_status:'unpaid'});
  assert.ok((await deleteWorkspaceAction({workspaceId:checkoutWorkspace.id,confirmation:checkoutWorkspace.name})).ok,`${status} checkout should not block deletion after expiry`);
  assert.equal((await db.select().from(workspaces).where(eq(workspaces.id,checkoutWorkspace.id))).length,0);
 }
 for(const mode of ['subscription','prepaid'] as const){
  const [customer]=await db.insert(users).values({clerkUserId:randomUUID()}).returning();
  const [space]=await db.insert(workspaces).values({name:'Paid '+mode,handle:'paid-'+randomUUID()}).returning();
  await db.insert(workspaceMembers).values({workspaceId:space.id,userId:customer.id,role:'owner'});
  const checkoutId='chk_'+mode;
  const [attempt]=await db.insert(billingCheckouts).values({workspaceId:space.id,productId:'prod_monthly',interval:'monthly',mode,amount:'7.00',status:'open',checkoutId,expiresAt:new Date(Date.now()-60_000)}).returning();
  const metadata={workspace_id:space.id,checkout_attempt_id:attempt.id,billing_mode:mode};subscriptionMetadata=metadata;
  sessions.set(checkoutId,{checkout_id:checkoutId,reference:attempt.id,status:'completed',payment_status:'succeeded',metadata,currency:'USD',amount:'7.00',recurring:null,charge:{payment_id:'pay_fixture',subscription_id:'sub_fixture'}});
  global.chatUser=customer;
  assert.equal((await deleteWorkspaceAction({workspaceId:space.id,confirmation:space.name})).ok,false,`${mode} purchase must block deletion`);
  const [entitlement]=await db.select().from(workspaceSubscriptions).where(eq(workspaceSubscriptions.workspaceId,space.id));
  assert.ok(mode==='prepaid'?entitlement?.prepaidUntil:entitlement?.subscriptionId==='sub_fixture',`${mode} purchase should be reconciled`);
  assert.equal((await db.select().from(billingCheckouts).where(eq(billingCheckouts.id,attempt.id)))[0].status,'completed');
 }
 console.log('PASS: owner authorization, confirmation, live and expired checkout guards, workspace deletion and durable file cleanup.');
}

import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {eq} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {boards,changelogEntries,feedback,users,workspaceMembers,workspaces} from '@/server/db/schema';
import {mcpFeedback,mcpFeedbackDetail,mcpProposeChangelogDraft,mcpWorkspaces} from '@/server/mcp/tools';
import {listMcpDraftProposalsAction,reviewMcpDraftProposalAction} from '@/server/actions/mcp-proposals';
declare const global:typeof globalThis&{chatUser:typeof users.$inferSelect|null};
export async function run(){
 const db=getDb(),ownerClerk=randomUUID(),memberClerk=randomUUID(),outsiderClerk=randomUUID();
 const [owner,member]=await db.insert(users).values([{clerkUserId:ownerClerk},{clerkUserId:memberClerk},{clerkUserId:outsiderClerk}]).returning();
 const [workspace,other]=await db.insert(workspaces).values([{name:'MCP workspace',handle:'mcp-fixture'},{name:'MCP other',handle:'mcp-other'}]).returning();
 await db.insert(workspaceMembers).values([{workspaceId:workspace.id,userId:owner.id,role:'owner'},{workspaceId:workspace.id,userId:member.id,role:'member'}]);
 const [board]=await db.insert(boards).values({workspaceId:workspace.id,name:'Board',handle:'board'}).returning();
 const [post]=await db.insert(feedback).values({workspaceId:workspace.id,boardId:board.id,title:'Shipped export',body:'Export files',status:'shipped'}).returning();
 assert.equal((await mcpWorkspaces(ownerClerk)).length,1);assert.equal((await mcpFeedback(memberClerk,workspace.id,'export')).length,1);
 await assert.rejects(mcpFeedback(outsiderClerk,workspace.id,''));await assert.rejects(mcpFeedback(ownerClerk,other.id,''));
 await assert.rejects(mcpProposeChangelogDraft(memberClerk,workspace.id,{title:'Test',body:'Details',feedbackIds:[]}));
 assert.equal((await mcpFeedbackDetail(memberClerk,workspace.id,post.id)).title,'Shipped export');
 await assert.rejects(mcpFeedbackDetail(outsiderClerk,workspace.id,post.id));
 const proposal=await mcpProposeChangelogDraft(ownerClerk,workspace.id,{title:'Exports',body:'Export files.',feedbackIds:[post.id]});
 assert.equal((await db.select().from(changelogEntries)).length,0,'MCP cannot create a draft without review');
 global.chatUser=member;assert.equal((await reviewMcpDraftProposalAction(workspace.id,proposal.id,'approve')).ok,false);
 global.chatUser=owner;const pending=await listMcpDraftProposalsAction(workspace.id);assert.ok(pending.ok);if(pending.ok)assert.equal(pending.data[0].body,'Export files.');
 const approved=await reviewMcpDraftProposalAction(workspace.id,proposal.id,'approve');assert.ok(approved.ok);if(approved.ok&&approved.data.status==='approved'){const [entry]=await db.select().from(changelogEntries).where(eq(changelogEntries.id,approved.data.entryId));assert.equal(entry.status,'draft');assert.equal(entry.workspaceId,workspace.id);}
 assert.equal((await reviewMcpDraftProposalAction(workspace.id,proposal.id,'approve')).ok,false,'approval cannot be replayed');
 await assert.rejects(mcpProposeChangelogDraft(ownerClerk,other.id,{title:'Test',body:'Details',feedbackIds:[]}));
 console.log('PASS: MCP workspace isolation, feedback access, and admin approval before creating private drafts.');
}

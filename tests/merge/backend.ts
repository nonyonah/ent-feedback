import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {and,eq} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {attachments,boards,changelogEntries,changelogFeedback,comments,connectedApps,feedback,feedbackTags,follows,linearIssueLinks,tags,users,votes,workspaceMembers,workspaces} from '@/server/db/schema';
import {mergeFeedback} from '@/server/feedback/merge';
import {mergeFeedbackAction} from '@/server/actions/merge-feedback';

declare const global:typeof globalThis&{chatUser:typeof users.$inferSelect|null};

export async function run(){
 const db=getDb();
 const [person,other]=await db.insert(users).values([{clerkUserId:randomUUID()},{clerkUserId:randomUUID()}]).returning();
 const [workspace,foreign]=await db.insert(workspaces).values([{name:'Merge fixtures',handle:'merge-fixtures'},{name:'Foreign fixtures',handle:'foreign-fixtures'}]).returning();
 await db.insert(workspaceMembers).values([{workspaceId:workspace.id,userId:person.id,role:'owner'},{workspaceId:workspace.id,userId:other.id,role:'member'}]);
 const [board,foreignBoard]=await db.insert(boards).values([{workspaceId:workspace.id,name:'Board',handle:'board'},{workspaceId:foreign.id,name:'Board',handle:'board'}]).returning();
 const [source,target,outsider]=await db.insert(feedback).values([{workspaceId:workspace.id,boardId:board.id,title:'Source idea',body:'Original description',authorUserId:person.id},{workspaceId:workspace.id,boardId:board.id,title:'Target idea',body:'Destination'},{workspaceId:foreign.id,boardId:foreignBoard.id,title:'Foreign',body:'Private'}]).returning();
 await db.insert(votes).values([{workspaceId:workspace.id,feedbackId:source.id,userId:person.id},{workspaceId:workspace.id,feedbackId:target.id,userId:person.id},{workspaceId:workspace.id,feedbackId:source.id,userId:other.id}]);
 await db.insert(follows).values([{workspaceId:workspace.id,feedbackId:source.id,userId:person.id},{workspaceId:workspace.id,feedbackId:target.id,userId:person.id}]);
 const [tag]=await db.insert(tags).values({workspaceId:workspace.id,name:'Exports'}).returning();
 await db.insert(feedbackTags).values({workspaceId:workspace.id,feedbackId:source.id,tagId:tag.id});
 const [entry]=await db.insert(changelogEntries).values({workspaceId:workspace.id,title:'Entry',body:'Details',slug:'entry'}).returning();
 await db.insert(changelogFeedback).values({workspaceId:workspace.id,feedbackId:source.id,changelogId:entry.id});
 await db.insert(attachments).values({workspaceId:workspace.id,feedbackId:source.id,uploadedByUserId:person.id,storageKey:'fixture-image',mimeType:'image/png',byteSize:10,status:'attached',attachedAt:new Date()});
 const [parent]=await db.insert(comments).values({workspaceId:workspace.id,feedbackId:source.id,authorUserId:person.id,body:'Parent'}).returning();
 await db.insert(comments).values({workspaceId:workspace.id,feedbackId:source.id,authorUserId:other.id,parentCommentId:parent.id,body:'Reply'});
 await assert.rejects(db.transaction(tx=>mergeFeedback(tx,workspace.id,source.id,outsider.id)));
 const [connection]=await db.insert(connectedApps).values({workspaceId:workspace.id,provider:'linear',externalId:'fixture',label:'Linear'}).returning();
 await db.insert(linearIssueLinks).values({workspaceId:workspace.id,connectionId:connection.id,feedbackId:source.id,issueId:'issue-1',identifier:'ENT-1',url:'https://linear.app/fixture'});
 await assert.rejects(db.transaction(tx=>mergeFeedback(tx,workspace.id,source.id,target.id)),/linked Linear/);
 await db.delete(linearIssueLinks).where(eq(linearIssueLinks.feedbackId,source.id));
 global.chatUser=other;assert.equal((await mergeFeedbackAction(workspace.id,source.id,target.id)).ok,false,'members cannot merge');
 global.chatUser=person;assert.equal((await mergeFeedbackAction(workspace.id,source.id,target.id)).ok,true);
 const [merged]=await db.select().from(feedback).where(eq(feedback.id,source.id));assert.equal(merged.mergedIntoId,target.id);
 assert.equal((await db.select().from(votes).where(and(eq(votes.feedbackId,target.id),eq(votes.workspaceId,workspace.id)))).length,2);
 assert.equal((await db.select().from(follows).where(eq(follows.feedbackId,target.id))).length,1);
 const discussion=await db.select().from(comments).where(eq(comments.feedbackId,target.id));assert.equal(discussion.length,3);assert.ok(discussion.some(comment=>comment.parentCommentId===parent.id));assert.ok(discussion.some(comment=>comment.body.includes('Original description')));
 assert.equal((await db.select().from(attachments).where(eq(attachments.feedbackId,target.id))).length,1);
 assert.equal((await db.select().from(feedbackTags).where(eq(feedbackTags.feedbackId,target.id))).length,1);
 assert.equal((await db.select().from(changelogFeedback).where(eq(changelogFeedback.feedbackId,target.id))).length,1);
 await assert.rejects(db.transaction(tx=>mergeFeedback(tx,workspace.id,source.id,target.id)));
 console.log('PASS: merge preserves discussion and distinct votes, isolates workspaces, and rejects repeated merges.');
}

import 'server-only';
import {and,asc,eq,inArray,isNull,sql} from 'drizzle-orm';
import type {Transaction} from '@/server/db/client';
import {attachments,changelogFeedback,comments,conversationFeedback,discordDeliveries,feedback,feedbackTags,follows,linearIssueLinks,notifications,reactions,slackThreads,statusHistory,votes} from '@/server/db/schema';
import {ServiceError} from '@/server/result';

/** Merge within a transaction after authorizing the caller. Locks both posts in ID order. */
export async function mergeFeedback(tx:Transaction,workspaceId:string,sourceId:string,targetId:string){
 if(sourceId===targetId)throw new ServiceError('validation','Choose a different request.');
 const rows=await tx.select().from(feedback).where(and(eq(feedback.workspaceId,workspaceId),inArray(feedback.id,[sourceId,targetId]),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId))).orderBy(asc(feedback.id)).for('update');
 const source=rows.find(row=>row.id===sourceId),target=rows.find(row=>row.id===targetId);
 if(!source||!target)throw new ServiceError('not_found','One of these requests is no longer available. Refresh and try again.');
 // Different external threads or issues cannot be safely collapsed into one.
 const linear=await tx.select({id:linearIssueLinks.id}).from(linearIssueLinks).where(and(eq(linearIssueLinks.workspaceId,workspaceId),eq(linearIssueLinks.feedbackId,sourceId))).limit(1);
 const slack=await tx.select({id:slackThreads.id}).from(slackThreads).where(and(eq(slackThreads.workspaceId,workspaceId),eq(slackThreads.feedbackId,sourceId))).limit(1);
 if(linear.length||slack.length)throw new ServiceError('conflict','This request has a linked Linear issue or Slack thread. Try keeping it as the destination instead.');
 await tx.execute(sql`insert into ${votes} (workspace_id,feedback_id,user_id,guest_actor_id,created_at) select workspace_id,${targetId}::uuid,user_id,guest_actor_id,created_at from ${votes} where workspace_id=${workspaceId}::uuid and feedback_id=${sourceId}::uuid on conflict do nothing`);
 await tx.execute(sql`insert into ${follows} (workspace_id,feedback_id,user_id,created_at) select workspace_id,${targetId}::uuid,user_id,created_at from ${follows} where workspace_id=${workspaceId}::uuid and feedback_id=${sourceId}::uuid on conflict do nothing`);
 await tx.execute(sql`insert into ${reactions} (workspace_id,feedback_id,user_id,guest_actor_id,created_at) select workspace_id,${targetId}::uuid,user_id,guest_actor_id,created_at from ${reactions} where workspace_id=${workspaceId}::uuid and feedback_id=${sourceId}::uuid on conflict do nothing`);
 await tx.execute(sql`insert into ${feedbackTags} (workspace_id,feedback_id,tag_id) select workspace_id,${targetId}::uuid,tag_id from ${feedbackTags} where workspace_id=${workspaceId}::uuid and feedback_id=${sourceId}::uuid on conflict do nothing`);
 await tx.execute(sql`insert into ${conversationFeedback} (workspace_id,conversation_id,feedback_id,created_at) select workspace_id,conversation_id,${targetId}::uuid,created_at from ${conversationFeedback} where workspace_id=${workspaceId}::uuid and feedback_id=${sourceId}::uuid on conflict do nothing`);
 await tx.execute(sql`insert into ${changelogFeedback} (workspace_id,changelog_id,feedback_id,created_at) select workspace_id,changelog_id,${targetId}::uuid,created_at from ${changelogFeedback} where workspace_id=${workspaceId}::uuid and feedback_id=${sourceId}::uuid on conflict do nothing`);
 await tx.delete(feedbackTags).where(and(eq(feedbackTags.workspaceId,workspaceId),eq(feedbackTags.feedbackId,sourceId)));
 await tx.delete(conversationFeedback).where(and(eq(conversationFeedback.workspaceId,workspaceId),eq(conversationFeedback.feedbackId,sourceId)));
 await tx.delete(changelogFeedback).where(and(eq(changelogFeedback.workspaceId,workspaceId),eq(changelogFeedback.feedbackId,sourceId)));
 // Keep the original description visible as part of the destination discussion.
 await tx.insert(comments).values({workspaceId,feedbackId:targetId,authorUserId:source.authorUserId,guestName:source.guestName,guestEmail:source.guestEmail,body:`Merged request: ${source.title}\n\n${source.body}`.trim()});
 await tx.update(comments).set({feedbackId:targetId}).where(and(eq(comments.workspaceId,workspaceId),eq(comments.feedbackId,sourceId)));
 await tx.update(attachments).set({feedbackId:targetId}).where(and(eq(attachments.workspaceId,workspaceId),eq(attachments.feedbackId,sourceId)));
 await tx.update(statusHistory).set({feedbackId:targetId}).where(and(eq(statusHistory.workspaceId,workspaceId),eq(statusHistory.feedbackId,sourceId)));
 await tx.update(notifications).set({feedbackId:targetId}).where(and(eq(notifications.workspaceId,workspaceId),eq(notifications.feedbackId,sourceId)));
 await tx.update(discordDeliveries).set({feedbackId:targetId}).where(and(eq(discordDeliveries.workspaceId,workspaceId),eq(discordDeliveries.feedbackId,sourceId)));
 await tx.update(feedback).set({mergedIntoId:targetId,updatedAt:new Date()}).where(and(eq(feedback.workspaceId,workspaceId),eq(feedback.mergedIntoId,sourceId)));
 await tx.update(feedback).set({startingVotes:sql`${feedback.startingVotes}+${source.startingVotes}`,updatedAt:new Date()}).where(and(eq(feedback.workspaceId,workspaceId),eq(feedback.id,targetId)));
 await tx.update(feedback).set({mergedIntoId:targetId,updatedAt:new Date()}).where(and(eq(feedback.workspaceId,workspaceId),eq(feedback.id,sourceId)));
}

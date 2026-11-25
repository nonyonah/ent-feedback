'use server';
import {and,asc,eq,isNull} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {comments,feedback,mcpReplyProposals} from '@/server/db/schema';
import {requireAppUser} from '@/server/auth';
import {requireWorkspaceRole} from '@/server/services/access';
import {consumeRateLimit} from '@/server/rate-limit';
import {publishActivity} from '@/server/activity';
import {runService,ServiceError} from '@/server/result';

export async function listMcpRepliesAction(workspaceId:string,feedbackId:string){return runService(async()=>{
 const wid=z.uuid().parse(workspaceId),fid=z.uuid().parse(feedbackId),user=await requireAppUser(),db=getDb();await requireWorkspaceRole(db,{workspaceId:wid,userId:user.id,minimumRole:'admin'});
 return db.select({id:mcpReplyProposals.id,body:mcpReplyProposals.body}).from(mcpReplyProposals).where(and(eq(mcpReplyProposals.workspaceId,wid),eq(mcpReplyProposals.feedbackId,fid),eq(mcpReplyProposals.status,'pending'))).orderBy(asc(mcpReplyProposals.createdAt)).limit(20);
});}
export async function reviewMcpReplyAction(workspaceId:string,feedbackId:string,proposalId:string,decision:'approve'|'reject'){return runService(async()=>{
 const wid=z.uuid().parse(workspaceId),fid=z.uuid().parse(feedbackId),pid=z.uuid().parse(proposalId),choice=z.enum(['approve','reject']).parse(decision),user=await requireAppUser(),db=getDb();
 await requireWorkspaceRole(db,{workspaceId:wid,userId:user.id,minimumRole:'admin'});await consumeRateLimit('mcp:reply-review:'+wid+':'+user.id,60,3600);
 return db.transaction(async tx=>{
  const [proposal]=await tx.select().from(mcpReplyProposals).where(and(eq(mcpReplyProposals.id,pid),eq(mcpReplyProposals.workspaceId,wid),eq(mcpReplyProposals.feedbackId,fid))).for('update');
  if(!proposal||proposal.status!=='pending')throw new ServiceError('conflict','This proposal was already reviewed or is unavailable.');
  if(choice==='approve'){
   const [post]=await tx.select({id:feedback.id}).from(feedback).where(and(eq(feedback.id,fid),eq(feedback.workspaceId,wid),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId))).for('update');if(!post)throw new ServiceError('not_found','This request is no longer available.');
   const [comment]=await tx.insert(comments).values({workspaceId:wid,feedbackId:fid,authorUserId:user.id,body:proposal.body}).returning({id:comments.id});
   await publishActivity(tx,{type:'feedback_comment',workspaceId:wid,feedbackId:fid,actorId:user.id,eventId:comment.id,commentId:comment.id});
  }
  await tx.update(mcpReplyProposals).set({status:choice==='approve'?'approved':'rejected',updatedAt:new Date()}).where(eq(mcpReplyProposals.id,pid));return {status:choice};
 });
});}

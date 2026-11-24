'use server';
import {randomBytes} from 'node:crypto';
import {and,asc,eq,inArray,isNull} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {changelogEntries,changelogFeedback,feedback,mcpDraftProposals} from '@/server/db/schema';
import {requireAppUser} from '@/server/auth';
import {requireWorkspaceRole} from '@/server/services/access';
import {consumeRateLimit} from '@/server/rate-limit';
import {slugifyChangelogTitle} from '@/lib/changelog';
import {runService,ServiceError} from '@/server/result';

export async function listMcpDraftProposalsAction(workspaceId:string){return runService(async()=>{
 const wid=z.uuid().parse(workspaceId),user=await requireAppUser(),db=getDb();await requireWorkspaceRole(db,{workspaceId:wid,userId:user.id,minimumRole:'admin'});
 const rows=await db.select({id:mcpDraftProposals.id,title:mcpDraftProposals.title,body:mcpDraftProposals.body,feedbackIds:mcpDraftProposals.feedbackIds}).from(mcpDraftProposals).where(and(eq(mcpDraftProposals.workspaceId,wid),eq(mcpDraftProposals.status,'pending'))).orderBy(asc(mcpDraftProposals.createdAt)).limit(50);
 const ids=[...new Set(rows.flatMap(row=>row.feedbackIds))];const posts=ids.length?await db.select({id:feedback.id,title:feedback.title}).from(feedback).where(and(eq(feedback.workspaceId,wid),inArray(feedback.id,ids),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId))):[];
 return rows.map(row=>({...row,requests:row.feedbackIds.map(id=>({id,title:posts.find(post=>post.id===id)?.title??'Request unavailable'}))}));
});}

export async function reviewMcpDraftProposalAction(workspaceId:string,proposalId:string,decision:'approve'|'reject'){return runService(async()=>{
 const wid=z.uuid().parse(workspaceId),pid=z.uuid().parse(proposalId),choice=z.enum(['approve','reject']).parse(decision),user=await requireAppUser(),db=getDb();
 await requireWorkspaceRole(db,{workspaceId:wid,userId:user.id,minimumRole:'admin'});await consumeRateLimit('mcp:review:'+wid+':'+user.id,60,3600);
 return db.transaction(async tx=>{
  const [proposal]=await tx.select().from(mcpDraftProposals).where(and(eq(mcpDraftProposals.workspaceId,wid),eq(mcpDraftProposals.id,pid))).for('update');
  if(!proposal||proposal.status!=='pending')throw new ServiceError('conflict','This proposal has already been reviewed or is unavailable.');
  if(choice==='reject'){await tx.update(mcpDraftProposals).set({status:'rejected',updatedAt:new Date()}).where(eq(mcpDraftProposals.id,pid));return {status:'rejected' as const};}
  const ids=z.array(z.uuid()).max(20).parse(proposal.feedbackIds);
  if(ids.length){const owned=await tx.select({id:feedback.id}).from(feedback).where(and(eq(feedback.workspaceId,wid),inArray(feedback.id,ids),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId)));if(owned.length!==ids.length)throw new ServiceError('conflict','A linked request is no longer available. Reject this proposal and ask the client to update it.');}
  const suffix='-'+randomBytes(6).toString('hex'),slug=slugifyChangelogTitle(proposal.title).slice(0,80-suffix.length).replace(/-+$/,'')+suffix;
  const [entry]=await tx.insert(changelogEntries).values({workspaceId:wid,title:proposal.title,body:proposal.body,slug,status:'draft',authorUserId:user.id}).returning({id:changelogEntries.id});
  if(ids.length)await tx.insert(changelogFeedback).values(ids.map(feedbackId=>({workspaceId:wid,changelogId:entry.id,feedbackId})));
  await tx.update(mcpDraftProposals).set({status:'approved',changelogId:entry.id,updatedAt:new Date()}).where(eq(mcpDraftProposals.id,pid));return {status:'approved' as const,entryId:entry.id};
 });
});}

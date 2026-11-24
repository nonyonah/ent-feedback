import 'server-only';
import {and,desc,eq,inArray,isNull,sql} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {comments,feedback,mcpDraftProposals,users,workspaceMembers,workspaces} from '@/server/db/schema';
import {requireWorkspaceRole} from '@/server/services/access';
import {consumeRateLimit} from '@/server/rate-limit';
import {displayedVotes} from '@/server/services/displayed-votes';

async function actor(clerkId:string){
 const [user]=await getDb().select({id:users.id}).from(users).where(eq(users.clerkUserId,clerkId)).limit(1);
 if(!user)throw Error('Account is not available.');return user.id;
}
async function authorize(clerkId:string,workspaceId:string,role:'member'|'admin'){
 const id=await actor(clerkId);await requireWorkspaceRole(getDb(),{workspaceId,userId:id,minimumRole:role});
 await consumeRateLimit('mcp:'+workspaceId+':'+id,120,3600);return id;
}
export async function mcpWorkspaces(clerkId:string){
 const id=await actor(clerkId);await consumeRateLimit('mcp:workspaces:'+id,120,3600);
 return getDb().select({id:workspaces.id,name:workspaces.name,handle:workspaces.handle,role:workspaceMembers.role}).from(workspaceMembers).innerJoin(workspaces,eq(workspaces.id,workspaceMembers.workspaceId)).where(and(eq(workspaceMembers.userId,id),eq(workspaceMembers.status,'active'))).limit(100);
}
export async function mcpFeedback(clerkId:string,workspaceId:string,query:string){
 await authorize(clerkId,workspaceId,'member');const term=query.trim().toLowerCase();
 return getDb().select({id:feedback.id,title:feedback.title,body:sql<string>`left(${feedback.body},3000)`,status:feedback.status,category:feedback.category,votes:displayedVotes}).from(feedback).where(and(eq(feedback.workspaceId,workspaceId),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId),term?sql`position(${term} in lower(${feedback.title} || ' ' || ${feedback.body}))>0`:undefined)).orderBy(desc(feedback.createdAt),desc(feedback.id)).limit(30);
}
export async function mcpFeedbackDetail(clerkId:string,workspaceId:string,feedbackId:string){
 await authorize(clerkId,workspaceId,'member');const db=getDb();
 const [post]=await db.select({id:feedback.id,title:feedback.title,body:sql<string>`left(${feedback.body},3000)`,status:feedback.status,category:feedback.category,votes:displayedVotes}).from(feedback).where(and(eq(feedback.id,feedbackId),eq(feedback.workspaceId,workspaceId),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId))).limit(1);
 if(!post)throw Error('Feedback is unavailable.');
 const replies=await db.select({id:comments.id,body:sql<string>`left(${comments.body},3000)`,createdAt:comments.createdAt}).from(comments).where(and(eq(comments.workspaceId,workspaceId),eq(comments.feedbackId,feedbackId),isNull(comments.deletedAt))).orderBy(desc(comments.createdAt),desc(comments.id)).limit(40);
 return {...post,comments:replies};
}
export async function mcpProposeChangelogDraft(clerkId:string,workspaceId:string,input:{title:string;body:string;feedbackIds:string[]}){
 const userId=await authorize(clerkId,workspaceId,'admin'),db=getDb(),ids=[...new Set(input.feedbackIds)];
 return db.transaction(async tx=>{
  if(ids.length){const rows=await tx.select({id:feedback.id}).from(feedback).where(and(eq(feedback.workspaceId,workspaceId),inArray(feedback.id,ids),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId)));if(rows.length!==ids.length)throw Error('Some requests are unavailable in this workspace.');}
  const [proposal]=await tx.insert(mcpDraftProposals).values({workspaceId,title:input.title,body:input.body,feedbackIds:ids,authorUserId:userId}).returning({id:mcpDraftProposals.id,status:mcpDraftProposals.status});
  return proposal;
 });
}

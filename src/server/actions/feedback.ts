"use server";

import {createHash,randomUUID} from 'node:crypto';
import {and,eq,isNull,sql,asc,inArray,or} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {feedback,comments,votes,reactions,users,workspaceMembers,statusHistory,attachments,follows,widgetSettings,tags,feedbackTags} from '@/server/db/schema';
import {requireAppUser} from '@/server/auth';
import {findActiveWorkspaceMembership,requireWorkspaceRole} from '@/server/services/access';
import {requireBoard,feedbackActor as actor} from '@/server/feedback-access';
import {linkAttachments} from '@/server/attachment-links';
import {publishActivity} from '@/server/activity';
import {consumeRateLimit} from '@/server/rate-limit';
import {runService,ServiceError} from '@/server/result';

const uuid=z.string().uuid();
const images=z.array(uuid).max(3,'Attach up to 3 images.').optional();
const command=z.discriminatedUnion('type',[
 z.object({type:z.literal('create'),requestId:uuid.optional(),category:z.enum(['feedback','bug','feature_request']).default('feedback'),title:z.string().trim().min(4).max(160),description:z.string().trim().min(1).max(3000),anonymous:z.boolean().optional(),channel:z.enum(['board','widget']).optional(),name:z.string().trim().max(80).optional(),email:z.string().trim().toLowerCase().max(254).refine(value=>!value||z.email().safeParse(value).success,'Enter a valid email address.').optional(),images}),
 z.object({type:z.literal('comment'),requestId:uuid.optional(),id:uuid,body:z.string().trim().max(3000),parentCommentId:uuid.optional(),images}),
 z.object({type:z.literal('vote'),id:uuid,active:z.boolean()}),
 z.object({type:z.literal('reaction'),id:uuid,commentId:uuid,active:z.boolean()}),
 z.object({type:z.literal('status'),id:uuid,status:z.enum(['open','planned','in-progress','shipped'])}),
 z.object({type:z.literal('category'),id:uuid,category:z.enum(['feedback','bug','feature_request'])}),
 z.object({type:z.literal('classification'),id:uuid,category:z.enum(['feedback','bug','feature_request']),tagIds:z.array(uuid).max(10).transform(ids=>[...new Set(ids)])}),
 z.object({type:z.literal('follow'),id:uuid,active:z.boolean()}),
 z.object({type:z.literal('merge'),id:uuid,targetId:uuid}),
 z.object({type:z.literal('delete'),id:uuid}),
]);
export type FeedbackCommand=z.input<typeof command>;

function requestRecordId(scope:string,requestId?:string){
 if(!requestId)return undefined;
 const hex=createHash('sha256').update(scope+':'+requestId).digest('hex').slice(0,32).split('');
 hex[12]='4';hex[16]=((parseInt(hex[16],16)&3)|8).toString(16);
 const value=hex.join('');return `${value.slice(0,8)}-${value.slice(8,12)}-${value.slice(12,16)}-${value.slice(16,20)}-${value.slice(20)}`;
}
function time(date:Date){const minutes=Math.max(0,Math.floor((Date.now()-date.getTime())/60000));return minutes<1?'Just now':minutes<60?`${minutes}m ago`:minutes<1440?`${Math.floor(minutes/60)}h ago`:`${Math.floor(minutes/1440)}d ago`;}
async function readBoard(workspaceId:string,boardId:string|undefined,who:Awaited<ReturnType<typeof actor>>,followedOnly=false){
 const db=getDb();
 const membership=who.user?await findActiveWorkspaceMembership(db,workspaceId,who.user.id):null;
 const voteActor=who.user?eq(votes.userId,who.user.id):eq(votes.guestActorId,who.guestId!);
 const reactionActor=who.user?eq(reactions.userId,who.user.id):eq(reactions.guestActorId,who.guestId!);
 const posts=await db.select({id:feedback.id,authorUserId:feedback.authorUserId,boardId:feedback.boardId,category:feedback.category,title:feedback.title,description:feedback.body,status:feedback.status,guestName:feedback.guestName,author:users.name,avatarUrl:users.avatarUrl,created:feedback.createdAt,
  votes:sql<number>`(select count(*)::int from ${votes} where ${votes.feedbackId}=${feedback.id})`,
  following:who.user?sql<boolean>`exists(select 1 from ${follows} where ${follows.feedbackId}=${feedback.id} and ${follows.userId}=${who.user.id})`:sql<boolean>`false`,
  voted:sql<boolean>`exists(select 1 from ${votes} where ${votes.feedbackId}=${feedback.id} and ${voteActor})`,
 }).from(feedback).leftJoin(users,eq(users.id,feedback.authorUserId)).where(and(eq(feedback.workspaceId,workspaceId),boardId?eq(feedback.boardId,boardId):undefined,followedOnly?sql`exists(select 1 from ${follows} where ${follows.feedbackId}=${feedback.id} and ${follows.userId}=${who.user!.id})`:undefined,isNull(feedback.deletedAt))).orderBy(asc(feedback.createdAt));
 const ids=posts.map(post=>post.id);
 const replies=ids.length?await db.select({id:comments.id,feedbackId:comments.feedbackId,body:comments.body,parentCommentId:comments.parentCommentId,guestName:comments.guestName,author:users.name,avatarUrl:users.avatarUrl,created:comments.createdAt,role:workspaceMembers.role,
  likes:sql<number>`(select count(*)::int from ${reactions} where ${reactions.commentId}=${comments.id})`,
  liked:sql<boolean>`exists(select 1 from ${reactions} where ${reactions.commentId}=${comments.id} and ${reactionActor})`,
 }).from(comments).leftJoin(users,eq(users.id,comments.authorUserId)).leftJoin(workspaceMembers,and(eq(workspaceMembers.userId,comments.authorUserId),eq(workspaceMembers.workspaceId,workspaceId),eq(workspaceMembers.status,'active'))).where(and(eq(comments.workspaceId,workspaceId),inArray(comments.feedbackId,ids),isNull(comments.deletedAt))).orderBy(asc(comments.createdAt)):[];
 const labels=ids.length?await db.select({feedbackId:feedbackTags.feedbackId,id:tags.id,name:tags.name}).from(feedbackTags).innerJoin(tags,and(eq(tags.id,feedbackTags.tagId),eq(tags.workspaceId,feedbackTags.workspaceId))).where(and(eq(feedbackTags.workspaceId,workspaceId),inArray(feedbackTags.feedbackId,ids))):[];
 const history=ids.length?await db.select({id:statusHistory.id,feedbackId:statusHistory.feedbackId,previousStatus:statusHistory.previousStatus,status:statusHistory.newStatus,author:users.name,created:statusHistory.createdAt}).from(statusHistory).leftJoin(users,eq(users.id,statusHistory.actorUserId)).where(and(eq(statusHistory.workspaceId,workspaceId),inArray(statusHistory.feedbackId,ids))).orderBy(asc(statusHistory.createdAt)):[];
 const replyIds=replies.map(reply=>reply.id);
 const files=ids.length?await db.select({id:attachments.id,feedbackId:attachments.feedbackId,commentId:attachments.commentId}).from(attachments).where(and(eq(attachments.workspaceId,workspaceId),eq(attachments.status,'attached'),or(inArray(attachments.feedbackId,ids),replyIds.length?inArray(attachments.commentId,replyIds):undefined))):[];
 return posts.map(post=>({id:post.id,canEditCategory:Boolean(who.user&&(who.user.id===post.authorUserId||membership?.role==='owner'||membership?.role==='admin')),boardId:post.boardId,category:post.category,tags:labels.filter(tag=>tag.feedbackId===post.id).map(({id,name})=>({id,name})),title:post.title,description:post.description,status:post.status,author:post.guestName??post.author??'Anonymous',avatarUrl:post.guestName?undefined:post.avatarUrl??undefined,initials:'',createdAt:time(post.created),createdOrder:post.created.getTime(),votes:post.votes,voted:post.voted,following:post.following,images:files.filter(file=>file.feedbackId===post.id).map(file=>'/api/attachments/'+file.id),statusHistory:history.filter(event=>event.feedbackId===post.id).map(event=>({id:event.id,author:event.author??'Team',previousStatus:event.previousStatus,status:event.status,time:time(event.created),createdOrder:event.created.getTime()})),comments:replies.filter(reply=>reply.feedbackId===post.id).map(reply=>({id:reply.id,parentCommentId:reply.parentCommentId??undefined,images:files.filter(file=>file.commentId===reply.id).map(file=>'/api/attachments/'+file.id),author:reply.guestName??reply.author??'Anonymous',avatarUrl:reply.guestName?undefined:reply.avatarUrl??undefined,initials:'',time:time(reply.created),createdOrder:reply.created.getTime(),body:reply.body,kind:(reply.role==='owner'||reply.role==='admin'?'owner':'user') as 'owner'|'user',likes:reply.likes,liked:reply.liked}))}));
}
export async function loadFeedbackAction(workspaceId:string,boardId:string,guestToken?:string){return runService(async()=>{
 const wid=uuid.parse(workspaceId),bid=uuid.parse(boardId);await requireBoard(wid,bid);const who=await actor(wid,guestToken,true);return {items:await readBoard(wid,bid,who),guestToken:who.token};
});}
export async function mutateFeedbackAction(workspaceId:string,boardId:string,input:FeedbackCommand,guestToken?:string,workspaceInbox=false){return runService(async()=>{
 const wid=uuid.parse(workspaceId),bid=uuid.parse(boardId);const value=command.parse(input);await requireBoard(wid,bid);const who=await actor(wid,guestToken);
 if(z.boolean().parse(workspaceInbox)){const user=await requireAppUser();await requireWorkspaceRole(getDb(),{workspaceId:wid,userId:user.id,minimumRole:'member'});}
 if(value.type==='classification'||value.type==='status'||value.type==='delete'||value.type==='merge'){const user=await requireAppUser();await requireWorkspaceRole(getDb(),{workspaceId:wid,userId:user.id,minimumRole:'admin'});}
 if(value.type==='merge')throw new ServiceError('validation','Merging feedback is not available yet.');
 if(value.type==='follow'&&!who.user)throw new ServiceError('unauthenticated','Sign in to follow posts across your devices.');
 if(value.type==='comment'&&!value.body&&!value.images?.length)throw new ServiceError('validation','Write a comment or attach an image.');
 await consumeRateLimit('feedback:'+wid+':'+(who.user?.id??who.guestId),60,60);
 let createdId:string|undefined;
 await getDb().transaction(async tx=>{
  if(value.type==='create'){
   if(value.channel==='widget'){
    const [setting]=await tx.select().from(widgetSettings).where(and(eq(widgetSettings.workspaceId,wid),isNull(widgetSettings.boardId))).limit(1);
    if(setting&&!setting.enabled)throw new ServiceError('forbidden','New feedback is paused.');
    if(setting?.details==='required'&&!who.user&&((setting.collectName&&!value.name)||(setting.collectEmail&&!value.email)))throw new ServiceError('validation','Enter the requested name and email to submit feedback.');
   }
   const recordId=requestRecordId(wid+':'+bid+':'+(who.user?.id??who.guestId)+':post',value.requestId);
   let [created]=await tx.insert(feedback).values({id:recordId,workspaceId:wid,boardId:bid,title:value.title,category:value.category,body:value.description,authorUserId:who.user?.id??null,guestName:who.user?(value.anonymous?'Anonymous':null):(value.name||'Anonymous'),guestEmail:who.user?null:(value.email||null)}).onConflictDoNothing().returning({id:feedback.id});
   const newRecord=Boolean(created);
   if(!created&&recordId){const [previous]=await tx.select().from(feedback).where(and(eq(feedback.id,recordId),eq(feedback.workspaceId,wid),eq(feedback.boardId,bid),isNull(feedback.deletedAt))).limit(1).for('update');if(!previous||previous.title!==value.title||previous.body!==value.description||previous.category!==value.category)throw new ServiceError('conflict','This submission changed. Edit the draft and try again.');created={id:previous.id};}
   if(!created)throw new ServiceError('conflict','Feedback could not be created. Try again.');
   await publishActivity(tx,{type:'new_feedback',workspaceId:wid,feedbackId:created.id,actorId:who.user?.id,eventId:created.id});
   if(who.user)await tx.insert(follows).values({workspaceId:wid,feedbackId:created.id,userId:who.user.id}).onConflictDoNothing();
   createdId=created.id;await linkAttachments(tx,wid,who,value.images,{feedbackId:created.id},newRecord);await tx.insert(votes).values({workspaceId:wid,feedbackId:created.id,userId:who.user?.id??null,guestActorId:who.guestId}).onConflictDoNothing();return;
  }
  // Lock the post so deletes/status changes and concurrent activity cannot interleave.
  const [post]=await tx.select().from(feedback).where(and(eq(feedback.id,value.id),eq(feedback.workspaceId,wid),eq(feedback.boardId,bid),isNull(feedback.deletedAt))).for('update');
  if(!post)throw new ServiceError('not_found','This feedback is no longer available. Refresh the board.');
  if(value.type==='category'){
   if(!who.user)throw new ServiceError('unauthenticated','Sign in to change your feedback type.');
   if(post.authorUserId!==who.user.id)await requireWorkspaceRole(getDb(),{workspaceId:wid,userId:who.user.id,minimumRole:'admin'});
   await tx.update(feedback).set({category:value.category,updatedAt:new Date()}).where(eq(feedback.id,post.id));
  }
  if(value.type==='comment'){
   if(value.parentCommentId){const [parent]=await tx.select().from(comments).where(and(eq(comments.id,value.parentCommentId),eq(comments.feedbackId,post.id),eq(comments.workspaceId,wid),isNull(comments.deletedAt))).limit(1);if(!parent)throw new ServiceError('not_found','The comment you are replying to is unavailable.');}
   const recordId=requestRecordId(wid+':'+post.id+':'+(who.user?.id??who.guestId)+':comment',value.requestId);
   const inserted=await tx.insert(comments).values({id:recordId,workspaceId:wid,feedbackId:post.id,authorUserId:who.user?.id??null,guestName:who.user?null:'Anonymous',parentCommentId:value.parentCommentId??null,body:value.body||'Image attachment'}).onConflictDoNothing().returning({id:comments.id});
   if(!inserted.length&&recordId){const [previous]=await tx.select().from(comments).where(and(eq(comments.id,recordId),eq(comments.feedbackId,post.id),eq(comments.workspaceId,wid),isNull(comments.deletedAt))).limit(1);if(!previous||previous.body!==(value.body||'Image attachment')||previous.parentCommentId!==(value.parentCommentId??null))throw new ServiceError('conflict','This comment changed. Edit the draft and try again.');}
   const commentId=inserted[0]?.id??recordId;if(commentId)await linkAttachments(tx,wid,who,value.images,{commentId},inserted.length>0);
   if(inserted.length&&commentId)await publishActivity(tx,{type:'feedback_comment',workspaceId:wid,feedbackId:post.id,actorId:who.user?.id,eventId:commentId,commentId,parentCommentId:value.parentCommentId});
  }
  if(value.type==='follow'&&who.user){
   if(value.active)await tx.insert(follows).values({workspaceId:wid,feedbackId:post.id,userId:who.user.id}).onConflictDoNothing();else await tx.delete(follows).where(and(eq(follows.feedbackId,post.id),eq(follows.userId,who.user.id)));
  }
  if(value.type==='vote'){
   const match=and(eq(votes.feedbackId,post.id),who.user?eq(votes.userId,who.user.id):eq(votes.guestActorId,who.guestId!));
   if(value.active){const inserted=await tx.insert(votes).values({workspaceId:wid,feedbackId:post.id,userId:who.user?.id??null,guestActorId:who.guestId}).onConflictDoNothing().returning({id:votes.id});if(inserted.length)await publishActivity(tx,{type:'feedback_reaction',workspaceId:wid,feedbackId:post.id,actorId:who.user?.id,eventId:inserted[0].id});}else await tx.delete(votes).where(match);
  }
  if(value.type==='reaction'){
   const [comment]=await tx.select({id:comments.id}).from(comments).where(and(eq(comments.id,value.commentId),eq(comments.feedbackId,post.id),eq(comments.workspaceId,wid),isNull(comments.deletedAt))).limit(1);
   if(!comment)throw new ServiceError('not_found','This comment is no longer available. Refresh the board.');
   if(value.active){const inserted=await tx.insert(reactions).values({workspaceId:wid,commentId:comment.id,userId:who.user?.id??null,guestActorId:who.guestId}).onConflictDoNothing().returning({id:reactions.id});if(inserted.length)await publishActivity(tx,{type:'comment_reaction',workspaceId:wid,feedbackId:post.id,actorId:who.user?.id,eventId:inserted[0].id,commentId:comment.id});}else await tx.delete(reactions).where(and(eq(reactions.commentId,comment.id),who.user?eq(reactions.userId,who.user.id):eq(reactions.guestActorId,who.guestId!)));
  }
  if(value.type==='status'&&post.status!==value.status){await tx.update(feedback).set({status:value.status,updatedAt:new Date()}).where(eq(feedback.id,post.id));await tx.insert(statusHistory).values({workspaceId:wid,feedbackId:post.id,actorUserId:who.user!.id,previousStatus:post.status,newStatus:value.status});await publishActivity(tx,{type:'status_changed',workspaceId:wid,feedbackId:post.id,actorId:who.user?.id,eventId:randomUUID()});}
  if(value.type==='classification'){
   const found=value.tagIds.length?await tx.select({id:tags.id}).from(tags).where(and(eq(tags.workspaceId,wid),inArray(tags.id,value.tagIds))):[];
   if(found.length!==value.tagIds.length)throw new ServiceError('validation','Choose tags from this workspace.');
   await tx.update(feedback).set({category:value.category,updatedAt:new Date()}).where(eq(feedback.id,post.id));
   await tx.delete(feedbackTags).where(and(eq(feedbackTags.workspaceId,wid),eq(feedbackTags.feedbackId,post.id)));
   if(value.tagIds.length)await tx.insert(feedbackTags).values(value.tagIds.map(tagId=>({workspaceId:wid,feedbackId:post.id,tagId})));
  }
  if(value.type==='delete')await tx.update(feedback).set({deletedAt:new Date(),updatedAt:new Date()}).where(eq(feedback.id,post.id));
 });
 return {items:await readBoard(wid,workspaceInbox?undefined:bid,who),createdId};
});}

export async function loadFollowingAction(workspaceId:string){return runService(async()=>{
 const wid=uuid.parse(workspaceId);await requireAppUser();const who=await actor(wid);return {items:await readBoard(wid,undefined,who,true)};
});}

export async function loadWorkspaceFeedbackAction(workspaceId:string){return runService(async()=>{
 const wid=uuid.parse(workspaceId),user=await requireAppUser();
 await requireWorkspaceRole(getDb(),{workspaceId:wid,userId:user.id,minimumRole:'member'});
 return {items:await readBoard(wid,undefined,await actor(wid)),guestToken:undefined};
});}
export async function loadTagsAction(workspaceId:string){return runService(async()=>{
 const wid=uuid.parse(workspaceId),user=await requireAppUser();
 await requireWorkspaceRole(getDb(),{workspaceId:wid,userId:user.id,minimumRole:'member'});
 return getDb().select({id:tags.id,name:tags.name}).from(tags).where(eq(tags.workspaceId,wid)).orderBy(asc(tags.name));
});}
export async function createTagAction(workspaceId:string,name:string){return runService(async()=>{
 const wid=uuid.parse(workspaceId),label=z.string().trim().min(1).max(32).parse(name),user=await requireAppUser();
 await requireWorkspaceRole(getDb(),{workspaceId:wid,userId:user.id,minimumRole:'admin'});
 await consumeRateLimit('tags:'+wid+':'+user.id,30,60);
 const [created]=await getDb().insert(tags).values({workspaceId:wid,name:label}).onConflictDoNothing().returning({id:tags.id,name:tags.name});
 if(created)return created;
 const [existing]=await getDb().select({id:tags.id,name:tags.name}).from(tags).where(and(eq(tags.workspaceId,wid),sql`lower(${tags.name}) = lower(${label})`));
 if(!existing)throw new ServiceError('conflict','This tag could not be created. Try again.');
 return existing;
});}

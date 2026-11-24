import 'server-only';
import {enqueueDiscord,enqueueLinearStatus,enqueueLinearCreate} from '@/server/connected-apps/queue';
import {guestEmailVerified} from '@/server/guest-email';
import {enqueueSlack} from '@/server/chat/notifications';
import {and,eq,inArray,isNull} from 'drizzle-orm';
import type {Database} from '@/server/db/client';
import {feedback,comments,follows,workspaceMembers,notifications,notificationPreferences,jobs,users,workspaces} from '@/server/db/schema';
import {getServerEnv} from '@/server/env';
type Tx=Parameters<Parameters<Database['transaction']>[0]>[0];
export type ActivityType='new_feedback'|'feedback_comment'|'comment_reply'|'comment_reaction'|'feedback_reaction'|'status_changed'|'type_changed';
const labels:Record<ActivityType,string>={new_feedback:'New feedback',feedback_comment:'New comment',comment_reply:'New reply',comment_reaction:'Comment liked',feedback_reaction:'Feedback upvoted',status_changed:'Status updated',type_changed:'Type updated'};
export function activityLabel(type:ActivityType){return labels[type];}
export function wantsActivity(p:typeof notificationPreferences.$inferSelect|undefined,type:ActivityType){
 if(!p)return true;
 return type==='new_feedback'?p.newFeedback:type==='feedback_comment'?p.feedbackComments:type==='comment_reply'?p.commentReplies:type==='comment_reaction'?p.commentReactions:type==='feedback_reaction'?p.feedbackReactions:type==='status_changed'?p.statusChanges:type==='type_changed'?p.typeChanges:true;
}
export async function publishActivity(tx:Tx,input:{type:ActivityType;workspaceId:string;feedbackId:string;actorId?:string;eventId:string;commentId?:string;parentCommentId?:string;skipSlack?:boolean;skipEmail?:boolean;systemUpdate?:boolean}){
 const [post]=await tx.select().from(feedback).where(and(eq(feedback.id,input.feedbackId),eq(feedback.workspaceId,input.workspaceId),isNull(feedback.deletedAt))).limit(1);if(!post)return;
 const [workspace]=await tx.select({handle:workspaces.handle,name:workspaces.name}).from(workspaces).where(eq(workspaces.id,input.workspaceId)).limit(1);if(!workspace)return;
 if(!input.skipSlack&&(input.type==='new_feedback'||input.type==='status_changed'||input.type==='type_changed'||input.type==='feedback_comment'))await enqueueSlack(tx,{workspaceId:input.workspaceId,feedbackId:input.feedbackId,event:input.type,eventId:input.eventId});
 if(['new_feedback','feedback_comment','status_changed','type_changed'].includes(input.type))await enqueueDiscord(tx,{workspaceId:input.workspaceId,feedbackId:input.feedbackId,event:input.type,eventId:input.eventId});
 if(input.type==='new_feedback')await enqueueLinearCreate(tx,{workspaceId:input.workspaceId,feedbackId:input.feedbackId});
 if(input.type==='status_changed'&&!input.systemUpdate)await enqueueLinearStatus(tx,{workspaceId:input.workspaceId,feedbackId:input.feedbackId,eventId:input.eventId});
 const update=input.type==='status_changed'||input.type==='type_changed';
 const title=input.type==='status_changed'?`${post.title} — Status: ${{open:'Open',planned:'Planned','in-progress':'In progress',shipped:'Completed'}[post.status]}`:input.type==='type_changed'?`${post.title} — Type: ${{feedback:'Feedback',bug:'Bug',feature_request:'Feature request',question:'Question'}[post.category]}`:post.title;
 // Guest updates go only to the address supplied on this submission.
 if(!post.authorUserId&&post.guestEmail){
  let eligible=Boolean(update&&(input.actorId||input.systemUpdate));
  if(input.type==='feedback_comment'&&input.commentId){const [reply]=await tx.select({author:comments.authorUserId}).from(comments).where(and(eq(comments.id,input.commentId),eq(comments.feedbackId,post.id),eq(comments.workspaceId,input.workspaceId),isNull(comments.deletedAt))).limit(1);eligible=Boolean(reply?.author);}
  if(!input.skipEmail&&eligible&&await guestEmailVerified({workspaceId:input.workspaceId,kind:'feedback',subjectId:post.id,email:post.guestEmail},tx))await tx.insert(jobs).values({type:'notification_email',dedupeKey:`guest:${input.type}:${input.eventId}:${post.id}`,payload:{guestFeedbackId:post.id,event:input.type,commentId:input.commentId,workspaceId:input.workspaceId,to:post.guestEmail,subject:`${labels[input.type]} · ${workspace.name}`,title,url:new URL(`/${encodeURIComponent(workspace.handle)}/items/${post.id}`,getServerEnv().NEXT_PUBLIC_APP_URL).href}}).onConflictDoNothing();
 }
 const recipients=new Map<string,ActivityType>();
 const followed=await tx.select({id:follows.userId}).from(follows).where(and(eq(follows.feedbackId,post.id),eq(follows.workspaceId,input.workspaceId)));
 if(['feedback_comment','status_changed','type_changed'].includes(input.type))for(const f of followed)recipients.set(f.id,input.type);
 if(input.type==='new_feedback'||input.type==='feedback_comment'){
  const owners=await tx.select({id:workspaceMembers.userId}).from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId,input.workspaceId),input.type==='new_feedback'?undefined:eq(workspaceMembers.role,'owner'),eq(workspaceMembers.status,'active')));for(const owner of owners)recipients.set(owner.id,input.type);
 }
 if((input.type==='feedback_comment'||update)&&post.authorUserId)recipients.set(post.authorUserId,input.type);
 if(input.type==='feedback_reaction'&&post.authorUserId)recipients.set(post.authorUserId,input.type);
 if(input.commentId&&(input.type==='comment_reaction'||input.type==='feedback_comment')){
  const target=input.type==='comment_reaction'?input.commentId:input.parentCommentId;
  if(target){const [comment]=await tx.select({author:comments.authorUserId}).from(comments).where(and(eq(comments.id,target),eq(comments.feedbackId,post.id),isNull(comments.deletedAt))).limit(1);if(comment?.author)recipients.set(comment.author,input.type==='comment_reaction'?'comment_reaction':'comment_reply');}
 }
 if(input.actorId)recipients.delete(input.actorId);if(!recipients.size)return;
 const ids=[...recipients.keys()];
 const [people,prefs]=await Promise.all([tx.select({id:users.id,email:users.email}).from(users).where(inArray(users.id,ids)),tx.select().from(notificationPreferences).where(inArray(notificationPreferences.userId,ids))]);
 for(const person of people){const type=recipients.get(person.id)!;if(!wantsActivity(prefs.find(p=>p.userId===person.id),type))continue;
  const [notice]=await tx.insert(notifications).values({recipientUserId:person.id,workspaceId:input.workspaceId,feedbackId:post.id,commentId:input.commentId??null,eventType:type,dedupeKey:`${type}:${input.eventId}:${person.id}`}).onConflictDoNothing().returning({id:notifications.id});
  if(!input.skipEmail&&notice&&person.email){const url=new URL(`/${encodeURIComponent(workspace.handle)}/items/${post.id}`,getServerEnv().NEXT_PUBLIC_APP_URL).href;await tx.insert(jobs).values({type:'notification_email',dedupeKey:'notification:'+notice.id,payload:{notificationId:notice.id,to:person.email,subject:`${labels[type]} · ${workspace.name}`,title,url,event:type}}).onConflictDoNothing();}
 }
}

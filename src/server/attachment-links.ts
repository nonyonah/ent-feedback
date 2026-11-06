import 'server-only';
import {and,eq,inArray,asc} from 'drizzle-orm';
import type {Database} from '@/server/db/client';
import type {FeedbackActor} from '@/server/feedback-access';
import {attachments} from '@/server/db/schema';
import {ServiceError} from '@/server/result';
type Tx=Parameters<Parameters<Database['transaction']>[0]>[0];
export async function linkAttachments(tx:Tx,workspaceId:string,actor:FeedbackActor,ids:string[]|undefined,target:{feedbackId:string}|{commentId:string},newRecord=true){
 const current=await tx.select({id:attachments.id}).from(attachments).where(and(eq(attachments.workspaceId,workspaceId),'feedbackId' in target?eq(attachments.feedbackId,target.feedbackId):eq(attachments.commentId,target.commentId),eq(attachments.status,'attached')));
 if(!newRecord&&(current.length!==(ids?.length??0)||current.some(row=>!ids?.includes(row.id))))throw new ServiceError('conflict','This submission was already saved with different attachments. Refresh to view it.');
 if(new Set([...current.map(row=>row.id),...(ids??[])]).size>3)throw new ServiceError('validation','Attach up to 3 images.');
 if(!ids?.length)return;
 if(new Set(ids).size!==ids.length)throw new ServiceError('validation','Choose each attachment once.');
 const rows=await tx.select().from(attachments).where(and(eq(attachments.workspaceId,workspaceId),inArray(attachments.id,ids))).orderBy(asc(attachments.id)).for('update');
 if(rows.length!==ids.length)throw new ServiceError('validation','An attachment is unavailable. Remove it and upload it again.');
 for(const row of rows){
  const own=actor.user?row.uploadedByUserId===actor.user.id:row.guestActorId===actor.guestId;
  const same='feedbackId' in target?row.feedbackId===target.feedbackId:row.commentId===target.commentId;
  if(!own||(row.status!=='pending'&&!same)||(row.status==='pending'&&(!row.expiresAt||row.expiresAt<new Date())))throw new ServiceError('forbidden','An attachment is unavailable. Remove it and upload it again.');
 }
 await tx.update(attachments).set({...target,status:'attached',attachedAt:new Date(),expiresAt:null,updatedAt:new Date()}).where(and(eq(attachments.workspaceId,workspaceId),inArray(attachments.id,ids)));
}

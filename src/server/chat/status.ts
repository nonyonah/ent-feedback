import 'server-only';
import {enqueueDiscord} from '@/server/connected-apps/queue';
import {and,eq} from 'drizzle-orm';
import type {Queryable} from '@/server/db/client';
import {conversations,jobs} from '@/server/db/schema';
import {requireWorkspaceRole} from '@/server/services/access';
import {ServiceError} from '@/server/result';
import {enqueueSlack} from './notifications';

export type ConversationStatus='open'|'escalated'|'resolved';
export function conversationStatusLabel(status:ConversationStatus){return status==='resolved'?'Resolved':status==='escalated'?'Queued':'In progress';}

/** Caller supplies a transaction. Lock, deduplication and delivery enqueue commit together. */
export async function setConversationStatus(tx:Queryable,input:{workspaceId:string;conversationId:string;userId:string;status:ConversationStatus;eventId:string;confirmInSlack?:boolean}){
 await requireWorkspaceRole(tx,{workspaceId:input.workspaceId,userId:input.userId,minimumRole:'member'});
 const where=and(eq(conversations.id,input.conversationId),eq(conversations.workspaceId,input.workspaceId));
 const [conversation]=await tx.select().from(conversations).where(where).for('update');
 if(!conversation)throw new ServiceError('not_found','Conversation not found.');
 const [applied]=await tx.insert(jobs).values({type:'chat_status_receipt',status:'succeeded',dedupeKey:'chat:status:applied:'+input.eventId,payload:{workspaceId:input.workspaceId,conversationId:input.conversationId,userId:input.userId,status:input.status}}).onConflictDoNothing().returning({id:jobs.id});
 if(!applied)return;
 if(conversation.status===input.status&&conversation.mode==='human'){
  if(input.confirmInSlack)await enqueueSlack(tx,{workspaceId:input.workspaceId,conversationId:input.conversationId,event:'status_changed',eventId:input.eventId,forceStatus:true});
  return;
 }
 await tx.update(conversations).set({status:input.status,mode:'human',generationId:null,generationExpiresAt:null,unread:input.status==='escalated',updatedAt:new Date()}).where(where);
 await enqueueSlack(tx,{workspaceId:input.workspaceId,conversationId:input.conversationId,event:'status_changed',eventId:input.eventId,forceStatus:input.confirmInSlack});
 await enqueueDiscord(tx,{workspaceId:input.workspaceId,conversationId:input.conversationId,event:'status_changed',eventId:input.eventId});
}

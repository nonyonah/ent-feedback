import 'server-only';
import {and,eq} from 'drizzle-orm';
import {z} from 'zod';
import type {Queryable} from '@/server/db/client';
import {chatMessages} from '@/server/db/schema';
import {ServiceError} from '@/server/result';
import {featureRequestSuggestion} from '@/lib/chat/feature-request';
import {enqueueSlack} from './notifications';

// Called inside the conversation lock and the feedback/link transaction.
export async function completeSuggestion(tx:Queryable,workspaceId:string,conversationId:string,feedbackId:string,messageId?:string){
 if(!messageId)return;z.uuid().parse(messageId);
 const where=and(eq(chatMessages.workspaceId,workspaceId),eq(chatMessages.conversationId,conversationId),eq(chatMessages.id,messageId));
 const [message]=await tx.select().from(chatMessages).where(where).limit(1);
 const suggestion:{title:string;description:string;feedbackId?:string}|null=message?.suggestion??(message?.role==='visitor'?featureRequestSuggestion(message.body):null);
 if(!suggestion)throw new ServiceError('not_found','This feature suggestion is no longer available.');
 if(suggestion.feedbackId&&suggestion.feedbackId!==feedbackId)throw new ServiceError('conflict','This suggestion has already been added to a board. Refresh the conversation.');
 await tx.update(chatMessages).set({suggestion:{title:suggestion.title,description:suggestion.description,feedbackId}}).where(where);
 await enqueueSlack(tx,{workspaceId,conversationId,feedbackId,event:'feature_linked',eventId:messageId});
}

import 'server-only';
import {after} from 'next/server';
import {completeSuggestion} from './suggestion-completion';
import {processChatJobs} from './notifications';
import {and,eq,isNull} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {feedback,conversationFeedback,conversations} from '@/server/db/schema';
import {authenticateConversation,requireChat,conversationWhere} from './service';
import {requireWorkspaceRole} from '@/server/services/access';
import {ServiceError} from '@/server/result';
// Linking an existing public request grants no modification or voting rights.
export async function linkVisibleFeedback(workspaceId:string,id:string,feedbackId:string,actor:{token:string}|{userId:string},messageId?:string){z.uuid().parse(feedbackId);z.uuid().parse(id);await getDb().transaction(async tx=>{await requireChat(workspaceId,tx);if("token" in actor)await authenticateConversation(tx,workspaceId,id,actor.token,true);else{await requireWorkspaceRole(tx,{workspaceId,userId:actor.userId,minimumRole:"member"});const [row]=await tx.select({id:conversations.id}).from(conversations).where(conversationWhere(workspaceId,id)).for('update');if(!row)throw new ServiceError('not_found','Conversation not found.');}const [post]=await tx.select({id:feedback.id}).from(feedback).where(and(eq(feedback.id,feedbackId),eq(feedback.workspaceId,workspaceId),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId))).limit(1);if(!post)throw new ServiceError('not_found','This feedback is no longer available.');await completeSuggestion(tx,workspaceId,id,feedbackId,messageId);await tx.insert(conversationFeedback).values({workspaceId,conversationId:id,feedbackId}).onConflictDoNothing();});after(async()=>{await processChatJobs(2,{workspaceId,conversationId:id});});return {linked:true};}

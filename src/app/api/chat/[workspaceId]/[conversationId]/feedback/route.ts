import {z} from 'zod';
import {runService,toResponse} from '@/server/result';
import {authenticateConversation} from '@/server/chat/service';
import {getDb} from '@/server/db/client';
import {linkVisibleFeedback} from '@/server/chat/links';
import {limitChatRequest,requestToken,readChatBody} from '@/server/chat/http';
export async function POST(request:Request,{params}:{params:Promise<{workspaceId:string;conversationId:string}>}){return toResponse(await runService(async()=>{const p=await params;await limitChatRequest(request);await authenticateConversation(getDb(),p.workspaceId,p.conversationId,requestToken(request));const {feedbackId,messageId}=z.object({feedbackId:z.uuid(),messageId:z.uuid().optional()}).strict().parse(await readChatBody(request));return linkVisibleFeedback(p.workspaceId,p.conversationId,feedbackId,{token:requestToken(request)},messageId);}));}
export async function GET(request:Request,{params}:{params:Promise<{workspaceId:string;conversationId:string}>}){return toResponse(await runService(async()=>{const p=await params;await limitChatRequest(request);const {similarRequests}=await import('@/server/chat/similar');return similarRequests(p.workspaceId,p.conversationId,new URL(request.url).searchParams.get('q')??'',{token:requestToken(request)});}));}

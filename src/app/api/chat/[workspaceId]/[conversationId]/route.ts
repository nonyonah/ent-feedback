import {after} from 'next/server';
import {processChatJobs} from '@/server/chat/notifications';
import {getDb} from '@/server/db/client';
import {runService,toResponse} from '@/server/result';
import {authenticateConversation,requireChat,snapshot,sendVisitor,updateContact} from '@/server/chat/service';
import {requestToken,limitChatRequest,readChatBody} from '@/server/chat/http';
export const maxDuration=60;
type Context={params:Promise<{workspaceId:string;conversationId:string}>};
export async function GET(request:Request,{params}:Context){return toResponse(await runService(async()=>{const p=await params;await requireChat(p.workspaceId);await limitChatRequest(request);await authenticateConversation(getDb(),p.workspaceId,p.conversationId,requestToken(request));return snapshot(p.workspaceId,p.conversationId,new URL(request.url).searchParams.get('cursor')??undefined,requestToken(request));}));}
export async function POST(request:Request,{params}:Context){return toResponse(await runService(async()=>{const p=await params;await limitChatRequest(request);const result=await sendVisitor(p.workspaceId,p.conversationId,requestToken(request),await readChatBody(request));after(async()=>{await processChatJobs(2);});return result;}));}
export async function PATCH(request:Request,{params}:Context){return toResponse(await runService(async()=>{const p=await params;await limitChatRequest(request);return updateContact(p.workspaceId,p.conversationId,requestToken(request),await readChatBody(request));}));}

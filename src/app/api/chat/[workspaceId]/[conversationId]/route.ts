import {after} from 'next/server';
import {processChatJobs} from '@/server/chat/notifications';
import {getDb} from '@/server/db/client';
import {runService,toResponse} from '@/server/result';
import {acknowledgeConversation,authenticateConversation,requireChat,snapshot,sendVisitor,updateContact,resendChatVerification} from '@/server/chat/service';
import {requestToken,limitChatRequest,readChatBody} from '@/server/chat/http';
import {resolveAnalyticsBoard,trackServerAnalytics} from '@/lib/analytics/server';
export const maxDuration=60;
type Context={params:Promise<{workspaceId:string;conversationId:string}>};
export async function GET(request:Request,{params}:Context){return toResponse(await runService(async()=>{const p=await params;await requireChat(p.workspaceId);await limitChatRequest(request);await authenticateConversation(getDb(),p.workspaceId,p.conversationId,requestToken(request));return snapshot(p.workspaceId,p.conversationId,new URL(request.url).searchParams.get('cursor')??undefined,requestToken(request));}));}
export async function POST(request:Request,{params}:Context){return toResponse(await runService(async()=>{const p=await params;await limitChatRequest(request);const token=requestToken(request),body=await readChatBody(request),boardId=await resolveAnalyticsBoard(p.workspaceId,new URL(request.url).searchParams.get('board'));const result=await sendVisitor(p.workspaceId,p.conversationId,token,body);after(async()=>{await processChatJobs(2,{workspaceId:p.workspaceId,conversationId:p.conversationId});if(body&&typeof body==='object'&&'escalate' in body&&body.escalate===true&&token)trackServerAnalytics('chat_escalated',{},{boardId,visitorId:token,defer:false});});return result;}));}
export async function PATCH(request:Request,{params}:Context){return toResponse(await runService(async()=>{const p=await params;await limitChatRequest(request);const body=await readChatBody(request);if(body&&typeof body==='object'&&'readSequence' in body){await acknowledgeConversation(p.workspaceId,p.conversationId,(body as {readSequence:number}).readSequence,'visitor',requestToken(request));return {saved:true};}if(body&&typeof body==='object'&&'resendVerification' in body)return resendChatVerification(p.workspaceId,p.conversationId,requestToken(request));return updateContact(p.workspaceId,p.conversationId,requestToken(request),body);}));}

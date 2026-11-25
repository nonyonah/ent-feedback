import {after} from 'next/server';
import {refreshSlackPresence} from '@/server/chat/presence';
import {runService,toResponse} from '@/server/result';
import {availableOperators,startConversation,chatAvailable,chatAvailability,chatPresentation,requireChat} from '@/server/chat/service';
import {consumeRateLimit} from '@/server/rate-limit';
import {z} from 'zod';
import {limitChatRequest} from '@/server/chat/http';
import {resolveAnalyticsBoard,trackServerAnalytics} from '@/lib/analytics/server';
export const maxDuration=30;
export async function GET(request:Request,{params}:{params:Promise<{workspaceId:string}>}){return toResponse(await runService(async()=>{await limitChatRequest(request);const {workspaceId}=await params;z.uuid().parse(workspaceId);const enabled=await chatAvailable(workspaceId);if(enabled)after(async()=>{await refreshSlackPresence(workspaceId);});const operators=enabled?await availableOperators(workspaceId):[];return {enabled,...(enabled?{presentation:await chatPresentation(workspaceId),availability:await chatAvailability(workspaceId,undefined,operators.length),operators}:{})};}));}
export async function POST(request:Request,{params}:{params:Promise<{workspaceId:string}>}){return toResponse(await runService(async()=>{const {workspaceId}=await params;await requireChat(workspaceId);await limitChatRequest(request);await consumeRateLimit('chat:start:'+workspaceId,100,3600);const boardId=await resolveAnalyticsBoard(workspaceId,new URL(request.url).searchParams.get('board'));const result=await startConversation(workspaceId);if(request.headers.get('x-ent-widget')!=='1')trackServerAnalytics('chat_started',{},{boardId});return result;}));}

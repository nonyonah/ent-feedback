import {after} from 'next/server';
import {refreshSlackPresence} from '@/server/chat/presence';
import {runService,toResponse} from '@/server/result';
import {availableOperators,startConversation,chatAvailable,chatAvailability,chatPresentation,requireChat} from '@/server/chat/service';
import {consumeRateLimit} from '@/server/rate-limit';
import {z} from 'zod';
import {limitChatRequest} from '@/server/chat/http';
export const maxDuration=30;
export async function GET(request:Request,{params}:{params:Promise<{workspaceId:string}>}){return toResponse(await runService(async()=>{await limitChatRequest(request);const {workspaceId}=await params;z.uuid().parse(workspaceId);const enabled=await chatAvailable(workspaceId);if(enabled)after(async()=>{await refreshSlackPresence(workspaceId);});const operators=enabled?await availableOperators(workspaceId):[];return {enabled,...(enabled?{presentation:await chatPresentation(workspaceId),availability:await chatAvailability(workspaceId,undefined,operators.length),operators}:{})};}));}
export async function POST(request:Request,{params}:{params:Promise<{workspaceId:string}>}){return toResponse(await runService(async()=>{const {workspaceId}=await params;await requireChat(workspaceId);await limitChatRequest(request);await consumeRateLimit('chat:start:'+workspaceId,100,3600);return startConversation(workspaceId);}));}

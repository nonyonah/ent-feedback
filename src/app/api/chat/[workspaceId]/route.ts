import {runService,toResponse} from '@/server/result';
import {availableOperators,startConversation,chatAvailable,chatAvailability,requireChat} from '@/server/chat/service';
import {consumeRateLimit} from '@/server/rate-limit';
import {z} from 'zod';
import {limitChatRequest} from '@/server/chat/http';
export const maxDuration=30;
export async function GET(_:Request,{params}:{params:Promise<{workspaceId:string}>}){return toResponse(await runService(async()=>{const {workspaceId}=await params;z.uuid().parse(workspaceId);const enabled=await chatAvailable(workspaceId);return {enabled,...(enabled?{availability:await chatAvailability(workspaceId),operators:await availableOperators(workspaceId)}:{})};}));}
export async function POST(request:Request,{params}:{params:Promise<{workspaceId:string}>}){return toResponse(await runService(async()=>{const {workspaceId}=await params;await requireChat(workspaceId);await limitChatRequest(request);await consumeRateLimit('chat:start:'+workspaceId,100,3600);return startConversation(workspaceId);}));}

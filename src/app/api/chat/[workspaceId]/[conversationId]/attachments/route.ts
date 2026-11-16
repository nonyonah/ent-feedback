import {consumeRateLimit} from '@/server/rate-limit';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {requireAppUser} from '@/server/auth';
import {requireWorkspaceRole} from '@/server/services/access';
import {authenticateConversation,requireChat} from '@/server/chat/service';
import {requestToken,limitChatRequest} from '@/server/chat/http';
import {storeChatImage} from '@/server/chat/uploads';
import {runService,toResponse,ServiceError} from '@/server/result';
export async function POST(request:Request,{params}:{params:Promise<{workspaceId:string;conversationId:string}>}){return toResponse(await runService(async()=>{
 const {workspaceId,conversationId}=await params;z.uuid().parse(workspaceId);z.uuid().parse(conversationId);await requireChat(workspaceId);await limitChatRequest(request);
 let userId:string|undefined;const token=requestToken(request);
 if(token)await authenticateConversation(getDb(),workspaceId,conversationId,token);
 else{const origin=request.headers.get('origin');if(!origin||new URL(origin).host!==request.headers.get('host'))throw new ServiceError('forbidden','Upload from Ent.');const user=await requireAppUser();await requireWorkspaceRole(getDb(),{workspaceId,userId:user.id,minimumRole:'member'});await authenticateTeamConversation(workspaceId,conversationId);userId=user.id;}
 await consumeRateLimit('chat:upload:'+conversationId,12,60);await consumeRateLimit('chat:upload:workspace:'+workspaceId,120,3600);
 const reader=request.body?.getReader();if(!reader)throw new ServiceError('validation','Choose an image.');let size=0;const chunks:Uint8Array[]=[];try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>2097152){await reader.cancel();throw new ServiceError('validation','Choose an image under 2 MB.');}chunks.push(value);}}finally{reader.releaseLock();}
 return {id:await storeChatImage(workspaceId,conversationId,Buffer.concat(chunks),userId)};
}));}
async function authenticateTeamConversation(workspaceId:string,id:string){const {conversations}=await import('@/server/db/schema');const {and,eq}=await import('drizzle-orm');const [row]=await getDb().select({id:conversations.id}).from(conversations).where(and(eq(conversations.workspaceId,workspaceId),eq(conversations.id,id))).limit(1);if(!row)throw new ServiceError('not_found','Conversation not found.');}

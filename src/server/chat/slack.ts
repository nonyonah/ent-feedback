import 'server-only';
import {setConversationStatus} from './status';
import {emojify} from 'node-emoji';
import {createHash,createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {and,eq,isNull} from 'drizzle-orm';
import {z} from 'zod';
import {getDb,type Queryable} from '@/server/db/client';
import {slackThreads,integrationConnections,users,workspaceMembers,chatMessages,conversations,comments,feedback,attachments,jobs} from '@/server/db/schema';
import {requireWorkspaceRole} from '@/server/services/access';
import {getServerEnv} from '@/server/env';
import {secretSchema} from '@/server/integrations';
import {unseal} from '@/server/integration-crypto';
import {storeChatImage,linkChatImages} from './uploads';
import {sanitizeImage} from '@/server/image-validation';
import {putImage,deleteImage} from '@/server/storage';
import {publishActivity} from '@/server/activity';
import {enqueueConversationNotice} from './notifications';
export async function slackApi(token:string,method:string,body:Record<string,unknown>){const response=await fetch('https://slack.com/api/'+method,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(8000)});const result=await response.json();if(!response.ok||!result.ok)throw Error('Slack request could not be confirmed');return result;}
export function validSlackSignature(raw:string,timestamp:string,signature:string,secret:string,now=Date.now()){if(!/^\d+$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300||!/^v0=[a-f0-9]{64}$/.test(signature))return false;const expected='v0='+createHmac('sha256',secret).update('v0:'+timestamp+':'+raw).digest('hex');return timingSafeEqual(Buffer.from(expected),Buffer.from(signature));}
export function slackRequestId(eventId:string){const hex=createHash('sha256').update('slack:'+eventId).digest('hex');return hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-a'+hex.slice(17,20)+'-'+hex.slice(20,32);}
const fileSchema=z.object({id:z.string(),url_private_download:z.url().optional(),url_private:z.url().optional(),size:z.number().max(2097152),mimetype:z.enum(['image/png','image/jpeg','image/gif','image/webp'])});
export const slackEventSchema=z.object({type:z.literal('event_callback'),team_id:z.string(),event_id:z.string(),event:z.object({type:z.literal('message'),channel:z.string(),user:z.string().optional(),bot_id:z.string().optional(),subtype:z.string().optional(),text:z.string().max(12000).default(''),thread_ts:z.string().optional(),ts:z.string(),files:z.array(fileSchema).max(3).optional()})});
async function slackImage(file:z.infer<typeof fileSchema>,token:string){const url=new URL(file.url_private_download??file.url_private??'https://invalid.local');if(url.protocol!=='https:'||url.hostname!=='files.slack.com')throw Error('Invalid Slack image source');const response=await fetch(url,{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(8000),cache:'no-store'});if(!response.ok)throw Error('Slack image unavailable');const reader=response.body?.getReader();if(!reader)throw Error('Slack image unavailable');let size=0;const chunks:Uint8Array[]=[];try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>2097152){await reader.cancel();throw Error('Slack image exceeds limit');}chunks.push(part.value);}}finally{reader.releaseLock();}return Buffer.concat(chunks);}
export async function receiveSlackEvent(input:unknown){
 const p=slackEventSchema.parse(input),event=p.event;if(!event.thread_ts||event.bot_id||!event.user||event.subtype&&event.subtype!=='file_share')return;
 const db=getDb();const mappings=await db.select({thread:slackThreads,connection:integrationConnections}).from(slackThreads).innerJoin(integrationConnections,eq(integrationConnections.id,slackThreads.connectionId)).where(and(eq(slackThreads.channel,event.channel),eq(slackThreads.threadTs,event.thread_ts),eq(integrationConnections.provider,'slack'),eq(integrationConnections.authorizationState,'connected')));
 const key=getServerEnv().INTEGRATION_ENCRYPTION_KEY;if(!key)return;
 for(const {thread,connection} of mappings){if(!connection.encryptedSecretRef||!connection.allowedChannels.includes(event.channel))continue;const secret=secretSchema.parse(unseal(connection.encryptedSecretRef,key,thread.workspaceId+':slack'));if(secret.teamId!==p.team_id)continue;
  const profile=await slackApi(secret.accessToken,'users.info',{user:event.user});if(profile.user?.is_bot||profile.user?.deleted||profile.user?.is_restricted||profile.user?.is_ultra_restricted)return;const email=profile.user?.profile?.email?.toLowerCase();if(!email)return;
  const [member]=await db.select({id:users.id}).from(workspaceMembers).innerJoin(users,eq(users.id,workspaceMembers.userId)).where(and(eq(workspaceMembers.workspaceId,thread.workspaceId),eq(workspaceMembers.status,'active'),eq(users.email,email))).limit(1);if(!member)return;
  const requestId=slackRequestId(p.event_id);const [done]=thread.conversationId?await db.select({id:chatMessages.id}).from(chatMessages).where(and(eq(chatMessages.conversationId,thread.conversationId),eq(chatMessages.requestId,requestId),eq(chatMessages.role,'team'))).limit(1):await db.select({id:comments.id}).from(comments).where(eq(comments.id,requestId)).limit(1);if(done)return;
  // Slack's native Unicode emoji are preserved. Links become plain URLs, never executable markup.
  const body=emojify(event.text).replace(/<([^>|]+)\|([^>]+)>/g,'$2 ($1)').replace(/<(https?:\/\/[^>]+)>/g,'$1').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').trim().slice(0,3000)||'Image attachment';
  const files=await Promise.all((event.files??[]).map(f=>slackImage(f,secret.accessToken)));
  if(thread.conversationId){const conversationId=thread.conversationId;const ids:string[]=[];for(const bytes of files)ids.push(await storeChatImage(thread.workspaceId,conversationId,bytes,member.id));await db.transaction(async tx=>{
   const [active]=await tx.select().from(integrationConnections).where(and(eq(integrationConnections.id,connection.id),eq(integrationConnections.authorizationState,'connected'))).for('update');if(!active||active.updatedAt.getTime()!==connection.updatedAt.getTime())return;
   await requireWorkspaceRole(tx,{workspaceId:thread.workspaceId,userId:member.id,minimumRole:'member'});
   await tx.select().from(conversations).where(and(eq(conversations.id,conversationId),eq(conversations.workspaceId,thread.workspaceId))).for('update');
   const [inserted]=await tx.insert(chatMessages).values({workspaceId:thread.workspaceId,conversationId,role:'team',authorUserId:member.id,body,requestId}).onConflictDoNothing().returning({id:chatMessages.id});if(!inserted)return;
   await linkChatImages(tx,thread.workspaceId,conversationId,requestId,ids,member.id);
   await tx.update(conversations).set({mode:'human',status:'open',generationId:null,generationExpiresAt:null,preview:body.slice(0,140),lastActivityAt:new Date(),updatedAt:new Date(),unread:false}).where(and(eq(conversations.id,conversationId),eq(conversations.workspaceId,thread.workspaceId)));
   await enqueueConversationNotice(tx,thread.workspaceId,conversationId,'reply',requestId,true);
  });}else if(thread.feedbackId){const feedbackId=thread.feedbackId;const staged:{id:string;key:string;size:number}[]=[];try{for(const bytes of files){const image=await sanitizeImage(bytes);const id=randomUUID(),key=`feedback/${thread.workspaceId}/${id}.webp`;await putImage(key,image.bytes);staged.push({id,key,size:image.bytes.length});}await db.transaction(async tx=>{
   const [active]=await tx.select().from(integrationConnections).where(and(eq(integrationConnections.id,connection.id),eq(integrationConnections.authorizationState,'connected'))).for('update');if(!active||active.updatedAt.getTime()!==connection.updatedAt.getTime())throw Error('Slack connection changed');
   await requireWorkspaceRole(tx,{workspaceId:thread.workspaceId,userId:member.id,minimumRole:'member'});
   const [post]=await tx.select().from(feedback).where(and(eq(feedback.id,feedbackId),eq(feedback.workspaceId,thread.workspaceId),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId))).for('update');if(!post)throw Error('Feedback no longer available');
   const [inserted]=await tx.insert(comments).values({id:requestId,workspaceId:thread.workspaceId,feedbackId,authorUserId:member.id,body}).onConflictDoNothing().returning({id:comments.id});if(!inserted)throw Error('Reply already imported');
   for(const file of staged)await tx.insert(attachments).values({id:file.id,workspaceId:thread.workspaceId,commentId:requestId,uploadedByUserId:member.id,storageKey:file.key,mimeType:'image/webp',byteSize:file.size,status:'attached',attachedAt:new Date()});
   await publishActivity(tx,{type:'feedback_comment',workspaceId:thread.workspaceId,feedbackId,actorId:member.id,eventId:requestId,commentId:requestId,skipSlack:true});
  });}catch(error){for(const file of staged)await deleteImage(file.key).catch(()=>{});throw error;}}
 }
}
export async function queueSlackEvent(tx:Queryable,payload:unknown,eventId:string){await tx.insert(jobs).values({type:'chat_delivery',dedupeKey:'slack:inbound:'+eventId,payload:{delivery:'slack_inbound',input:payload}}).onConflictDoNothing();}

// Button values identify a conversation, never an arbitrary workspace or destination URL.
export const slackActionSchema=z.object({
 type:z.literal('block_actions'),team:z.object({id:z.string().min(1).max(100)}),user:z.object({id:z.string().min(1).max(100)}),
 container:z.object({type:z.literal('message'),channel_id:z.string().min(1).max(100),message_ts:z.string().regex(/^\d+\.\d+$/)}),
 message:z.object({thread_ts:z.string().regex(/^\d+\.\d+$/).optional()}).optional(),
 actions:z.array(z.object({action_id:z.enum(['ent_chat_status_open','ent_chat_status_escalated','ent_chat_status_resolved']),value:z.uuid(),action_ts:z.string().regex(/^\d+\.\d+$/)})).length(1),
});
export async function queueSlackAction(tx:Queryable,input:z.infer<typeof slackActionSchema>){
 const action=input.actions[0];const eventId=slackRequestId([input.team.id,input.user.id,input.container.channel_id,input.container.message_ts,action.action_id,action.action_ts].join(':'));
 await tx.insert(jobs).values({type:'chat_delivery',dedupeKey:'slack:action:'+eventId,payload:{delivery:'slack_action',input,eventId}}).onConflictDoNothing();
}
export async function receiveSlackAction(input:unknown,eventId:string){
 const p=slackActionSchema.parse(input),action=p.actions[0],db=getDb();const key=getServerEnv().INTEGRATION_ENCRYPTION_KEY;if(!key)return;
 const mappings=await db.select({thread:slackThreads,connection:integrationConnections}).from(slackThreads).innerJoin(integrationConnections,eq(integrationConnections.id,slackThreads.connectionId)).where(and(eq(slackThreads.conversationId,action.value),eq(slackThreads.channel,p.container.channel_id),eq(integrationConnections.provider,'slack'),eq(integrationConnections.authorizationState,'connected')));
 for(const {thread,connection} of mappings){
  if(!connection.encryptedSecretRef||!connection.allowedChannels.includes(thread.channel)||!(p.container.message_ts===thread.threadTs||p.message?.thread_ts===thread.threadTs))continue;
  const secret=secretSchema.parse(unseal(connection.encryptedSecretRef,key,thread.workspaceId+':slack'));if(secret.teamId!==p.team.id)continue;
  const profile=await slackApi(secret.accessToken,'users.info',{user:p.user.id});
  if(profile.user?.is_bot||profile.user?.deleted||profile.user?.is_restricted||profile.user?.is_ultra_restricted)return;
  const email=profile.user?.profile?.email?.toLowerCase();if(!email)return;
  const [member]=await db.select({id:users.id}).from(workspaceMembers).innerJoin(users,eq(users.id,workspaceMembers.userId)).where(and(eq(workspaceMembers.workspaceId,thread.workspaceId),eq(workspaceMembers.status,'active'),eq(users.email,email))).limit(1);
  if(!member){await slackApi(secret.accessToken,'chat.postEphemeral',{channel:thread.channel,user:p.user.id,thread_ts:thread.threadTs,text:'Only active members of this Ent workspace can change conversation status.'});return;}
  const status=action.action_id==='ent_chat_status_resolved'?'resolved':action.action_id==='ent_chat_status_escalated'?'escalated':'open';
  await db.transaction(async tx=>{
   const [active]=await tx.select().from(integrationConnections).where(and(eq(integrationConnections.id,connection.id),eq(integrationConnections.authorizationState,'connected'))).for('update');
   if(!active||active.updatedAt.getTime()!==connection.updatedAt.getTime())return;
   await setConversationStatus(tx,{workspaceId:thread.workspaceId,conversationId:action.value,userId:member.id,status,eventId,confirmInSlack:true});
  });
 }
}

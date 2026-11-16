import 'server-only';
import {linkChatImages,chatImageUrl} from './uploads';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {and,eq,asc,desc,gt,isNull,inArray} from 'drizzle-orm';
import {z} from 'zod';
import {getDb,type Queryable} from '@/server/db/client';
import {chatSettings,conversations,chatMessages,conversationFeedback,feedback,chatUploads,workspaceMembers,users} from '@/server/db/schema';
import {getServerEnv} from '@/server/env';
import {ServiceError} from '@/server/result';
import {consumeRateLimit} from '@/server/rate-limit';
import {enqueueConversationNotice} from './notifications';
import {answerChat} from './ai';
import {conversationTopics} from '@/lib/chat/topics';
import {operationsSchema,teamAvailable} from '@/lib/chat/availability';
import {CHAT_AI_REPLIES_ENABLED,sendSchema,HANDOFF,type ChatSnapshot} from '@/lib/chat/contracts';
export const hashToken=(token:string)=>createHash('sha256').update(token).digest('hex');
export const conversationWhere=(workspaceId:string,id:string)=>and(eq(conversations.workspaceId,workspaceId),eq(conversations.id,id));
export async function chatAvailable(workspaceId:string,db:Queryable=getDb()){
 if(getServerEnv().CHAT_ENABLED!=='true')return false;
 const [settings]=await db.select({enabled:chatSettings.enabled}).from(chatSettings).where(eq(chatSettings.workspaceId,workspaceId)).limit(1);return Boolean(settings?.enabled);
}
export async function chatAvailability(workspaceId:string,db:Queryable=getDb()){
 const [settings]=await db.select({operations:chatSettings.operations}).from(chatSettings).where(eq(chatSettings.workspaceId,workspaceId)).limit(1);const operations=operationsSchema.parse(settings?.operations??{});const available=teamAvailable(operations);return {available,message:available?'Team is within working hours':operations.awayMessage};
}
export async function requireChat(workspaceId:string,db:Queryable=getDb()){z.uuid().parse(workspaceId);if(!await chatAvailable(workspaceId,db))throw new ServiceError('not_found','Chat is not available for this workspace.');}
export async function authenticateConversation(db:Queryable,workspaceId:string,id:string,token:string,lock=false){
 z.uuid().parse(id);z.uuid().parse(workspaceId);if(!/^[a-f0-9]{64}$/.test(token))throw new ServiceError('unauthenticated','Start a new conversation to reconnect.');
 const query=db.select().from(conversations).where(and(conversationWhere(workspaceId,id),eq(conversations.tokenHash,hashToken(token)))).limit(1);const [row]=await (lock?query.for('update'):query);if(!row)throw new ServiceError('not_found','This conversation is not available.');return row;
}
export async function startConversation(workspaceId:string){await requireChat(workspaceId);const token=randomBytes(32).toString('hex');const [row]=await getDb().insert(conversations).values({workspaceId,tokenHash:hashToken(token),mode:CHAT_AI_REPLIES_ENABLED?'ai':'human'}).returning({id:conversations.id});return {id:row.id,token};}
export async function snapshot(workspaceId:string,id:string,cursor?:string,token?:string):Promise<ChatSnapshot>{
 const db=getDb();let row=token?await authenticateConversation(db,workspaceId,id,token):(await db.select().from(conversations).where(conversationWhere(workspaceId,id)).limit(1))[0];if(!row)throw new ServiceError('not_found','Conversation not found.');
 if(!CHAT_AI_REPLIES_ENABLED&&row.mode==='ai'){await db.update(conversations).set({mode:'human',generationId:null,generationExpiresAt:null}).where(conversationWhere(workspaceId,id));row={...row,mode:'human',generationId:null,generationExpiresAt:null};}
 if(row.mode==='ai'&&row.generationId&&row.generationExpiresAt&&row.generationExpiresAt<new Date()){await db.transaction(async tx=>{const [locked]=await tx.select().from(conversations).where(conversationWhere(workspaceId,id)).for('update');if(!locked||locked.mode!=='ai'||!locked.generationId||!locked.generationExpiresAt||locked.generationExpiresAt>=new Date())return;const [pending]=await tx.select({requestId:chatMessages.requestId}).from(chatMessages).where(and(eq(chatMessages.workspaceId,workspaceId),eq(chatMessages.conversationId,id),eq(chatMessages.role,'visitor'))).orderBy(desc(chatMessages.sequence)).limit(1);if(pending)await handoff(tx,workspaceId,id,pending.requestId);});[row]=await db.select().from(conversations).where(conversationWhere(workspaceId,id)).limit(1);}
 let after:ReturnType<typeof gt>|undefined;
 if(cursor){const seq=z.coerce.number().int().min(1).max(Number.MAX_SAFE_INTEGER).parse(cursor);after=gt(chatMessages.sequence,seq);}
 const messages=await db.select({sequence:chatMessages.sequence,id:chatMessages.id,role:chatMessages.role,body:chatMessages.body,createdAt:chatMessages.createdAt,sourceIds:chatMessages.sourceIds,authorUserId:chatMessages.authorUserId,requestId:chatMessages.requestId,suggestion:chatMessages.suggestion}).from(chatMessages).where(and(eq(chatMessages.workspaceId,workspaceId),eq(chatMessages.conversationId,id),after)).orderBy(asc(chatMessages.sequence)).limit(51);
 const uploads=messages.length?await db.select().from(chatUploads).where(and(eq(chatUploads.workspaceId,workspaceId),eq(chatUploads.conversationId,id),inArray(chatUploads.requestId,messages.map(m=>m.requestId)))):[];
 const hasMore=messages.length>50;const page=messages.slice(0,50);const last=page.at(-1);
 const links=await db.select({feedbackId:feedback.id,title:feedback.title}).from(conversationFeedback).innerJoin(feedback,and(eq(feedback.id,conversationFeedback.feedbackId),eq(feedback.workspaceId,conversationFeedback.workspaceId))).where(and(eq(conversationFeedback.workspaceId,workspaceId),eq(conversationFeedback.conversationId,id),isNull(feedback.deletedAt)));
 return {id,status:row.status,mode:row.mode,topicIds:row.topicIds,availability:await chatAvailability(workspaceId),hasEmail:Boolean(row.email),messages:page.map(({requestId,authorUserId,...m})=>({...m,images:uploads.filter(image=>image.requestId===requestId&&image.uploaderUserId===(m.role==='visitor'?null:authorUserId)).map(image=>chatImageUrl(image.id)),createdAt:m.createdAt.toISOString()})),cursor:last?String(last.sequence):cursor??null,hasMore,generating:Boolean(row.generationId&&row.generationExpiresAt&&row.generationExpiresAt>new Date()),links};
}
export const queueChatNotice=enqueueConversationNotice;

async function handoff(tx:Queryable,workspaceId:string,id:string,requestId:string,suggestion?:{title:string;description:string}|null){
 await tx.update(conversations).set({mode:'human',status:'escalated',generationId:null,generationExpiresAt:null,unread:true,updatedAt:new Date()}).where(conversationWhere(workspaceId,id));
 await tx.insert(chatMessages).values({workspaceId,conversationId:id,requestId,role:'assistant',body:HANDOFF,suggestion:suggestion??null}).onConflictDoNothing();
 await queueChatNotice(tx,workspaceId,id,'escalation',requestId);
}
export async function sendVisitor(workspaceId:string,id:string,token:string,input:unknown){
 const value=sendSchema.parse(input);await requireChat(workspaceId);await authenticateConversation(getDb(),workspaceId,id,token);
 await consumeRateLimit(`chat:conversation:${id}`,20,60);await consumeRateLimit(`chat:workspace:${workspaceId}`,200,3600);await consumeRateLimit('chat:global-model',2000,3600);
 const lease=randomUUID();
 const decision=await getDb().transaction(async tx=>{
  await requireChat(workspaceId,tx);const row=await authenticateConversation(tx,workspaceId,id,token,true);
  const [previous]=await tx.select().from(chatMessages).where(and(eq(chatMessages.conversationId,id),eq(chatMessages.requestId,value.requestId),eq(chatMessages.role,'visitor'))).limit(1);
  if(previous){await linkChatImages(tx,workspaceId,id,value.requestId,value.images,undefined,true);if(previous.body!==value.body)throw new ServiceError('conflict','This message changed. Send it as a new message.');if(row.generationId&&row.generationExpiresAt&&row.generationExpiresAt<new Date())await handoff(tx,workspaceId,id,value.requestId);return false;}
  if(!CHAT_AI_REPLIES_ENABLED){
   await linkChatImages(tx,workspaceId,id,value.requestId,value.images);
   await tx.insert(chatMessages).values({workspaceId,conversationId:id,role:'visitor',requestId:value.requestId,body:value.body});
   await tx.update(conversations).set({mode:'human',status:'escalated',preview:value.body.slice(0,140),topicIds:conversationTopics(row.topicIds,value.body),lastActivityAt:new Date(),updatedAt:new Date(),unread:true,generationId:null,generationExpiresAt:null}).where(conversationWhere(workspaceId,id));
   await queueChatNotice(tx,workspaceId,id,row.mode==='ai'||!row.preview?'escalation':'followup',value.requestId);
   return false;
  }
  if(row.generationId&&row.generationExpiresAt&&row.generationExpiresAt>new Date())throw new ServiceError('conflict','Wait for the current reply before sending another message.');
  // Expired generation is fenced by replacing its ID; late responses cannot save.
  await linkChatImages(tx,workspaceId,id,value.requestId,value.images);
  await tx.insert(chatMessages).values({workspaceId,conversationId:id,role:'visitor',requestId:value.requestId,body:value.body});
  await tx.update(conversations).set({preview:value.body.slice(0,140),topicIds:conversationTopics(row.topicIds,value.body),lastActivityAt:new Date(),updatedAt:new Date(),unread:true,status:row.mode==='human'?'escalated':'open',generationId:null,generationExpiresAt:null}).where(conversationWhere(workspaceId,id));
  if(value.escalate){if(row.mode!=='human')await handoff(tx,workspaceId,id,value.requestId);return false;}
  if(row.mode==='human'){await queueChatNotice(tx,workspaceId,id,'followup',id+':'+Math.floor(Date.now()/300000));return false;}
  await tx.update(conversations).set({generationId:lease,generationExpiresAt:new Date(Date.now()+25000)}).where(conversationWhere(workspaceId,id));return true;
 });
 if(decision){
  const history=await getDb().select({role:chatMessages.role,body:chatMessages.body}).from(chatMessages).where(and(eq(chatMessages.workspaceId,workspaceId),eq(chatMessages.conversationId,id))).orderBy(desc(chatMessages.sequence)).limit(10);
  let answer;try{answer=await answerChat(workspaceId,history.reverse());}catch{answer={answer:HANDOFF,needs_human:true,source_ids:[],suggest_idea:null};}
  await getDb().transaction(async tx=>{
   const row=await authenticateConversation(tx,workspaceId,id,token,true);
   if(row.generationId!==lease||row.mode!=='ai')return;
   if(!await chatAvailable(workspaceId,tx)){await tx.update(conversations).set({generationId:null,generationExpiresAt:null}).where(conversationWhere(workspaceId,id));return;}
   if(answer.needs_human){await handoff(tx,workspaceId,id,value.requestId,answer.suggest_idea);return;}
   await tx.insert(chatMessages).values({workspaceId,conversationId:id,requestId:value.requestId,role:'assistant',body:answer.answer,sourceIds:answer.source_ids,suggestion:answer.suggest_idea??null}).onConflictDoNothing();
   await tx.update(conversations).set({generationId:null,generationExpiresAt:null,lastActivityAt:new Date(),updatedAt:new Date()}).where(conversationWhere(workspaceId,id));
  });
 }
 return {accepted:true};
}
export async function updateContact(workspaceId:string,id:string,token:string,input:unknown){await requireChat(workspaceId);const {email}=z.object({email:z.email().max(254).transform(s=>s.toLowerCase())}).strict().parse(input);await consumeRateLimit('chat:contact:'+id,5,3600);await getDb().transaction(async tx=>{const row=await authenticateConversation(tx,workspaceId,id,token,true);if(row.mode!=='human')throw new ServiceError('conflict','Contact details can be shared when the team takes over.');await tx.update(conversations).set({email,updatedAt:new Date()}).where(conversationWhere(workspaceId,id));});return {saved:true};}

export async function availableOperators(workspaceId:string){
 const db=getDb();const [config]=await db.select().from(chatSettings).where(eq(chatSettings.workspaceId,workspaceId)).limit(1);const operations=operationsSchema.parse(config?.operations??{});if(!teamAvailable(operations))return [];
 const members=await db.select({id:users.id,name:users.name,avatarUrl:users.avatarUrl}).from(workspaceMembers).innerJoin(users,eq(users.id,workspaceMembers.userId)).where(and(eq(workspaceMembers.workspaceId,workspaceId),eq(workspaceMembers.status,'active')));
 return members.filter(m=>operations.allOperators||operations.operatorIds.includes(m.id)).slice(0,5).map(({id,name,avatarUrl})=>({id,name:name??'Teammate',avatarUrl}));
}

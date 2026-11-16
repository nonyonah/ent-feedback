import 'server-only';
import {featureRequestSuggestion} from '@/lib/chat/feature-request';
import {slackApi,receiveSlackEvent,receiveSlackAction} from './slack';
import {conversationStatusLabel,type ConversationStatus} from './status';
import {chatImageUrl} from './uploads';
import {and,eq,sql,asc,lt,lte,isNull,inArray} from 'drizzle-orm';
import {z} from 'zod';
import {getDb,type Queryable} from '@/server/db/client';
import {jobs,conversations,chatSettings,integrationConnections,workspaceMembers,users,feedback,workspaces,chatMessages,chatUploads,attachments,comments,slackThreads} from '@/server/db/schema';
import {getServerEnv} from '@/server/env';
import {unseal} from '@/server/integration-crypto';
import {secretSchema} from '@/server/integrations';
import {operationsSchema} from '@/lib/chat/availability';
import {sendChatEmail} from '@/server/email';
export async function enqueueConversationNotice(tx:Queryable,workspaceId:string,id:string,event:'escalation'|'followup'|'reply',eventId:string,skipSlack=false){
 const [conv]=await tx.select().from(conversations).where(and(eq(conversations.workspaceId,workspaceId),eq(conversations.id,id))).limit(1);if(!conv)return;
 const payload={workspaceId,conversationId:id,event,eventId};const emailEventId=event==='followup'?id+':'+Math.floor(Date.now()/300000):eventId;
 const [chatConfig]=await tx.select({operations:chatSettings.operations}).from(chatSettings).where(eq(chatSettings.workspaceId,workspaceId)).limit(1);const operations=operationsSchema.parse(chatConfig?.operations??{});
 const recipients=event==='reply'?[]:await tx.select({id:users.id}).from(workspaceMembers).innerJoin(users,eq(users.id,workspaceMembers.userId)).where(and(eq(workspaceMembers.workspaceId,workspaceId),eq(workspaceMembers.status,'active'),operations.allOperators?undefined:inArray(workspaceMembers.userId,operations.operatorIds),sql`${users.email} is not null`));
 for(const r of recipients)await tx.insert(jobs).values({type:'chat_delivery',dedupeKey:`chat:email:${event}:${emailEventId}:${r.id}`,payload:{...payload,delivery:'email',userId:r.id}}).onConflictDoNothing();
 if(event==='reply'&&conv.email)await tx.insert(jobs).values({type:'chat_delivery',dedupeKey:`chat:reply:${eventId}`,payload:{...payload,delivery:'email'}}).onConflictDoNothing();
 if(!skipSlack)await enqueueSlack(tx,{...payload,eventId});
}
export async function enqueueSlack(tx:Queryable,input:{workspaceId:string;event:string;eventId:string;conversationId?:string;feedbackId?:string;forceStatus?:boolean}){
 const [settings]=await tx.select().from(chatSettings).where(eq(chatSettings.workspaceId,input.workspaceId)).limit(1);
 const enabled=input.event==='escalation'?(settings?.slackEscalations??true):input.event==='followup'||input.event==='reply'?(settings?.slackFollowups??true):input.event==='new_feedback'||input.event==='feedback_comment'?settings?.slackFeedback:settings?.slackStatuses;
 if(!enabled&&!(input.forceStatus&&input.conversationId&&input.event==='status_changed'))return;
 const [conn]=await tx.select({id:integrationConnections.id,updated:integrationConnections.updatedAt}).from(integrationConnections).where(and(eq(integrationConnections.workspaceId,input.workspaceId),eq(integrationConnections.provider,'slack'),eq(integrationConnections.scope,'workspace'),eq(integrationConnections.authorizationState,'connected'))).limit(1);if(!conn)return;
 await tx.insert(jobs).values({type:'chat_delivery',dedupeKey:`chat:slack:${input.event}:${input.eventId}`,payload:{...input,delivery:'slack',connectionId:conn.id,connectionVersion:conn.updated.toISOString()}}).onConflictDoNothing();
}
const payloadSchema=z.object({workspaceId:z.uuid(),conversationId:z.uuid().optional(),feedbackId:z.uuid().optional(),eventId:z.string().optional(),event:z.enum(['escalation','followup','reply','new_feedback','status_changed','type_changed','feedback_comment']),delivery:z.enum(['email','slack']),userId:z.uuid().optional(),connectionId:z.uuid().optional(),connectionVersion:z.string().optional(),forceStatus:z.boolean().optional()});
export async function deliverChatJob(job:typeof jobs.$inferSelect){
 if((job.payload as {delivery?:string}).delivery==='slack_inbound'){await receiveSlackEvent((job.payload as {input:unknown}).input);return;}
 if((job.payload as {delivery?:string}).delivery==='slack_action'){const p=job.payload as {input:unknown;eventId:string};await receiveSlackAction(p.input,p.eventId);return;}
 const p=payloadSchema.parse(job.payload);const db=getDb();const env=getServerEnv();const [workspace]=await db.select({name:workspaces.name,handle:workspaces.handle}).from(workspaces).where(eq(workspaces.id,p.workspaceId)).limit(1);if(!workspace)return;
 const [settings]=await db.select().from(chatSettings).where(eq(chatSettings.workspaceId,p.workspaceId)).limit(1);
 const enabled=p.event==='escalation'?(settings?.slackEscalations??true):p.event==='followup'||p.event==='reply'?(settings?.slackFollowups??true):p.event==='new_feedback'||p.event==='feedback_comment'?settings?.slackFeedback:settings?.slackStatuses;
 let to:string|undefined;let title:string;let body:string;let url:string;let images:string[]=[];let chatStatus:ConversationStatus|undefined;let featureSuggestionId:string|undefined;
 if(p.conversationId){const [conv]=await db.select().from(conversations).where(and(eq(conversations.id,p.conversationId),eq(conversations.workspaceId,p.workspaceId))).limit(1);if(!conv)return;chatStatus=conv.status;
  title=p.event==='reply'?'The team replied':p.event==='followup'?'A visitor followed up':'A visitor needs your help';
  // Operator email alerts omit transcript text; opted-in Slack threads include it.
  body=p.event==='reply'?`${workspace.name} replied to your conversation. Open the widget on the site where you started chatting to read it.`:`Open Conversations in ${workspace.name} to read and reply.`;
  url=p.event==='reply'?new URL('/p/'+(await db.select({handle:workspaces.handle}).from(workspaces).where(eq(workspaces.id,p.workspaceId)).limit(1))[0].handle,env.NEXT_PUBLIC_APP_URL).href:new URL('/dashboard/conversations?workspace='+p.workspaceId+'&conversation='+conv.id,env.NEXT_PUBLIC_APP_URL).href;
  if(p.event==='reply'&&p.eventId){const [message]=await db.select({body:chatMessages.body}).from(chatMessages).where(and(eq(chatMessages.workspaceId,p.workspaceId),eq(chatMessages.conversationId,conv.id),eq(chatMessages.requestId,p.eventId),eq(chatMessages.role,'team'))).limit(1);if(!message)return;body=message.body+'\n\nOpen the widget on the site where you started chatting to continue. Replies to this email aren’t monitored.';}
  if(p.delivery==='slack'){url=new URL('/dashboard/conversations?workspace='+p.workspaceId+'&conversation='+conv.id,env.NEXT_PUBLIC_APP_URL).href;const [message]=await db.select().from(chatMessages).where(and(eq(chatMessages.workspaceId,p.workspaceId),eq(chatMessages.conversationId,conv.id),z.uuid().safeParse(p.eventId).success?eq(chatMessages.requestId,p.eventId!):undefined)).orderBy(sql`${chatMessages.sequence} desc`).limit(1);if(message){if(message.role==='visitor'&&featureRequestSuggestion(message.body))featureSuggestionId=message.id;body=message.body;images=(await db.select().from(chatUploads).where(and(eq(chatUploads.workspaceId,p.workspaceId),eq(chatUploads.conversationId,conv.id),eq(chatUploads.requestId,message.requestId)))).map(file=>chatImageUrl(file.id));}title='Live chat · '+(p.event==='reply'?'Team reply':p.event==='followup'?'Visitor message':'New conversation');}
  if(p.delivery==='slack'&&p.event==='status_changed'){title='Live chat · Status updated';body='Conversation marked '+conversationStatusLabel(conv.status)+'.';images=[];}
  if(p.userId){const operators=operationsSchema.parse(settings?.operations??{});if(!operators.allOperators&&!operators.operatorIds.includes(p.userId))return;const [user]=await db.select({email:users.email}).from(workspaceMembers).innerJoin(users,eq(users.id,workspaceMembers.userId)).where(and(eq(workspaceMembers.workspaceId,p.workspaceId),eq(workspaceMembers.userId,p.userId),eq(workspaceMembers.status,'active'))).limit(1);to=user?.email??undefined;}else if(p.event==='reply')to=conv.email??undefined;
 }else{if(!p.feedbackId)return;const [post]=await db.select({title:feedback.title,status:feedback.status,category:feedback.category,body:feedback.body}).from(feedback).where(and(eq(feedback.id,p.feedbackId),eq(feedback.workspaceId,p.workspaceId),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId))).limit(1);if(!post)return;const type=post.category==='bug'?'Bug':post.category==='feature_request'?'Feature request':'Feedback';title=type+' · '+(p.event==='new_feedback'?'New post':p.event==='feedback_comment'?'New reply':p.event==='type_changed'?'Type updated':'Status updated');body=post.title+'\n'+post.body.slice(0,2000)+(p.event==='status_changed'?' · '+post.status:'');if(p.event==='feedback_comment'&&p.eventId){const [comment]=await db.select().from(comments).where(and(eq(comments.id,p.eventId),eq(comments.workspaceId,p.workspaceId),eq(comments.feedbackId,p.feedbackId),isNull(comments.deletedAt))).limit(1);if(!comment)return;body=comment.body;}images=(await db.select().from(attachments).where(and(eq(attachments.workspaceId,p.workspaceId),eq(attachments.status,'attached'),p.event==='feedback_comment'?eq(attachments.commentId,p.eventId!):eq(attachments.feedbackId,p.feedbackId)))).map(file=>new URL('/api/attachments/'+file.id,env.NEXT_PUBLIC_APP_URL).href);url=new URL('/p/'+encodeURIComponent(workspace.handle)+'/items/'+p.feedbackId,env.NEXT_PUBLIC_APP_URL).href;}
 if(p.delivery==='email'){if(to)await sendChatEmail({to,key:job.dedupeKey??job.id,subject:title+' · '+workspace.name,heading:title,body,url,action:p.event==='reply'?'Open the public board':'Open conversation'});return;}
 if(!enabled&&!(p.forceStatus&&p.conversationId&&p.event==='status_changed'))return;
 if(!env.INTEGRATION_ENCRYPTION_KEY)throw new Error('Slack encryption is not configured');
 const [connection]=await db.select().from(integrationConnections).where(and(eq(integrationConnections.id,p.connectionId??'00000000-0000-0000-0000-000000000000'),eq(integrationConnections.workspaceId,p.workspaceId),eq(integrationConnections.provider,'slack'),eq(integrationConnections.scope,'workspace'),eq(integrationConnections.authorizationState,'connected'))).limit(1);
 if(!connection?.encryptedSecretRef||connection.updatedAt.toISOString()!==p.connectionVersion)return;
 const secret=secretSchema.parse(unseal(connection.encryptedSecretRef,env.INTEGRATION_ENCRYPTION_KEY,p.workspaceId+':slack'));
 if(!connection.allowedChannels.includes(secret.channel))return;
 // Serialize per destination so simultaneous messages share one thread.
 await db.transaction(async tx=>{
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${connection.id+':'+(p.conversationId??p.feedbackId)}))`);
  const [current]=await tx.select().from(integrationConnections).where(and(eq(integrationConnections.id,connection.id),eq(integrationConnections.authorizationState,'connected'))).limit(1);if(!current||current.updatedAt.toISOString()!==p.connectionVersion)return;
  const [candidate]=await tx.select().from(slackThreads).where(and(eq(slackThreads.connectionId,connection.id),p.conversationId?eq(slackThreads.conversationId,p.conversationId):eq(slackThreads.feedbackId,p.feedbackId!))).limit(1);
  const thread=candidate?.channel===secret.channel?candidate:undefined;if(candidate&&!thread)await tx.delete(slackThreads).where(eq(slackThreads.id,candidate.id));
  const blocks:Record<string,unknown>[]=[{type:'section',text:{type:'plain_text',text:(title+'\n'+workspace.name+'\n'+body).slice(0,2900)}}];
  for(const image of images.slice(0,3))blocks.push({type:'image',image_url:image,alt_text:'Attached image'});
  blocks.push({type:'section',text:{type:'mrkdwn',text:`<${url}|Open in Ent>`}});
  if(featureSuggestionId){const review=new URL(url);review.searchParams.set('suggest',featureSuggestionId);blocks.push({type:'section',text:{type:'plain_text',text:'This sounds like a feature request. Review it before adding it to a board.'},accessory:{type:'button',text:{type:'plain_text',text:'Review feature request'},url:review.href,action_id:'ent_chat_review_feature',value:p.conversationId}});}
  if(p.conversationId&&chatStatus){
   blocks.push({type:'context',elements:[{type:'plain_text',text:'Status: '+conversationStatusLabel(chatStatus)}]});
   blocks.push({type:'actions',elements:([{status:'open',label:'In progress'},{status:'escalated',label:'Queue'},{status:'resolved',label:'Resolve'}] as const).filter(option=>option.status!==chatStatus).map(option=>({type:'button',text:{type:'plain_text',text:option.label},action_id:'ent_chat_status_'+option.status,value:p.conversationId}))});
  }
  const result=await slackApi(secret.accessToken,'chat.postMessage',{channel:secret.channel,text:(title+' · '+body).slice(0,3000),blocks,thread_ts:thread?.threadTs,unfurl_links:false,unfurl_media:false,client_msg_id:job.id});
  if(!thread){const ts=z.string().regex(/^\d+\.\d+$/).parse(result.ts);await tx.insert(slackThreads).values({workspaceId:p.workspaceId,connectionId:connection.id,channel:secret.channel,threadTs:ts,conversationId:p.conversationId??null,feedbackId:p.feedbackId??null});}
 });
}
export async function processChatJobs(limit=1,destination?:{workspaceId:string;conversationId?:string;feedbackId?:string}){
 const db=getDb(),now=new Date();
 const claimed=await db.transaction(async tx=>{
  const expired=and(eq(jobs.type,'chat_delivery'),eq(jobs.status,'running'),lt(jobs.lockedAt,new Date(now.getTime()-600000)));
  await tx.update(jobs).set({status:'failed',lockedAt:null,lastError:'Delivery lease expired'}).where(and(expired,sql`${jobs.attempts}>=${jobs.maxAttempts}`));
  await tx.update(jobs).set({status:'pending',lockedAt:null}).where(and(expired,sql`${jobs.attempts}<${jobs.maxAttempts}`));
  const rows=await tx.select().from(jobs).where(and(eq(jobs.type,'chat_delivery'),eq(jobs.status,'pending'),destination?and(sql`${jobs.payload}->>'workspaceId' = ${destination.workspaceId}`,destination.conversationId?sql`${jobs.payload}->>'conversationId' = ${destination.conversationId}`:sql`${jobs.payload}->>'feedbackId' = ${destination.feedbackId??''}`):undefined,lte(jobs.runAt,now),sql`${jobs.attempts}<${jobs.maxAttempts}`)).orderBy(sql`case when ${jobs.payload}->>'delivery' in ('slack_inbound','slack_action') then 0 when ${jobs.payload}->>'delivery'='slack' then 1 else 2 end`,asc(jobs.runAt),asc(jobs.id)).limit(Math.min(2,Math.max(1,limit))).for('update',{skipLocked:true});
  for(const row of rows)await tx.update(jobs).set({status:'running',lockedAt:now,attempts:row.attempts+1,updatedAt:now}).where(eq(jobs.id,row.id));return rows;
 });
 let succeeded=0,retried=0;
 for(const job of claimed){const owned=and(eq(jobs.id,job.id),eq(jobs.status,'running'),eq(jobs.lockedAt,now));try{await deliverChatJob(job);await db.update(jobs).set({status:'succeeded',lockedAt:null,lastError:null,updatedAt:new Date()}).where(owned);succeeded++;}catch(error){await db.update(jobs).set({status:job.attempts+1>=job.maxAttempts?'failed':'pending',runAt:new Date(Date.now()+Math.min(3600000,30000*2**job.attempts)),lockedAt:null,lastError:error instanceof Error&&/^Slack: (not_in_channel|channel_not_found|missing_scope|invalid_auth|token_revoked|account_inactive|restricted_action|ratelimited)$/.test(error.message)?error.message:'Delivery could not be confirmed',updatedAt:new Date()}).where(owned);retried++;}}
 return {succeeded,retried};
}

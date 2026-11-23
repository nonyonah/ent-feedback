import 'server-only';
import {and,eq,isNull,sql} from 'drizzle-orm';
import {z} from 'zod';
import {getDb,type Queryable} from '@/server/db/client';
import {connectedApps,discordDeliveries,discordIdentities,feedback,comments,conversations,chatMessages,chatUploads,attachments,workspaces,jobs,statusHistory} from '@/server/db/schema';
import {getServerEnv} from '@/server/env';
import {unseal} from '@/server/integration-crypto';
import {publishActivity} from '@/server/activity';
import {requireWorkspaceRole} from '@/server/services/access';
import {requireChatOperator} from '@/server/chat/operators';
import {setConversationStatus} from '@/server/chat/status';
import {chatImageUrl} from '@/server/chat/uploads';
import {enqueueConversationNotice} from '@/server/chat/notifications';
import {discordSettingsSchema} from '@/lib/connected-apps';
import {discordCredentials} from './oauth';
import {appConfig,appFetch} from './config';
import {externalRequestId,discordNonce} from './security';
export const discordActionId=z.string().regex(/^ent:[0-9a-f-]{36}:(reply|submit|status|open|planned|in-progress|shipped|escalated|resolved)$/);
export function parseDiscordAction(value:string){const valid=discordActionId.parse(value).split(':');return {deliveryId:z.uuid().parse(valid[1]),action:valid[2]};}
export const discordInteraction=z.object({id:z.string().regex(/^\d+$/),application_id:z.string(),type:z.number(),token:z.string().min(1).max(300),guild_id:z.string(),channel_id:z.string(),member:z.object({user:z.object({id:z.string(),bot:z.boolean().optional()})}),message:z.object({id:z.string()}).optional(),data:z.object({custom_id:discordActionId,values:z.array(z.enum(['open','planned','in-progress','shipped','escalated','resolved'])).length(1).optional(),components:z.array(z.object({components:z.array(z.object({custom_id:z.string(),value:z.string().max(3000)}))})).optional()})});
type Interaction=z.infer<typeof discordInteraction>;
export async function discordActor(p:Interaction,tx:Queryable=getDb()){
 const {deliveryId,action}=parseDiscordAction(p.data.custom_id),[row]=await tx.select({delivery:discordDeliveries,connection:connectedApps}).from(discordDeliveries).innerJoin(connectedApps,eq(connectedApps.id,discordDeliveries.connectionId)).where(and(eq(discordDeliveries.id,deliveryId),eq(connectedApps.provider,'discord'),eq(connectedApps.connected,true))).limit(1);
 if(!row||p.member.user.bot||row.connection.externalId!==p.guild_id||row.delivery.channelId!==p.channel_id||p.type===3&&p.message?.id!==row.delivery.messageId)throw Error('Unauthorized');
 if(row.delivery.conversationId&&!['reply','submit','open','escalated','resolved'].includes(action)||row.delivery.feedbackId&&!['reply','submit','open','planned','in-progress','shipped'].includes(action))throw Error('Invalid action');
 const [identity]=await tx.select().from(discordIdentities).where(and(eq(discordIdentities.workspaceId,row.connection.workspaceId),eq(discordIdentities.discordUserId,p.member.user.id)));if(!identity)throw Error('Link your Discord account in Ent Settings → Integrations first.');
 await requireWorkspaceRole(tx,{workspaceId:row.connection.workspaceId,userId:identity.userId,minimumRole:row.delivery.feedbackId&&action!=='reply'&&action!=='submit'?'admin':'member'});
 if(row.delivery.conversationId)await requireChatOperator(tx,row.connection.workspaceId,identity.userId);
 return {...row,userId:identity.userId,action};
}
export function discordReplyModal(deliveryId:string){return {type:9,data:{custom_id:`ent:${deliveryId}:submit`,title:'Reply in Ent',components:[{type:1,components:[{type:4,custom_id:'body',label:'Message',style:2,min_length:1,max_length:3000,required:true}]}]}};}
export async function applyDiscordAction(p:Interaction){
 await getDb().transaction(async tx=>{
 const {delivery:d,connection:c,userId,action}=await discordActor(p,tx);
 const [active]=await tx.select().from(connectedApps).where(and(eq(connectedApps.id,c.id),eq(connectedApps.connected,true))).for('update');if(!active||active.updatedAt.getTime()!==c.updatedAt.getTime())throw Error('Discord connection changed');
 const eventId=externalRequestId('discord:'+p.id);
 const [receipt]=await tx.insert(jobs).values({type:'integration_receipt',status:'succeeded',dedupeKey:'discord:applied:'+p.id,payload:{workspaceId:c.workspaceId}}).onConflictDoNothing().returning({id:jobs.id});if(!receipt)return;
 if(d.conversationId){const conversationId=d.conversationId;
 if(action==='submit'){
 const body=p.data.components?.flatMap(row=>row.components).find(x=>x.custom_id==='body')?.value.trim();if(!body)throw Error('Empty reply');
 const [conversation]=await tx.select().from(conversations).where(and(eq(conversations.id,conversationId),eq(conversations.workspaceId,c.workspaceId))).for('update');if(!conversation)throw Error('Conversation unavailable');
 await tx.insert(chatMessages).values({workspaceId:c.workspaceId,conversationId,role:'team',authorUserId:userId,requestId:eventId,body}).onConflictDoNothing();
 await tx.update(conversations).set({status:'open',mode:'human',generationId:null,generationExpiresAt:null,preview:body.slice(0,140),unread:false,lastActivityAt:new Date(),updatedAt:new Date()}).where(eq(conversations.id,conversationId));
 await enqueueConversationNotice(tx,c.workspaceId,conversationId,'reply',eventId);
 }else if(['open','escalated','resolved'].includes(action))await setConversationStatus(tx,{workspaceId:c.workspaceId,conversationId,userId,status:action as 'open'|'escalated'|'resolved',eventId});else throw Error('Invalid conversation action');
 }else if(d.feedbackId){
 // Same lock order as dashboard and roadmap updates.
 if(action!=='submit')await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${c.workspaceId+':roadmap'},0))`);
 const [post]=await tx.select().from(feedback).where(and(eq(feedback.id,d.feedbackId),eq(feedback.workspaceId,c.workspaceId),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId))).for('update');if(!post)throw Error('Feedback unavailable');
 if(action==='submit'){
 const body=p.data.components?.flatMap(row=>row.components).find(x=>x.custom_id==='body')?.value.trim();if(!body)throw Error('Empty reply');await tx.insert(comments).values({id:eventId,workspaceId:c.workspaceId,feedbackId:post.id,authorUserId:userId,body}).onConflictDoNothing();await publishActivity(tx,{type:'feedback_comment',workspaceId:c.workspaceId,feedbackId:post.id,actorId:userId,eventId,commentId:eventId});
 }else if(['open','planned','in-progress','shipped'].includes(action)&&post.status!==action){const status=action as typeof post.status;await tx.update(feedback).set({status,updatedAt:new Date()}).where(eq(feedback.id,post.id));await tx.insert(statusHistory).values({workspaceId:c.workspaceId,feedbackId:post.id,previousStatus:post.status,newStatus:status,actorUserId:userId});await publishActivity(tx,{type:'status_changed',workspaceId:c.workspaceId,feedbackId:post.id,actorId:userId,eventId});}
 }
 });
}
export const discordDeliveryPayload=z.object({connectionId:z.uuid(),workspaceId:z.uuid(),version:z.string(),feedbackId:z.uuid().optional(),conversationId:z.uuid().optional(),event:z.string(),eventId:z.string()});
export async function deliverDiscord(input:unknown,key:string){
 const p=discordDeliveryPayload.parse(input),db=getDb(),config=appConfig('discord'),env=getServerEnv();
 const [c]=await db.select().from(connectedApps).where(and(eq(connectedApps.id,p.connectionId),eq(connectedApps.workspaceId,p.workspaceId),eq(connectedApps.provider,'discord'),eq(connectedApps.connected,true)));if(!c?.encryptedCredentials||c.updatedAt.toISOString()!==p.version)return;
 const [done]=await db.select({id:discordDeliveries.id}).from(discordDeliveries).where(and(eq(discordDeliveries.connectionId,c.id),eq(discordDeliveries.eventKey,key)));if(done)return;
 const settings=discordSettingsSchema.parse(c.settings);if(p.feedbackId&&!settings.feedback||p.conversationId&&!settings.conversations||p.event==='status_changed'&&!settings.statuses)return;
 const secret=discordCredentials.parse(unseal(c.encryptedCredentials,config.key,c.workspaceId+':discord'));
 const [workspace]=await db.select().from(workspaces).where(eq(workspaces.id,c.workspaceId));if(!workspace)return;
 let title='',body='',url='',images:string[]=[];
 if(p.feedbackId){
 const [post]=await db.select().from(feedback).where(and(eq(feedback.id,p.feedbackId),eq(feedback.workspaceId,c.workspaceId),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId)));if(!post)return;
 title=({bug:'Bug',feature_request:'Feature request',feedback:'Feedback'}[post.category])+` · ${post.title}`;body=post.body;
 if(p.event==='feedback_comment'){const [reply]=await db.select().from(comments).where(and(eq(comments.id,p.eventId),eq(comments.feedbackId,post.id),eq(comments.workspaceId,c.workspaceId),isNull(comments.deletedAt)));if(!reply)return;body=reply.body;}
 body+=`\n\nStatus: ${post.status}`;url=new URL(`/${workspace.handle}/items/${post.id}`,env.NEXT_PUBLIC_APP_URL).href;
 images=(await db.select().from(attachments).where(and(eq(attachments.workspaceId,c.workspaceId),eq(attachments.status,'attached'),p.event==='feedback_comment'?eq(attachments.commentId,p.eventId):eq(attachments.feedbackId,post.id))).limit(3)).map(file=>new URL('/api/attachments/'+file.id,env.NEXT_PUBLIC_APP_URL).href);
 }else if(p.conversationId){
 const [conv]=await db.select().from(conversations).where(and(eq(conversations.id,p.conversationId),eq(conversations.workspaceId,c.workspaceId)));if(!conv)return;
 title='Live chat · '+(p.event==='status_changed'?conv.status:p.event==='reply'?'Team reply':'Visitor message');body=conv.preview??'';url=new URL(`/dashboard/conversations?conversation=${conv.id}`,env.NEXT_PUBLIC_APP_URL).href;
 const [message]=await db.select().from(chatMessages).where(and(eq(chatMessages.conversationId,conv.id),eq(chatMessages.workspaceId,c.workspaceId),eq(chatMessages.requestId,p.eventId))).limit(1);if(message){body=message.body;images=(await db.select().from(chatUploads).where(and(eq(chatUploads.workspaceId,c.workspaceId),eq(chatUploads.conversationId,conv.id),eq(chatUploads.requestId,message.requestId))).limit(3)).map(f=>chatImageUrl(f.id));}
 }else return;
 const id=externalRequestId(key);
 const statusOptions=p.conversationId?[{label:'Queued',value:'escalated'},{label:'In progress',value:'open'},{label:'Resolved',value:'resolved'}]:[{label:'Open',value:'open'},{label:'Planned',value:'planned'},{label:'In progress',value:'in-progress'},{label:'Shipped',value:'shipped'}];
 const components=[{type:1,components:[{type:2,style:2,label:'Reply',custom_id:`ent:${id}:reply`},{type:2,style:5,label:'Open Ent',url}]},{type:1,components:[{type:3,custom_id:`ent:${id}:status`,placeholder:'Update status',min_values:1,max_values:1,options:statusOptions}]}];
 const payload={content:null,embeds:[{title:title.slice(0,256),description:body.slice(0,3500),url,...(images[0]?{image:{url:images[0]}}:{})}],components,allowed_mentions:{parse:[]},nonce:discordNonce(key),enforce_nonce:true};
 const response=await appFetch(`https://discord.com/api/v10/channels/${secret.channelId}/messages`,{method:'POST',headers:{Authorization:'Bot '+env.DISCORD_BOT_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const message=z.object({id:z.string().regex(/^\d+$/)}).parse(await response.json());
 await db.insert(discordDeliveries).values({id,workspaceId:c.workspaceId,connectionId:c.id,eventKey:key,messageId:message.id,channelId:secret.channelId,feedbackId:p.feedbackId,conversationId:p.conversationId}).onConflictDoNothing();
}

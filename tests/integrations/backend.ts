import assert from 'node:assert/strict';
import {randomUUID,createHmac,generateKeyPairSync,sign} from 'node:crypto';
import {and,eq,sql} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {users,workspaces,workspaceMembers,boards,feedback,connectedApps,linearIssueLinks,discordIdentities,discordDeliveries,jobs,comments,conversations,chatMessages,chatSettings} from '@/server/db/schema';
import {seal,unseal} from '@/server/integration-crypto';
import {loadConnectedAppsAction,connectAppAction,linkFeedbackLinearAction,saveConnectedAppSettingsAction} from '@/server/actions/connected-apps';
import {linearToken,createOrLinkIssue} from '@/server/connected-apps/linear';
import {enqueueDiscord} from '@/server/connected-apps/queue';
import {deliverIntegrationJob,processIntegrationJobs} from '@/server/connected-apps/worker';
import {applyDiscordAction,discordActor} from '@/server/connected-apps/discord';
import {POST as linearWebhook} from '@/app/api/integrations/linear/events/route';
import {POST as discordWebhook} from '@/app/api/integrations/discord/interactions/route';
import {operationsSchema} from '@/lib/chat/availability';
import {appOAuthCallback} from '@/server/connected-apps/oauth';
import type {ServerEnv} from '@/server/env';
declare const global:typeof globalThis&{chatUser:typeof users.$inferSelect|null;chatEnv:ServerEnv;integrationCookies:Map<string,{value:string}>};
export async function run(){
 const db=getDb();const [owner]=await db.insert(users).values({clerkUserId:randomUUID(),email:'owner@example.com',name:'Owner'}).returning();const [outsider]=await db.insert(users).values({clerkUserId:randomUUID(),email:'outside@example.com',name:'Outside'}).returning();global.chatUser=owner;
 const [workspace]=await db.insert(workspaces).values({name:'Integration test',handle:'integration-'+randomUUID().slice(0,8)}).returning();
 await db.insert(workspaceMembers).values({workspaceId:workspace.id,userId:owner.id,role:'owner',status:'active'});
 const [board]=await db.insert(boards).values({workspaceId:workspace.id,name:'Feedback',handle:'feedback'}).returning();
 const [post]=await db.insert(feedback).values({workspaceId:workspace.id,boardId:board.id,title:'Feature from Ent',body:'Please add this',category:'feature_request',authorUserId:owner.id,status:'planned'}).returning();
 const disabled=await loadConnectedAppsAction(workspace.id);assert.ok(disabled.ok);assert.deepEqual(disabled.data.enabled,{linear:false,discord:false});assert.equal((await connectAppAction({workspaceId:workspace.id,provider:'linear'})).ok,false);assert.equal((await discordWebhook(new Request('https://ent.test',{method:'POST',body:'{}'}))).status,404);
 Object.assign(global.chatEnv,{LINEAR_ENABLED:'true',LINEAR_CLIENT_ID:'linear-test',LINEAR_CLIENT_SECRET:'linear-secret',LINEAR_WEBHOOK_SECRET:'webhook-secret',DISCORD_ENABLED:'true',DISCORD_CLIENT_ID:'12345',DISCORD_CLIENT_SECRET:'discord-secret',DISCORD_BOT_TOKEN:'bot-test'});
 const pair=generateKeyPairSync('ed25519');global.chatEnv.DISCORD_PUBLIC_KEY=pair.publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('hex');
 const states={open:randomUUID(),planned:randomUUID(),'in-progress':randomUUID(),shipped:randomUUID()},teamId=randomUUID(),externalId=randomUUID(),key=global.chatEnv.INTEGRATION_ENCRYPTION_KEY!;
 const [linear]=await db.insert(connectedApps).values({workspaceId:workspace.id,provider:'linear',externalId,label:'Linear',settings:{teamId,states},encryptedCredentials:seal({accessToken:'test-token',refreshToken:'test-refresh',expiresAt:Date.now()+3600000},key,workspace.id+':linear'),createdByUserId:owner.id}).returning();
 const [discord]=await db.insert(connectedApps).values({workspaceId:workspace.id,provider:'discord',externalId:'22222',label:'Discord',encryptedCredentials:seal({accessToken:'discord-token',refreshToken:'discord-refresh',webhookId:'33333',webhookToken:'token',channelId:'44444'},key,workspace.id+':discord'),createdByUserId:owner.id}).returning();
 await db.insert(discordIdentities).values({workspaceId:workspace.id,userId:owner.id,discordUserId:'55555'});
 let refreshes=0;let created=0,messages=0,currentState=states.planned,issueId='',failDiscord=false;const discordBodies:Record<string,unknown>[]=[];
 global.fetch=async(input,init)=>{
 const url=String(input);
 if(url==='https://api.linear.app/oauth/token'){refreshes++;return Response.json({access_token:'renewed-token',refresh_token:'renewed-refresh',expires_in:86400});}
 const body=JSON.parse(String(init?.body??'{}'));

 if(url==='https://api.linear.app/graphql'){
 if(body.query.includes('organization'))return Response.json({data:{organization:{id:externalId,name:'Linear'}}});
 if(body.query.includes('issues(filter'))return Response.json({data:{issues:{nodes:[]}}});
 if(body.query.includes('issueCreate')){created++;issueId=body.variables.input.id;return Response.json({data:{issueCreate:{success:true,issue:{id:issueId,identifier:'ENT-1',url:'https://linear.app/test/issue/ENT-1',team:{id:teamId},state:{id:currentState},updatedAt:new Date().toISOString()}}}});}
 if(body.query.includes('issue(id:'))return Response.json({data:{issue:{id:issueId,identifier:'ENT-1',url:'https://linear.app/test/issue/ENT-1',team:{id:teamId},state:{id:currentState},updatedAt:new Date().toISOString()}}});
 throw Error('Unexpected Linear operation');
 }
 if(url==='https://discord.com/api/v10/channels/44444/messages'){if(failDiscord){failDiscord=false;return new Response('',{status:503});}messages++;discordBodies.push(body);return Response.json({id:String(90000+messages)});}
 if(url.includes('/messages/@original'))return Response.json({});throw Error('Unexpected network request');
 };
 const authorization=await connectAppAction({provider:'linear',workspaceId:workspace.id});assert.ok(authorization.ok);const authorizationUrl=new URL(authorization.data.url);assert.equal(authorizationUrl.searchParams.get('code_challenge_method'),'S256');assert.ok(authorizationUrl.searchParams.get('state'));assert.equal(authorizationUrl.searchParams.has('client_secret'),false);
 assert.equal(new URL((await appOAuthCallback('linear',new Request('https://ent.test/api/integrations/linear/callback?code=test&state=forged'))).headers.get('location')!).searchParams.get('result'),'error');
 await db.update(connectedApps).set({encryptedCredentials:seal({accessToken:'expired',refreshToken:'test-refresh',expiresAt:0},key,workspace.id+':linear')}).where(eq(connectedApps.id,linear.id));
 const refreshed=await Promise.all([linearToken(linear.id),linearToken(linear.id)]);assert.equal(refreshes,1);assert.ok(refreshed.every(r=>r.token==='renewed-token'));
 await assert.rejects(()=>createOrLinkIssue({connectionId:linear.id,workspaceId:randomUUID(),feedbackId:post.id}));
 const first=await createOrLinkIssue({connectionId:linear.id,workspaceId:workspace.id,feedbackId:post.id});assert.equal(first.identifier,'ENT-1');await createOrLinkIssue({connectionId:linear.id,workspaceId:workspace.id,feedbackId:post.id});assert.equal(created,1);
 global.chatUser=outsider;assert.equal((await linkFeedbackLinearAction({workspaceId:workspace.id,feedbackId:post.id})).ok,false);assert.equal((await saveConnectedAppSettingsAction({provider:'discord',workspaceId:workspace.id,settings:{feedback:false}})).ok,false);global.chatUser=owner;
 currentState=states['in-progress'];const body=JSON.stringify({type:'Issue',action:'update',organizationId:externalId,webhookTimestamp:Date.now(),data:{id:issueId,updatedAt:new Date().toISOString()}}),signature=createHmac('sha256',global.chatEnv.LINEAR_WEBHOOK_SECRET!).update(body).digest('hex');
 assert.equal((await linearWebhook(new Request('https://ent.test',{method:'POST',body,headers:{'linear-signature':'bad'}}))).status,401);
 for(let i=0;i<2;i++)assert.equal((await linearWebhook(new Request('https://ent.test',{method:'POST',body,headers:{'linear-signature':signature}}))).status,200);
 const inbound=await db.select().from(jobs).where(eq(jobs.type,'integration_delivery'));assert.equal(inbound.filter(j=>j.payload.kind==='linear_event').length,1);const linearJob=inbound.find(j=>j.payload.kind==='linear_event')!;await deliverIntegrationJob(linearJob);await deliverIntegrationJob(linearJob);assert.equal((await db.select().from(feedback).where(eq(feedback.id,post.id)))[0].status,'in-progress');
 await db.transaction(tx=>enqueueDiscord(tx,{workspaceId:workspace.id,feedbackId:post.id,event:'new_feedback',eventId:post.id}));const [outgoing]=await db.select().from(jobs).where(and(eq(jobs.type,'integration_delivery'),sql`${jobs.payload}->>'event' = 'new_feedback'`));failDiscord=true;await assert.rejects(()=>deliverIntegrationJob(outgoing));await deliverIntegrationJob(outgoing);await deliverIntegrationJob(outgoing);assert.equal(messages,1);assert.deepEqual(discordBodies[0].allowed_mentions,{parse:[]});assert.equal(discordBodies[0].enforce_nonce,true);
 const [delivery]=await db.select().from(discordDeliveries).where(eq(discordDeliveries.eventKey,outgoing.dedupeKey!));
 const interaction={id:'60001',application_id:'12345',type:5,token:'reply-token',guild_id:'22222',channel_id:'44444',member:{user:{id:'55555'}},data:{custom_id:`ent:${delivery.id}:submit`,components:[{components:[{custom_id:'body',value:'Thanks, working on this 👋'}]}]}};
 await applyDiscordAction(interaction);await applyDiscordAction(interaction);assert.equal((await db.select().from(comments).where(eq(comments.feedbackId,post.id))).length,1);
 await assert.rejects(()=>applyDiscordAction({...interaction,id:'60002',member:{user:{id:'99999'}}}));await assert.rejects(()=>discordActor({...interaction,guild_id:'99999'}));
 const status={...interaction,id:'60003',type:3,message:{id:delivery.messageId},data:{custom_id:`ent:${delivery.id}:shipped`}};await applyDiscordAction(status);assert.equal((await db.select().from(feedback).where(eq(feedback.id,post.id)))[0].status,'shipped');await assert.rejects(()=>discordActor({...status,message:{id:'wrong'}}));
 const [conv]=await db.insert(conversations).values({workspaceId:workspace.id,tokenHash:randomUUID(),status:'open',preview:'Hello'}).returning();
 const [chatDelivery]=await db.insert(discordDeliveries).values({workspaceId:workspace.id,connectionId:discord.id,eventKey:'chat-test',messageId:'70001',channelId:'44444',conversationId:conv.id}).returning();
 const chatReply={...interaction,id:'60004',data:{...interaction.data,custom_id:`ent:${chatDelivery.id}:submit`}};await applyDiscordAction(chatReply);assert.equal((await db.select().from(chatMessages).where(eq(chatMessages.conversationId,conv.id))).length,1);
 await db.insert(chatSettings).values({workspaceId:workspace.id,operations:operationsSchema.parse({allOperators:false,operatorIds:[]})});await assert.rejects(()=>applyDiscordAction({...chatReply,id:'60005'}));
 const ping='{"type":1}',ts=String(Math.floor(Date.now()/1000)),sig=sign(null,Buffer.from(ts+ping),pair.privateKey).toString('hex');assert.deepEqual(await (await discordWebhook(new Request('https://ent.test',{method:'POST',body:ping,headers:{'x-signature-timestamp':ts,'x-signature-ed25519':sig}}))).json(),{type:1});assert.equal((await discordWebhook(new Request('https://ent.test',{method:'POST',body:ping}))).status,401);
 const safe=await loadConnectedAppsAction(workspace.id);assert.ok(safe.ok);assert.equal(JSON.stringify(safe).includes('accessToken'),false);assert.equal(JSON.stringify(safe).includes('encryptedCredentials'),false);
 const rls=await db.execute(sql`select count(*)::int as n from pg_class where relrowsecurity and relname in ('connected_apps','linear_issue_links','discord_identities','discord_deliveries') and relnamespace=(select oid from pg_namespace where nspname=current_schema())`);assert.equal(rls.rows[0].n,4);
 // Revocation disables only the matching organization.
 const revoke={...linearJob,payload:{kind:'linear_event',event:{organizationId:externalId,type:'OAuthApp',action:'revoked'}}};await deliverIntegrationJob(revoke);assert.equal((await db.select().from(connectedApps).where(eq(connectedApps.id,linear.id)))[0].connected,false);
 global.chatEnv.LINEAR_ENABLED='false';global.chatEnv.DISCORD_ENABLED='false';assert.equal((await processIntegrationJobs()).disabled,true);
 assert.equal((await db.select().from(linearIssueLinks)).length,1);assert.ok(unseal(linear.encryptedCredentials!,key,workspace.id+':linear'));
 console.log('PASS: launch gates, migration/RLS, Linear create/link deduplication and webhook status sync, scoped authorization, Discord delivery retry/deduplication, replies, statuses, operator restrictions, signed ping, credential redaction and revocation.');
}

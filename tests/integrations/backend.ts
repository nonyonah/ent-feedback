import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {eq,sql} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {users,workspaces,workspaceMembers,boards,feedback,connectedApps,linearIssueLinks,jobs} from '@/server/db/schema';
import {seal,unseal} from '@/server/integration-crypto';
import {loadConnectedAppsAction,connectAppAction,loadLinearOptionsAction,linkFeedbackLinearAction,saveConnectedAppSettingsAction} from '@/server/actions/connected-apps';
import {linearToken,createOrLinkIssue} from '@/server/connected-apps/linear';
import {deliverIntegrationJob,processIntegrationJobs} from '@/server/connected-apps/worker';
import {POST as linearWebhook} from '@/app/api/integrations/linear/events/route';
import {POST as discordWebhook} from '@/app/api/integrations/discord/interactions/route';
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
 const states={open:randomUUID(),planned:randomUUID(),'in-progress':randomUUID(),shipped:randomUUID()},teamId=randomUUID(),externalId=randomUUID(),key=global.chatEnv.INTEGRATION_ENCRYPTION_KEY!;
 const [linear]=await db.insert(connectedApps).values({workspaceId:workspace.id,provider:'linear',externalId,label:'Linear',settings:{teamId,states},encryptedCredentials:seal({accessToken:'test-token',refreshToken:'test-refresh',expiresAt:Date.now()+3600000},key,workspace.id+':linear'),createdByUserId:owner.id}).returning();
 let refreshes=0;let created=0,currentState=states.planned,issueId='';
 global.fetch=async(input,init)=>{
 const url=String(input);
 if(url==='https://api.linear.app/oauth/token'){refreshes++;return Response.json({access_token:'renewed-token',refresh_token:'renewed-refresh',expires_in:86400});}
 const body=JSON.parse(String(init?.body??'{}'));

 if(url==='https://api.linear.app/graphql'){
 if(body.query.includes('EntTeams'))return Response.json({data:{teams:{nodes:[{id:teamId,name:'Engineering',states:{nodes:Object.values(states).map((id,index)=>({id,name:'State '+index,type:'started'})),pageInfo:{hasNextPage:false,endCursor:null}}}],pageInfo:{hasNextPage:false,endCursor:null}}}});
 if(body.query.includes('organization'))return Response.json({data:{organization:{id:externalId,name:'Linear'}}});
 if(body.query.includes('issues(filter'))return Response.json({data:{issues:{nodes:[]}}});
 if(body.query.includes('issueCreate')){created++;issueId=body.variables.input.id;return Response.json({data:{issueCreate:{success:true,issue:{id:issueId,identifier:'ENT-1',url:'https://linear.app/test/issue/ENT-1',team:{id:teamId},state:{id:currentState},updatedAt:new Date().toISOString()}}}});}
 if(body.query.includes('issue(id:'))return Response.json({data:{issue:{id:issueId,identifier:'ENT-1',url:'https://linear.app/test/issue/ENT-1',team:{id:teamId},state:{id:currentState},updatedAt:new Date().toISOString()}}});
 throw Error('Unexpected Linear operation');
 }
 throw Error('Unexpected network request');
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
 const options=await loadLinearOptionsAction(workspace.id);assert.ok(options.ok);assert.equal(options.data[0].id,teamId);
 assert.equal((await discordWebhook(new Request('https://ent.test',{method:'POST',body:'{}'}))).status,404);
 assert.equal((await connectAppAction({workspaceId:workspace.id,provider:'discord'})).ok,false);
 const safe=await loadConnectedAppsAction(workspace.id);assert.ok(safe.ok);assert.equal(safe.data.enabled.discord,false);assert.equal(JSON.stringify(safe).includes('accessToken'),false);assert.equal(JSON.stringify(safe).includes('encryptedCredentials'),false);
 const rls=await db.execute(sql`select count(*)::int as n from pg_class where relrowsecurity and relname in ('connected_apps','linear_issue_links','discord_identities','discord_deliveries') and relnamespace=(select oid from pg_namespace where nspname=current_schema())`);assert.equal(rls.rows[0].n,4);
 // Revocation disables only the matching organization.
 const revoke={...linearJob,payload:{kind:'linear_event',event:{organizationId:externalId,type:'OAuthApp',action:'revoked'}}};await deliverIntegrationJob(revoke);assert.equal((await db.select().from(connectedApps).where(eq(connectedApps.id,linear.id)))[0].connected,false);
 global.chatEnv.LINEAR_ENABLED='false';global.chatEnv.DISCORD_ENABLED='false';assert.equal((await processIntegrationJobs()).disabled,true);
 assert.equal((await db.select().from(linearIssueLinks)).length,1);assert.ok(unseal(linear.encryptedCredentials!,key,workspace.id+':linear'));
 console.log('PASS: launch gates, migration/RLS, Linear team loading, issue linking, webhook sync, scoped authorization, Discord shutdown, credential redaction and revocation.');
}

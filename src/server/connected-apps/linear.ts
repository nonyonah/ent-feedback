import 'server-only';
import {and,eq,isNull,sql} from 'drizzle-orm';
import {z} from 'zod';
import {getDb,type Transaction} from '@/server/db/client';
import {connectedApps,linearIssueLinks,feedback,statusHistory,workspaces,workspaceMembers} from '@/server/db/schema';
import {getServerEnv} from '@/server/env';
import {seal,unseal} from '@/server/integration-crypto';
import {ServiceError} from '@/server/result';
import {linearSettingsSchema,linearDestination} from '@/lib/connected-apps';
import {publishActivity} from '@/server/activity';
import {appConfig,appFetch} from './config';
import {externalRequestId} from './security';
export const linearCredentials=z.object({accessToken:z.string().min(1),refreshToken:z.string().min(1),expiresAt:z.number()});
export const linearIssueSchema=z.object({id:z.uuid(),identifier:z.string().max(100),url:z.string().refine(v=>Boolean(linearDestination(v))),team:z.object({id:z.uuid()}),state:z.object({id:z.uuid()}),updatedAt:z.string().datetime()});
export async function linearGraph<T>(token:string,query:string,variables:Record<string,unknown>={}){
 const response=await appFetch('https://api.linear.app/graphql',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query,variables})});
 const body=await response.json() as {data?:T;errors?:unknown[]};if(body.errors?.length||!body.data)throw new ServiceError('retryable','Linear could not confirm the request.');return body.data;
}
/** Serialize rotating refresh credentials per connection; never expose credentials to clients. */
export async function linearToken(connectionId:string){return getDb().transaction(async tx=>{
 const [c]=await tx.select().from(connectedApps).where(and(eq(connectedApps.id,connectionId),eq(connectedApps.provider,'linear'),eq(connectedApps.connected,true))).for('update');if(!c?.encryptedCredentials)throw new ServiceError('conflict','Reconnect Linear to continue.');
 const config=appConfig('linear'),context=c.workspaceId+':linear';let secret=linearCredentials.parse(unseal(c.encryptedCredentials,config.key,context));
 if(secret.expiresAt<Date.now()+120000){const response=await appFetch('https://api.linear.app/oauth/token',{method:'POST',body:new URLSearchParams({grant_type:'refresh_token',refresh_token:secret.refreshToken,client_id:config.id,client_secret:config.secret})});const token=z.object({access_token:z.string().min(1),refresh_token:z.string().min(1),expires_in:z.number().positive()}).parse(await response.json());secret={accessToken:token.access_token,refreshToken:token.refresh_token,expiresAt:Date.now()+token.expires_in*1000};await tx.update(connectedApps).set({encryptedCredentials:seal(secret,config.key,context)}).where(eq(connectedApps.id,c.id));}return {connection:c,token:secret.accessToken};
 });}
type LinearState={id:string;name:string;type:string};
type LinearTeam={id:string;name:string;states:{nodes:LinearState[];pageInfo:{hasNextPage:boolean;endCursor:string|null}}};
type PageInfo={hasNextPage:boolean;endCursor:string|null};
/** Small pages keep the nested query below Linear's per-request complexity limit. */
export async function loadLinearTeams(token:string){
 const teams:LinearTeam[]=[];let after:string|null=null;
 for(let page=0;page<100;page++){
  const result:{teams:{nodes:LinearTeam[];pageInfo:PageInfo}}=await linearGraph<{teams:{nodes:LinearTeam[];pageInfo:PageInfo}}>(token,'query EntTeams($after:String){teams(first:10,after:$after){nodes{id name states(first:50){nodes{id name type} pageInfo{hasNextPage endCursor}}} pageInfo{hasNextPage endCursor}}}',{after});
  teams.push(...result.teams.nodes);if(!result.teams.pageInfo.hasNextPage)break;
  const next:string|null=result.teams.pageInfo.endCursor;if(!next||next===after||page===99)throw new ServiceError('retryable','Linear teams could not be loaded. Please try again.');after=next;
 }
 for(const team of teams){let info=team.states.pageInfo;for(let page=0;info.hasNextPage;page++){
  if(!info.endCursor||page>=100)throw new ServiceError('retryable','Linear states could not be loaded. Please try again.');
  const result=await linearGraph<{team:{states:{nodes:LinearState[];pageInfo:PageInfo}}}>(token,'query EntTeamStates($id:String!,$after:String){team(id:$id){states(first:50,after:$after){nodes{id name type} pageInfo{hasNextPage endCursor}}}}',{id:team.id,after:info.endCursor});
  if(result.team.states.pageInfo.hasNextPage&&result.team.states.pageInfo.endCursor===info.endCursor)throw new ServiceError('retryable','Linear states could not be loaded. Please try again.');
  team.states.nodes.push(...result.team.states.nodes);info=result.team.states.pageInfo;
 }}
 return teams.map(({id,name,states})=>({id,name,states:{nodes:states.nodes}}));
}
const issueFields='id identifier url team { id } state { id } updatedAt';
export async function createOrLinkIssue(input:{connectionId:string;workspaceId:string;feedbackId:string;existing?:string}){
 const {connection,token}=await linearToken(input.connectionId);if(connection.workspaceId!==input.workspaceId)throw new ServiceError('forbidden','Connection not available.');const settings=linearSettingsSchema.parse(connection.settings),db=getDb();
 return db.transaction(async tx=>{
 await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${input.feedbackId+':linear'},0))`);
 const [active]=await tx.select().from(connectedApps).where(and(eq(connectedApps.id,connection.id),eq(connectedApps.connected,true))).for('update');if(!active||active.updatedAt.getTime()!==connection.updatedAt.getTime())throw new ServiceError('conflict','Linear settings changed. Please try again.');
 const [post]=await tx.select().from(feedback).where(and(eq(feedback.id,input.feedbackId),eq(feedback.workspaceId,input.workspaceId),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId))).limit(1);if(!post)throw new ServiceError('not_found','Feedback not found.');
 const [linked]=await tx.select().from(linearIssueLinks).where(and(eq(linearIssueLinks.connectionId,connection.id),eq(linearIssueLinks.feedbackId,post.id)));if(linked)return {identifier:linked.identifier,url:linked.url};
 let issue: z.infer<typeof linearIssueSchema>;
 if(input.existing){const result=await linearGraph<{issue:unknown}>(token,`query($id:String!){issue(id:$id){${issueFields}}}`,{id:input.existing});issue=linearIssueSchema.parse(result.issue);}
 else{
 // Stable provider ID makes retries safe even when a successful response was lost.
 const id=externalRequestId(connection.id+':'+post.id);const found=await linearGraph<{issues:{nodes:unknown[]}}>(token,`query($id:ID!){issues(filter:{id:{eq:$id}},first:1){nodes{${issueFields}}}}`,{id});
 if(found.issues.nodes[0])issue=linearIssueSchema.parse(found.issues.nodes[0]);else{
 const [workspace]=await tx.select({handle:workspaces.handle}).from(workspaces).where(eq(workspaces.id,input.workspaceId));const url=new URL(`/${workspace.handle}/items/${post.id}`,getServerEnv().NEXT_PUBLIC_APP_URL).href;
 const result=await linearGraph<{issueCreate:{success:boolean;issue:unknown}}>(token,`mutation($input:IssueCreateInput!){issueCreate(input:$input){success issue{${issueFields}}}}`,{input:{id,teamId:settings.teamId,stateId:settings.states[post.status],title:post.title,description:post.body+'\n\nEnt feedback: '+url}});if(!result.issueCreate.success)throw new ServiceError('retryable','Linear did not create the issue.');issue=linearIssueSchema.parse(result.issueCreate.issue);
 }}
 if(issue.team.id!==settings.teamId)throw new ServiceError('validation','Choose an issue from the connected Linear team.');
 await tx.insert(linearIssueLinks).values({workspaceId:input.workspaceId,connectionId:connection.id,feedbackId:post.id,issueId:issue.id,identifier:issue.identifier,url:issue.url}).onConflictDoNothing();
 const [saved]=await tx.select().from(linearIssueLinks).where(and(eq(linearIssueLinks.connectionId,connection.id),eq(linearIssueLinks.feedbackId,post.id)));if(!saved)throw new ServiceError('conflict','That Linear issue is already linked to another feedback item.');return {identifier:saved.identifier,url:saved.url};
 });
}
export async function syncLinearIssue(tx:Transaction,connection:typeof connectedApps.$inferSelect,issue:z.infer<typeof linearIssueSchema>,eventId:string){
 const parsed=linearSettingsSchema.safeParse(connection.settings);if(!parsed.success||issue.team.id!==parsed.data.teamId)return;
 const status=(Object.keys(parsed.data.states) as (keyof typeof parsed.data.states)[]).find(key=>parsed.data.states[key]===issue.state.id);if(!status)return;
 const [link]=await tx.select().from(linearIssueLinks).where(and(eq(linearIssueLinks.connectionId,connection.id),eq(linearIssueLinks.issueId,issue.id))).limit(1);if(!link)return;
 if(link.syncedAt&&link.syncedAt.getTime()>=Date.parse(issue.updatedAt))return;
 // Same lock order as all other roadmap status writes.
 await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${connection.workspaceId+':roadmap'},0))`);
 const [post]=await tx.select().from(feedback).where(and(eq(feedback.id,link.feedbackId),eq(feedback.workspaceId,connection.workspaceId),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId))).for('update');if(!post)return;
 if(post.status===status){await tx.update(linearIssueLinks).set({syncedAt:new Date(issue.updatedAt)}).where(eq(linearIssueLinks.id,link.id));return;}
 const [owner]=await tx.select({id:workspaceMembers.userId}).from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId,connection.workspaceId),eq(workspaceMembers.role,'owner'),eq(workspaceMembers.status,'active'))).limit(1);if(!owner)return;
 await tx.update(feedback).set({status,updatedAt:new Date()}).where(eq(feedback.id,post.id));await tx.insert(statusHistory).values({workspaceId:connection.workspaceId,feedbackId:post.id,previousStatus:post.status,newStatus:status,actorUserId:owner.id});
 await tx.update(linearIssueLinks).set({syncedAt:new Date(issue.updatedAt),updatedAt:new Date()}).where(eq(linearIssueLinks.id,link.id));
 await publishActivity(tx,{type:'status_changed',workspaceId:connection.workspaceId,feedbackId:post.id,eventId,systemUpdate:true});
}

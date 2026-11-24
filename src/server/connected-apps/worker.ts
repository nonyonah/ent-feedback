import 'server-only';
import {and,eq,lte,lt,asc,sql} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {jobs,connectedApps,linearIssueLinks} from '@/server/db/schema';
import {appEnabled} from './config';
import {linearToken,linearGraph,linearIssueSchema,syncLinearIssue,pushLinearStatus,createOrLinkIssue} from './linear';
import {applyDiscordAction,deliverDiscord,discordInteraction} from './discord';
import {getServerEnv} from '@/server/env';
import {unseal} from '@/server/integration-crypto';
const linearEvent=z.object({organizationId:z.string(),type:z.string(),action:z.string(),data:z.object({id:z.string()}).passthrough().optional()});
export async function deliverIntegrationJob(job:typeof jobs.$inferSelect){
 const kind=job.payload.kind;
 if(kind==='discord_outbound'){if(appEnabled('discord'))await deliverDiscord(job.payload,job.dedupeKey??job.id);return;}
 if(kind==='discord_action'){
 if(!appEnabled('discord'))return;const key=getServerEnv().INTEGRATION_ENCRYPTION_KEY;if(!key)throw Error('Configuration missing');const p=discordInteraction.parse(unseal(z.string().parse(job.payload.sealed),key,'discord-interaction:'+job.dedupeKey));
 if(Number(job.payload.expires)<Date.now())throw Error('Interaction expired');
 try{await applyDiscordAction(p);}catch(error){
 await fetch(`https://discord.com/api/v10/webhooks/${getServerEnv().DISCORD_CLIENT_ID}/${encodeURIComponent(p.token)}/messages/@original`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:'The update could not be completed. Check your Ent workspace membership and operator access, then try again.',allowed_mentions:{parse:[]}}),redirect:'error',signal:AbortSignal.timeout(5000)}).catch(()=>{});throw error;
 }
 // Only a fixed Discord URL; interaction tokens remain encrypted in the job.
 const response=await fetch(`https://discord.com/api/v10/webhooks/${getServerEnv().DISCORD_CLIENT_ID}/${encodeURIComponent(p.token)}/messages/@original`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:'Updated in Ent.',allowed_mentions:{parse:[]}}),redirect:'error',signal:AbortSignal.timeout(5000)});if(!response.ok&&response.status!==404)throw Error('Confirmation unavailable');return;
 }
 if(kind==='linear_create'){if(appEnabled('linear')){const connectionId=z.uuid().parse(job.payload.connectionId),workspaceId=z.uuid().parse(job.payload.workspaceId),feedbackId=z.uuid().parse(job.payload.feedbackId);const [connection]=await getDb().select().from(connectedApps).where(and(eq(connectedApps.id,connectionId),eq(connectedApps.workspaceId,workspaceId),eq(connectedApps.connected,true))).limit(1);if(connection&&connection.settings.autoCreate===true)await createOrLinkIssue({connectionId,workspaceId,feedbackId});}return;}
 if(kind==='linear_status'){if(appEnabled('linear'))await pushLinearStatus(z.uuid().parse(job.payload.connectionId),z.uuid().parse(job.payload.workspaceId),z.uuid().parse(job.payload.feedbackId));return;}
 if(kind==='linear_event'){
 if(!appEnabled('linear'))return;const p=linearEvent.parse(job.payload.event),db=getDb();const connections=await db.select().from(connectedApps).where(and(eq(connectedApps.provider,'linear'),eq(connectedApps.externalId,p.organizationId),eq(connectedApps.connected,true)));
 for(const c of connections){
 if(p.type==='OAuthApp'&&p.action==='revoked'){await db.update(connectedApps).set({connected:false,encryptedCredentials:null,updatedAt:new Date()}).where(eq(connectedApps.id,c.id));continue;}
 if(p.type!=='Issue'||!p.data?.id||p.action==='remove')continue;
 const [link]=await db.select().from(linearIssueLinks).where(and(eq(linearIssueLinks.connectionId,c.id),eq(linearIssueLinks.issueId,p.data.id))).limit(1);if(!link)continue;
 const token=(await linearToken(c.id)).token;
 // Fetch current provider state: delayed/reordered events cannot roll an item back.
 const result=await linearGraph<{issue:unknown}>(token,'query($id:String!){issue(id:$id){id identifier url team{id} state{id} updatedAt}}',{id:p.data.id});if(!result.issue)continue;const issue=linearIssueSchema.parse(result.issue);
 await db.transaction(async tx=>{const [active]=await tx.select().from(connectedApps).where(and(eq(connectedApps.id,c.id),eq(connectedApps.connected,true))).for('update');if(active)await syncLinearIssue(tx,active,issue,job.id);});
 }return;
 }
 throw Error('Unsupported integration job');
}
export async function processIntegrationJobs(limit=1){
 // No migrations/queries are needed on existing deployments while both are off.
 if(!appEnabled('linear')&&!appEnabled('discord'))return {succeeded:0,retried:0,disabled:true};
 const db=getDb(),now=new Date();const claimed=await db.transaction(async tx=>{
 const stale=and(eq(jobs.type,'integration_delivery'),eq(jobs.status,'running'),lt(jobs.lockedAt,new Date(now.getTime()-180000)));
 await tx.update(jobs).set({status:'failed',lockedAt:null,lastError:'Integration lease expired'}).where(and(stale,sql`${jobs.attempts}>=${jobs.maxAttempts}`));
 await tx.update(jobs).set({status:'pending',lockedAt:null}).where(and(stale,sql`${jobs.attempts}<${jobs.maxAttempts}`));
 const rows=await tx.select().from(jobs).where(and(eq(jobs.type,'integration_delivery'),eq(jobs.status,'pending'),lte(jobs.runAt,now),sql`${jobs.attempts}<${jobs.maxAttempts}`)).orderBy(sql`case when ${jobs.payload}->>'kind'='discord_action' then 0 when ${jobs.payload}->>'kind'='linear_event' then 1 else 2 end`,asc(jobs.runAt)).limit(Math.min(2,Math.max(1,limit))).for('update',{skipLocked:true});
 for(const row of rows)await tx.update(jobs).set({status:'running',lockedAt:now,attempts:row.attempts+1,updatedAt:now}).where(eq(jobs.id,row.id));return rows;
 });let succeeded=0,retried=0;
 for(const job of claimed){const owned=and(eq(jobs.id,job.id),eq(jobs.status,'running'),eq(jobs.lockedAt,now));try{await deliverIntegrationJob(job);await db.update(jobs).set({status:'succeeded',lockedAt:null,lastError:null,updatedAt:new Date()}).where(owned);succeeded++;}catch{await db.update(jobs).set({status:job.attempts+1>=job.maxAttempts?'failed':'pending',lockedAt:null,runAt:new Date(Date.now()+Math.min(3600000,30000*2**job.attempts)),lastError:'Integration request could not be confirmed',updatedAt:new Date()}).where(owned);retried++;}}
 return {succeeded,retried};
}

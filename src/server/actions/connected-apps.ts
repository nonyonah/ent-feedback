'use server';
import {and,eq} from 'drizzle-orm';
import {z} from 'zod';
import {connectedProviderSchema,linearSettingsSchema,discordSettingsSchema} from '@/lib/connected-apps';
import {getDb} from '@/server/db/client';
import {connectedApps,linearIssueLinks} from '@/server/db/schema';
import {requireAppUser} from '@/server/auth';
import {requireWorkspaceRole} from '@/server/services/access';
import {runService,ServiceError} from '@/server/result';
import {appEnabled,requireAppEnabled} from '@/server/connected-apps/config';
import {startAppOAuth,disconnectApp} from '@/server/connected-apps/oauth';
import {loadLinearTeams,linearToken,createOrLinkIssue} from '@/server/connected-apps/linear';
export async function loadConnectedAppsAction(workspaceId:string){return runService(async()=>{
 z.uuid().parse(workspaceId);const user=await requireAppUser(),db=getDb();const membership=await requireWorkspaceRole(db,{workspaceId,userId:user.id,minimumRole:'member'});
 const enabled={linear:appEnabled('linear'),discord:appEnabled('discord')};
 // No DB migration/configuration dependency until a launch gate is enabled.
 const rows=enabled.linear||enabled.discord?await db.select({provider:connectedApps.provider,label:connectedApps.label,connected:connectedApps.connected,settings:connectedApps.settings}).from(connectedApps).where(eq(connectedApps.workspaceId,workspaceId)):[];
 return {enabled,connections:rows,canManage:membership.role!=='member'};
});}
export async function connectAppAction(input:unknown){return runService(async()=>{const p=z.object({provider:connectedProviderSchema,workspaceId:z.uuid(),identity:z.boolean().default(false)}).parse(input);return startAppOAuth(p.provider,p.workspaceId,p.identity);});}
export async function disconnectAppAction(input:unknown){return runService(async()=>{const p=z.object({provider:connectedProviderSchema,workspaceId:z.uuid()}).parse(input);await disconnectApp(p.provider,p.workspaceId);});}
export async function loadLinearOptionsAction(workspaceId:string){return runService(async()=>{
 requireAppEnabled('linear');z.uuid().parse(workspaceId);const user=await requireAppUser(),db=getDb();await requireWorkspaceRole(db,{workspaceId,userId:user.id,minimumRole:'admin'});
 const [c]=await db.select().from(connectedApps).where(and(eq(connectedApps.workspaceId,workspaceId),eq(connectedApps.provider,'linear'),eq(connectedApps.connected,true)));if(!c)throw new ServiceError('not_found','Connect Linear first.');
 return loadLinearTeams((await linearToken(c.id)).token);
});}
export async function saveConnectedAppSettingsAction(input:unknown){return runService(async()=>{
 const p=z.object({workspaceId:z.uuid(),provider:connectedProviderSchema,settings:z.unknown()}).parse(input);requireAppEnabled(p.provider);const user=await requireAppUser(),db=getDb();await requireWorkspaceRole(db,{workspaceId:p.workspaceId,userId:user.id,minimumRole:'admin'});
 const value=p.provider==='linear'?linearSettingsSchema.parse(p.settings):discordSettingsSchema.parse(p.settings);
 if(p.provider==='linear'){const value=linearSettingsSchema.parse(p.settings);const options=await loadLinearOptionsAction(p.workspaceId);if(!options.ok)throw new ServiceError('retryable','Linear teams could not be loaded.');const team=options.data.find(t=>t.id===value.teamId);if(!team||Object.values(value.states).some(id=>!team.states.nodes.some(s=>s.id===id)))throw new ServiceError('validation','Choose states from the selected Linear team.');}
 await db.update(connectedApps).set({settings:value,updatedAt:new Date()}).where(and(eq(connectedApps.workspaceId,p.workspaceId),eq(connectedApps.provider,p.provider),eq(connectedApps.connected,true)));
});}
export async function loadFeedbackLinearLinkAction(workspaceId:string,feedbackId:string){return runService(async()=>{
 z.uuid().parse(workspaceId);z.uuid().parse(feedbackId);if(!appEnabled('linear'))return {available:false,link:null};const user=await requireAppUser(),db=getDb();await requireWorkspaceRole(db,{workspaceId,userId:user.id,minimumRole:'member'});
 const [c]=await db.select().from(connectedApps).where(and(eq(connectedApps.workspaceId,workspaceId),eq(connectedApps.provider,'linear'),eq(connectedApps.connected,true)));if(!c)return {available:false,link:null};
 const [link]=await db.select({identifier:linearIssueLinks.identifier,url:linearIssueLinks.url}).from(linearIssueLinks).where(and(eq(linearIssueLinks.workspaceId,workspaceId),eq(linearIssueLinks.feedbackId,feedbackId),eq(linearIssueLinks.connectionId,c.id)));return {available:linearSettingsSchema.safeParse(c.settings).success,link:link??null};
});}
export async function linkFeedbackLinearAction(input:unknown){return runService(async()=>{
 const p=z.object({workspaceId:z.uuid(),feedbackId:z.uuid(),existing:z.string().trim().regex(/^(?:[A-Z][A-Z0-9]*-\d+|[a-f0-9-]{36})$/).optional()}).parse(input);requireAppEnabled('linear');const db=getDb(),user=await requireAppUser();await requireWorkspaceRole(db,{workspaceId:p.workspaceId,userId:user.id,minimumRole:'member'});
 const [c]=await db.select().from(connectedApps).where(and(eq(connectedApps.workspaceId,p.workspaceId),eq(connectedApps.provider,'linear'),eq(connectedApps.connected,true)));if(!c)throw new ServiceError('not_found','Connect Linear first.');linearSettingsSchema.parse(c.settings);
 return createOrLinkIssue({connectionId:c.id,workspaceId:p.workspaceId,feedbackId:p.feedbackId,existing:p.existing});
});}

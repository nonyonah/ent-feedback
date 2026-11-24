import 'server-only';
import {and,eq} from 'drizzle-orm';
import type {Queryable} from '@/server/db/client';
import {connectedApps,linearIssueLinks,jobs} from '@/server/db/schema';
import {appEnabled} from './config';
import {linearSettingsSchema} from '@/lib/connected-apps';
export async function enqueueDiscord(tx:Queryable,input:{workspaceId:string;event:string;eventId:string;feedbackId?:string;conversationId?:string}){
 if(!appEnabled('discord'))return;
 const [c]=await tx.select().from(connectedApps).where(and(eq(connectedApps.workspaceId,input.workspaceId),eq(connectedApps.provider,'discord'),eq(connectedApps.connected,true))).limit(1);if(!c)return;
 await tx.insert(jobs).values({type:'integration_delivery',dedupeKey:`discord:${c.id}:${input.event}:${input.eventId}`,payload:{kind:'discord_outbound',...input,connectionId:c.id,version:c.updatedAt.toISOString()}}).onConflictDoNothing();
}

export async function enqueueLinearStatus(tx:Queryable,input:{workspaceId:string;feedbackId:string;eventId:string}){
 if(!appEnabled('linear'))return;
 const [link]=await tx.select({connectionId:connectedApps.id}).from(connectedApps).innerJoin(linearIssueLinks,and(eq(linearIssueLinks.connectionId,connectedApps.id),eq(linearIssueLinks.workspaceId,connectedApps.workspaceId))).where(and(eq(connectedApps.workspaceId,input.workspaceId),eq(connectedApps.provider,'linear'),eq(connectedApps.connected,true),eq(linearIssueLinks.feedbackId,input.feedbackId))).limit(1);
 if(!link)return;
 await tx.insert(jobs).values({type:'integration_delivery',dedupeKey:`linear:status:${link.connectionId}:${input.eventId}`,payload:{kind:'linear_status',workspaceId:input.workspaceId,feedbackId:input.feedbackId,connectionId:link.connectionId}}).onConflictDoNothing();
}

export async function enqueueLinearCreate(tx:Queryable,input:{workspaceId:string;feedbackId:string}){
 if(!appEnabled('linear'))return;
 const [connection]=await tx.select({id:connectedApps.id,settings:connectedApps.settings}).from(connectedApps).where(and(eq(connectedApps.workspaceId,input.workspaceId),eq(connectedApps.provider,'linear'),eq(connectedApps.connected,true))).limit(1);
 const settings=linearSettingsSchema.safeParse(connection?.settings);if(!connection||!settings.success||!settings.data.autoCreate)return;
 await tx.insert(jobs).values({type:'integration_delivery',dedupeKey:`linear:create:${connection.id}:${input.feedbackId}`,payload:{kind:'linear_create',workspaceId:input.workspaceId,feedbackId:input.feedbackId,connectionId:connection.id}}).onConflictDoNothing();
}

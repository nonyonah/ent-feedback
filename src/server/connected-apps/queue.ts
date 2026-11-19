import 'server-only';
import {and,eq} from 'drizzle-orm';
import type {Queryable} from '@/server/db/client';
import {connectedApps,jobs} from '@/server/db/schema';
import {appEnabled} from './config';
export async function enqueueDiscord(tx:Queryable,input:{workspaceId:string;event:string;eventId:string;feedbackId?:string;conversationId?:string}){
 if(!appEnabled('discord'))return;
 const [c]=await tx.select().from(connectedApps).where(and(eq(connectedApps.workspaceId,input.workspaceId),eq(connectedApps.provider,'discord'),eq(connectedApps.connected,true))).limit(1);if(!c)return;
 await tx.insert(jobs).values({type:'integration_delivery',dedupeKey:`discord:${c.id}:${input.event}:${input.eventId}`,payload:{kind:'discord_outbound',...input,connectionId:c.id,version:c.updatedAt.toISOString()}}).onConflictDoNothing();
}

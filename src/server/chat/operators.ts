import 'server-only';
import {eq} from 'drizzle-orm';
import type {Queryable} from '@/server/db/client';
import {chatSettings} from '@/server/db/schema';
import {findActiveWorkspaceMembership} from '@/server/services/access';
import {operationsSchema} from '@/lib/chat/availability';
import {ServiceError} from '@/server/result';

export async function canOperateChat(db:Queryable,workspaceId:string,userId:string){
 if(!await findActiveWorkspaceMembership(db,workspaceId,userId))return false;
 const [settings]=await db.select({operations:chatSettings.operations}).from(chatSettings).where(eq(chatSettings.workspaceId,workspaceId)).limit(1);
 const operations=operationsSchema.parse(settings?.operations??{});
 return operations.allOperators||operations.operatorIds.includes(userId);
}
export async function requireChatOperator(db:Queryable,workspaceId:string,userId:string){
 if(!await canOperateChat(db,workspaceId,userId))throw new ServiceError('forbidden','You are not selected as a live chat operator. Ask the workspace owner to update Conversations settings.');
}

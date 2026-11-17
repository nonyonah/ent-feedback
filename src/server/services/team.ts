import 'server-only';
import {and,eq} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {workspaceMembers,workspaces,chatSettings} from '@/server/db/schema';
import {requireWorkspaceRole} from './access';
import {operationsSchema} from '@/lib/chat/availability';
import {ServiceError} from '@/server/result';
import {requireFeature} from '@/server/features';

export async function removeWorkspaceMember(input:{workspaceId:string;memberId:string;userId:string}){
 requireFeature('teams');z.uuid().parse(input.workspaceId);z.uuid().parse(input.memberId);
 await getDb().transaction(async tx=>{
  await tx.select({id:workspaces.id}).from(workspaces).where(eq(workspaces.id,input.workspaceId)).for('update');
  const actor=await requireWorkspaceRole(tx,{workspaceId:input.workspaceId,userId:input.userId,minimumRole:'admin'});
  const [member]=await tx.select().from(workspaceMembers).where(and(eq(workspaceMembers.id,input.memberId),eq(workspaceMembers.workspaceId,input.workspaceId),eq(workspaceMembers.status,'active'))).limit(1);
  if(!member)throw new ServiceError('not_found','This teammate is no longer in the workspace.');
  if(member.role==='owner'||member.userId===input.userId||member.role==='admin'&&actor.role!=='owner')throw new ServiceError('forbidden','You cannot remove this workspace member.');
  const [config]=await tx.select({operations:chatSettings.operations}).from(chatSettings).where(eq(chatSettings.workspaceId,input.workspaceId)).limit(1);
  if(config){const operations=operationsSchema.parse(config.operations);if(operations.operatorIds.includes(member.userId))await tx.update(chatSettings).set({operations:{...operations,operatorIds:operations.operatorIds.filter(id=>id!==member.userId)},updatedAt:new Date()}).where(eq(chatSettings.workspaceId,input.workspaceId));}
  await tx.update(workspaceMembers).set({status:'suspended',updatedAt:new Date()}).where(eq(workspaceMembers.id,member.id));
 });
}

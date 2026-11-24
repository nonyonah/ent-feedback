'use server';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {workspaceAiSettings} from '@/server/db/schema';
import {requireAppUser} from '@/server/auth';
import {requireWorkspaceRole} from '@/server/services/access';
import {aiProviderConfigured,readWorkspaceAiSettings} from '@/server/ai/settings';
import {runService,ServiceError} from '@/server/result';
import {features} from '@/lib/features';
const inputSchema=z.object({feedbackEnabled:z.boolean(),githubEnabled:z.boolean()}).strict();
export async function loadAiSettingsAction(workspaceId:string){return runService(async()=>{const wid=z.uuid().parse(workspaceId),user=await requireAppUser();const membership=await requireWorkspaceRole(getDb(),{workspaceId:wid,userId:user.id,minimumRole:'member'});return {settings:await readWorkspaceAiSettings(wid),configured:aiProviderConfigured(),canManage:membership.role!=='member'};});}
export async function saveAiSettingsAction(workspaceId:string,input:unknown){return runService(async()=>{const wid=z.uuid().parse(workspaceId),value=inputSchema.parse(input),user=await requireAppUser(),db=getDb();await requireWorkspaceRole(db,{workspaceId:wid,userId:user.id,minimumRole:'admin'});if(!features.feedbackAi&&(value.feedbackEnabled||value.githubEnabled))throw new ServiceError('conflict','AI features are currently unavailable.');if(value.githubEnabled)throw new ServiceError('conflict','AI-generated GitHub changelog drafts are not available yet.');if(value.feedbackEnabled&&!aiProviderConfigured())throw new ServiceError('conflict','AI is not configured on this server yet.');await db.insert(workspaceAiSettings).values({workspaceId:wid,...value,updatedByUserId:user.id}).onConflictDoUpdate({target:workspaceAiSettings.workspaceId,set:{...value,updatedByUserId:user.id,updatedAt:new Date()}});return value;});}

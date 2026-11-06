"use server";
import {requireFeature} from "@/server/features";
import {normalizeWorkspaceName} from "@/lib/workspace-domain";
import {clerkClient} from "@clerk/nextjs/server";
import {z} from "zod";
import {eq} from "drizzle-orm";
import {requireAppUser} from "@/server/auth";
import {getDb} from "@/server/db/client";
import {users} from "@/server/db/schema";
import {runService,ServiceError} from "@/server/result";
import {getRegistrationState} from "@/server/onboarding";
import {requireWorkspaceRole} from "@/server/services/access";
import {createWorkspaceAction} from "@/server/actions/workspaces";
const profileSchema=z.object({firstName:z.string().trim().min(1).max(80),lastName:z.string().trim().min(1).max(80)});
export async function saveRegistrationProfileAction(input:{firstName:string;lastName:string}){return runService(async()=>{const state=await getRegistrationState();const actor=state.user;const profile=profileSchema.parse(input);const client=await clerkClient();const user=await client.users.updateUser(actor.clerkUserId,profile);await getDb().update(users).set({name:[user.firstName,user.lastName].filter(Boolean).join(" "),avatarUrl:user.hasImage?user.imageUrl:null,updatedAt:new Date()}).where(eq(users.id,actor.id));await client.users.updateUserMetadata(actor.clerkUserId,{privateMetadata:{entOnboarding:{step:1,workspaceId:state.workspace?.id,complete:state.progress.complete}}});return {saved:true};});}
export async function createRegistrationWorkspaceAction(input:{name:string;handle:string;website?:string}){return runService(async()=>{const state=await getRegistrationState();if(state.workspace)return state.workspace;const existing=state.workspaces.find(workspace=>workspace.role==="owner"&&workspace.handle===input.handle&&normalizeWorkspaceName(workspace.name).toLowerCase()===normalizeWorkspaceName(input.name).toLowerCase());const result=existing?{ok:true as const,data:existing}:await createWorkspaceAction(input);if(!result.ok)throw new ServiceError(result.error.code,result.error.message,{fieldErrors:result.error.fieldErrors});const client=await clerkClient();await client.users.updateUserMetadata(state.user.clerkUserId,{privateMetadata:{entOnboarding:{step:2,workspaceId:result.data.id,complete:false}}});return result.data;});}
export async function advanceRegistrationAction(input:{workspaceId:string;step:3}){return runService(async()=>{requireFeature("integrations");const parsed=z.object({workspaceId:z.uuid(),step:z.literal(3)}).parse(input);const actor=await requireAppUser();await requireWorkspaceRole(getDb(),{workspaceId:parsed.workspaceId,userId:actor.id,minimumRole:"owner"});const client=await clerkClient();await client.users.updateUserMetadata(actor.clerkUserId,{privateMetadata:{entOnboarding:{step:parsed.step,workspaceId:parsed.workspaceId,complete:false}}});return {saved:true};});}
export async function completeRegistrationAction(workspaceId:string){return runService(async()=>{const id=z.uuid().parse(workspaceId);const actor=await requireAppUser();await requireWorkspaceRole(getDb(),{workspaceId:id,userId:actor.id,minimumRole:"owner"});const client=await clerkClient();await client.users.updateUserMetadata(actor.clerkUserId,{privateMetadata:{entOnboarding:{step:3,workspaceId:id,complete:true,completedAt:new Date().toISOString()}}});return {complete:true};});}

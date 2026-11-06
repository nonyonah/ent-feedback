import "server-only";
import {currentUser} from "@clerk/nextjs/server";
import {requireAppUser} from "@/server/auth";
import {listWorkspacesForUser} from "@/server/services/workspaces";
export type RegistrationProgress={step:number;workspaceId?:string;complete:boolean};
export async function getRegistrationState(){const user=await requireAppUser();const clerkUser=await currentUser();const raw=clerkUser?.privateMetadata.entOnboarding as Partial<RegistrationProgress>|undefined;const workspaces=await listWorkspacesForUser(user.id);const workspace=workspaces.find(workspace=>workspace.id===raw?.workspaceId&&workspace.role==="owner")??null;return {user,progress:{step:typeof raw?.step==="number"?Math.min(3,Math.max(0,raw.step)):0,workspaceId:workspace?.id,complete:raw?.complete===true},workspace,workspaces};}

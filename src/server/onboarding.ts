import "server-only";
import {currentUser} from "@clerk/nextjs/server";
import {eq,sql} from "drizzle-orm";
import {getDb} from "@/server/db/client";
import {lifecycleEmailState} from "@/server/db/schema";
import {requireAppUser} from "@/server/auth";
import {listWorkspacesForUser} from "@/server/services/workspaces";
export type RegistrationProgress={step:number;workspaceId?:string;complete:boolean};
export async function getRegistrationState(){
 const user=await requireAppUser();
 const clerkUser=await currentUser();
 const raw=clerkUser?.privateMetadata.entOnboarding as Partial<RegistrationProgress>|undefined;
 const workspaces=await listWorkspacesForUser(user.id);
 const workspace=workspaces.find(workspace=>workspace.id===raw?.workspaceId&&workspace.role==="owner")??null;
 await getDb().update(lifecycleEmailState).set({
  onboardingStartedAt:sql`coalesce(${lifecycleEmailState.onboardingStartedAt}, now())`,
  ...(raw?.complete===true||(!raw&&workspaces.length>0)?{onboardingCompletedAt:sql`coalesce(${lifecycleEmailState.onboardingCompletedAt}, now())`}:{}),
 }).where(eq(lifecycleEmailState.userId,user.id));
 return {user,progress:{step:typeof raw?.step==="number"?Math.min(3,Math.max(0,raw.step)):0,workspaceId:workspace?.id,complete:raw?.complete===true},workspace,workspaces};
}

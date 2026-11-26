"use server";

import {consumeRateLimit} from "@/server/rate-limit";
import {requireFeature} from "@/server/features";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {validNewWorkspaceDomain,normalizeWorkspaceName} from "@/lib/workspace-domain";
import { requireAppUser } from "@/server/auth";
import { and,eq,inArray,sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { attachments,billingCheckouts,chatUploads,changelogUploads,connectedApps,conversations,githubAppChangelogConnections,githubChangelogConnections,integrationConnections,jobs,workspaceSubscriptions,workspaces } from "@/server/db/schema";
import { requireWorkspaceRole } from "@/server/services/access";
import { runService,ServiceError } from "@/server/result";
import { verifyDeletionCheckouts } from "@/server/billing/deletion";
import { trackServerAnalytics } from "@/lib/analytics/server";
import {
  acceptInvitation,
  cancelInvitation,
  createInvitations,
  createWorkspaceForUser,
  createFirstWorkspaceForUser,
  checkWorkspaceAvailability,
} from "@/server/services/workspaces";

const handlePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const createWorkspaceSchema = z.object({
  name: z.string().transform(normalizeWorkspaceName).pipe(z.string().min(2, "Workspace name is too short.").max(60)),
  handle: z
    .string()
    .trim()
    .min(5, "Workspace domain must be at least 5 characters.")
    .max(40)
    .regex(handlePattern, "Use lowercase letters, numbers, and dashes.")
    .refine(validNewWorkspaceDomain,"Choose an available subdomain; this address is reserved."),
  website: z
    .string()
    .trim()
    .max(2048)
    .optional()
    .transform((value) => (value ? value : null))
    .refine(
      (value) => value === null || /^https?:\/\/[^\s]+$/i.test(value),
      "Enter a valid website, such as yoursite.com.",
    ),
});

export async function createWorkspaceAction(input: {
  name: string;
  handle: string;
  website?: string;
}) {
  const result = await runService(async () => {
    const user = await requireAppUser();
    const parsed = createWorkspaceSchema.safeParse(input);

    if (!parsed.success) {
      throw parsed.error;
    }

    const workspace = await createWorkspaceForUser({
      userId: user.id,
      name: parsed.data.name,
      handle: parsed.data.handle,
      website: parsed.data.website,
    });

    revalidatePath("/dashboard", "layout");
    return workspace;
  });

  return result;
}

/**
 * Create the account's first workspace. Idempotent: a repeated or concurrent
 * submission returns the workspace that already exists instead of creating a
 * second one. Use `createWorkspaceAction` for additional workspaces.
 */
export async function createFirstWorkspaceAction(input: {
  name: string;
  handle: string;
  website?: string;
}) {
  const result = await runService(async () => {
    const user = await requireAppUser();
    const parsed = createWorkspaceSchema.safeParse(input);

    if (!parsed.success) {
      throw parsed.error;
    }

    const workspace = await createFirstWorkspaceForUser({
      userId: user.id,
      name: parsed.data.name,
      handle: parsed.data.handle,
      website: parsed.data.website,
    });

    revalidatePath("/dashboard", "layout");
    return workspace;
  });

  return result;
}

const inviteMembersSchema = z.object({
  workspaceId: z.uuid(),
  emails: z.array(z.email()).min(1).max(10),
  role: z.literal("member"),
});

export async function inviteMembersAction(input: {
  workspaceId: string;
  emails: string[];
  role: "admin" | "member";
}) {
  const result = await runService(async () => {
    requireFeature("teams");
    const user = await requireAppUser();
    const parsed = inviteMembersSchema.safeParse(input);

    if (!parsed.success) {
      throw parsed.error;
    }

    const invitations = await createInvitations({
      workspaceId: parsed.data.workspaceId,
      inviterUserId: user.id,
      emails: parsed.data.emails,
      role: parsed.data.role,
    });

    trackServerAnalytics('team_invitation_sent',{}, {user});
    revalidatePath("/dashboard/settings/team");
    return invitations;
  });

  return result;
}

const cancelInvitationSchema = z.object({
  workspaceId: z.uuid(),
  invitationId: z.uuid(),
});

export async function cancelInvitationAction(input: {
  workspaceId: string;
  invitationId: string;
}) {
  const result = await runService(async () => {
    requireFeature("teams");
    const user = await requireAppUser();
    const parsed = cancelInvitationSchema.safeParse(input);

    if (!parsed.success) {
      throw parsed.error;
    }

    await cancelInvitation({
      workspaceId: parsed.data.workspaceId,
      invitationId: parsed.data.invitationId,
      userId: user.id,
    });

    revalidatePath("/dashboard/settings/team");
    return { cancelled: true };
  });

  return result;
}

export async function acceptInvitationAction(token: string) {
  return runService(async () => {
    requireFeature("teams");
    const user = await requireAppUser();
    await consumeRateLimit('team:accept:'+user.id,30,60);
    const result = await acceptInvitation({
      token,
      userId: user.id,
      userEmail: user.email,
    });

    revalidatePath("/dashboard", "layout");
    return result;
  });
}

export async function checkWorkspaceAvailabilityAction(input:{name:string;handle:string}){return runService(async()=>{const actor=await requireAppUser();await consumeRateLimit("workspace-availability:"+actor.id,60,60);const parsed=z.object({name:z.string().max(60),handle:z.string().max(40)}).parse(input);return checkWorkspaceAvailability(parsed.name,parsed.handle);});}

export async function removeWorkspaceMemberAction(input:{workspaceId:string;memberId:string}){
 return runService(async()=>{
  const actor=await requireAppUser();const value=z.object({workspaceId:z.uuid(),memberId:z.uuid()}).strict().parse(input);
  await consumeRateLimit('team:remove:'+actor.id,30,3600);
  const {removeWorkspaceMember}=await import('@/server/services/team');
  await removeWorkspaceMember({...value,userId:actor.id});
  trackServerAnalytics('team_member_removed',{}, {user:actor});
  revalidatePath('/dashboard/settings/team');return {removed:true};
 });
}

export async function deleteWorkspaceAction(input:{workspaceId:string;confirmation:string}){return runService(async()=>{
 const {workspaceId:wid,confirmation}=z.object({workspaceId:z.uuid(),confirmation:z.string().max(60)}).strict().parse(input),user=await requireAppUser(),db=getDb();
 await requireWorkspaceRole(db,{workspaceId:wid,userId:user.id,minimumRole:'owner'});await consumeRateLimit('workspace:delete:'+user.id,5,3600);
 const verifiedCheckouts=await verifyDeletionCheckouts(wid);
 await db.transaction(async tx=>{
  const [workspace]=await tx.select().from(workspaces).where(eq(workspaces.id,wid)).for('update');if(!workspace)throw new ServiceError('not_found','Workspace not found.');
  await requireWorkspaceRole(tx,{workspaceId:wid,userId:user.id,minimumRole:'owner'});
  if(confirmation!==workspace.name)throw new ServiceError('validation','Enter the workspace name exactly.');
  const [billing]=await tx.select().from(workspaceSubscriptions).where(eq(workspaceSubscriptions.workspaceId,wid)).limit(1);
  if(billing&&(['active','trialing','past_due','unpaid','paused'].includes(billing.status)||(billing.prepaidUntil&&billing.prepaidUntil>new Date())))throw new ServiceError('conflict','End your subscription or prepaid access before deleting this workspace.');
  const checkouts=await tx.select().from(billingCheckouts).where(and(eq(billingCheckouts.workspaceId,wid),inArray(billingCheckouts.status,['creating','open','expired'])));
  if(checkouts.length!==verifiedCheckouts.length||checkouts.some(row=>!verifiedCheckouts.some(verified=>verified.id===row.id&&verified.status===row.status&&verified.checkoutId===row.checkoutId&&verified.updatedAt.getTime()===row.updatedAt.getTime()&&verified.expiresAt.getTime()===row.expiresAt.getTime())))throw new ServiceError('conflict','Billing changed while verifying the checkout. Try again.');
  if(checkouts.length)await tx.update(billingCheckouts).set({status:'expired',checkoutUrl:null,updatedAt:new Date()}).where(and(eq(billingCheckouts.workspaceId,wid),inArray(billingCheckouts.status,['creating','open','expired'])));
  const [connected]=await tx.select({id:connectedApps.id}).from(connectedApps).where(and(eq(connectedApps.workspaceId,wid),eq(connectedApps.connected,true))).limit(1);
  const [integration]=await tx.select({id:integrationConnections.id}).from(integrationConnections).where(and(eq(integrationConnections.workspaceId,wid),eq(integrationConnections.authorizationState,'connected'))).limit(1);
  const [githubApp]=await tx.select({id:githubAppChangelogConnections.id}).from(githubAppChangelogConnections).where(eq(githubAppChangelogConnections.workspaceId,wid)).limit(1);
  const [githubHook]=await tx.select({id:githubChangelogConnections.id}).from(githubChangelogConnections).where(eq(githubChangelogConnections.workspaceId,wid)).limit(1);
  if(connected||integration||githubApp||githubHook)throw new ServiceError('conflict','Disconnect workspace integrations before deleting the workspace.');
  // Chat uploads reference conversations rather than the workspace directly.
  // Lock existing conversations before collecting keys so new uploads cannot race deletion.
  await tx.select({id:conversations.id}).from(conversations).where(eq(conversations.workspaceId,wid)).for('update');
  const files=await tx.select({key:attachments.storageKey}).from(attachments).where(eq(attachments.workspaceId,wid));
  const chatFiles=await tx.select({key:chatUploads.storageKey}).from(chatUploads).where(eq(chatUploads.workspaceId,wid));
  const changes=await tx.select({key:changelogUploads.storageKey}).from(changelogUploads).where(eq(changelogUploads.workspaceId,wid));
  const keys=[...new Set([...files,...chatFiles,...changes].map(row=>row.key))];if(keys.length)await tx.insert(jobs).values(keys.map(storageKey=>({type:'workspace_file_cleanup',payload:{storageKey}})));
  await tx.delete(jobs).where(sql`${jobs.payload}->>'workspaceId' = ${wid}`);
  await tx.delete(workspaces).where(eq(workspaces.id,wid));
 });
 revalidatePath('/dashboard','layout');return {deleted:true};
});}

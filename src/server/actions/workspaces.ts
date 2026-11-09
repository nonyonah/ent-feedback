"use server";

import {consumeRateLimit} from "@/server/rate-limit";
import {requireFeature} from "@/server/features";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {validNewWorkspaceDomain,normalizeWorkspaceName} from "@/lib/workspace-domain";
import { requireAppUser } from "@/server/auth";
import { runService } from "@/server/result";
import {
  acceptInvitation,
  cancelInvitation,
  createInvitations,
  createWorkspaceForUser,
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

const inviteMembersSchema = z.object({
  workspaceId: z.uuid(),
  emails: z.array(z.email()).min(1).max(10),
  role: z.enum(["admin", "member"]),
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

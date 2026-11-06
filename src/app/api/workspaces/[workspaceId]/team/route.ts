import {features} from "@/lib/features";
import { connection } from "next/server";

import { requireAppUser } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { findActiveWorkspaceMembership, hasAtLeastRole } from "@/server/services/access";
import { runService, ServiceError, toResponse } from "@/server/result";
import {
  listPendingInvitations,
  listWorkspaceMembers,
} from "@/server/services/workspaces";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  if(!features.teams)return Response.json({ok:false,error:{code:"forbidden",message:"Team management is unavailable in v1.",retryable:false}},{status:403});
  await connection();
  const { workspaceId } = await params;

  const result = await runService(async () => {
    const user = await requireAppUser();
    const membership = await findActiveWorkspaceMembership(getDb(), workspaceId, user.id);

    if (!membership) {
      throw new ServiceError("forbidden", "You do not have access to this workspace.");
    }

    const members = await listWorkspaceMembers({ workspaceId, userId: user.id });
    const invitations = hasAtLeastRole(membership.role, "admin")
      ? await listPendingInvitations({ workspaceId, userId: user.id })
      : [];

    return { members, invitations };
  });

  return toResponse(result);
}

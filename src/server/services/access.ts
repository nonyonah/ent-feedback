import "server-only";

import { and, eq } from "drizzle-orm";

import type { Database } from "@/server/db/client";
import { workspaceMembers } from "@/server/db/schema";
import { ServiceError } from "@/server/result";

export const workspaceRoles = ["owner", "admin", "member"] as const;
export type WorkspaceRole = (typeof workspaceRoles)[number];

const roleRank: Record<WorkspaceRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

export type WorkspaceMembership = {
  membershipId: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
};

export async function findActiveWorkspaceMembership(
  db: Database,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceMembership | null> {
  const [membership] = await db
    .select({
      membershipId: workspaceMembers.id,
      workspaceId: workspaceMembers.workspaceId,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.status, "active"),
      ),
    )
    .limit(1);

  return membership ?? null;
}

export async function requireWorkspaceRole(
  db: Database,
  input: { workspaceId: string; userId: string; minimumRole: WorkspaceRole },
): Promise<WorkspaceMembership> {
  const membership = await findActiveWorkspaceMembership(db, input.workspaceId, input.userId);

  if (!membership) {
    throw new ServiceError("forbidden", "You do not have access to this workspace.");
  }

  if (roleRank[membership.role] < roleRank[input.minimumRole]) {
    throw new ServiceError("forbidden", "You do not have permission to perform this action.");
  }

  return membership;
}

export function hasAtLeastRole(role: WorkspaceRole, minimumRole: WorkspaceRole): boolean {
  return roleRank[role] >= roleRank[minimumRole];
}

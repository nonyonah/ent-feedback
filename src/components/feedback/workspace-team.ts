"use client";

import * as React from "react";

import {
  cancelInvitationAction,
  inviteMembersAction,
} from "@/server/actions/workspaces";
import type { WorkspaceRole } from "@/components/feedback/project-provider";

export type TeamMember = {
  id: string;
  userId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: WorkspaceRole;
  joinedAt: string;
};

export type TeamInvitation = {
  id: string;
  email: string;
  role: "admin" | "member";
  emailSentAt: string | null;
  expiresAt: string;
  createdAt: string;
};

type TeamState = {
  members: TeamMember[];
  invitations: TeamInvitation[];
  loading: boolean;
  error: string | null;
};

const emptyState: TeamState = {
  members: [],
  invitations: [],
  loading: true,
  error: null,
};

export const TEAM_CHANGED_EVENT = "ent:team-changed";

export function notifyTeamChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TEAM_CHANGED_EVENT));
  }
}

export function useWorkspaceTeam(projectId: string) {
  const [state, setState] = React.useState<TeamState>(emptyState);

  const refresh = React.useCallback(async () => {
    if (!projectId) return;

    try {
      const response = await fetch(`/api/workspaces/${projectId}/team`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json()) as
        | {
            ok: true;
            data: { members: TeamMember[]; invitations: TeamInvitation[] };
          }
        | { ok: false; error: { message: string } };

      if (!payload.ok) {
        setState({
          members: [],
          invitations: [],
          loading: false,
          error: payload.error.message,
        });
        return;
      }

      setState({
        members: payload.data.members,
        invitations: payload.data.invitations,
        loading: false,
        error: null,
      });
    } catch {
      setState({
        members: [],
        invitations: [],
        loading: false,
        error: "The team could not be loaded.",
      });
    }
  }, [projectId]);

  React.useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (!cancelled) void refresh();
    };
    queueMicrotask(load);
    const handleChange = () => {
      void refresh();
    };
    window.addEventListener(TEAM_CHANGED_EVENT, handleChange);
    return () => {
      cancelled = true;
      window.removeEventListener(TEAM_CHANGED_EVENT, handleChange);
    };
  }, [refresh]);

  const invite = React.useCallback(
    async (emails: string[], role: "admin" | "member") => {
      const result = await inviteMembersAction({
        workspaceId: projectId,
        emails,
        role,
      });

      if (result.ok) {
        notifyTeamChanged();
      }

      return result;
    },
    [projectId],
  );

  const cancel = React.useCallback(
    async (invitationId: string) => {
      const result = await cancelInvitationAction({
        workspaceId: projectId,
        invitationId,
      });

      if (result.ok) {
        notifyTeamChanged();
      }

      return result;
    },
    [projectId],
  );

  return { ...state, refresh, invite, cancel };
}

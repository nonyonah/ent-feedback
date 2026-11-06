"use client";
import {features} from "@/lib/features";

import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useProject } from "@/components/feedback/project-provider";
import { InviteTeamDialog } from "@/components/feedback/invite-team-dialog";
import { useWorkspaceTeam } from "@/components/feedback/workspace-team";
import { SettingsPage, SettingGroup } from "@/components/feedback/settings-layout";
import { toastManager } from "@/components/ui/toast";

function roleLabel(role: "owner" | "admin" | "member") {
  return role === "owner" ? "Owner" : role === "admin" ? "Admin" : "Member";
}

function EnabledTeamSettings() {
  const { project } = useProject();
  const team = useWorkspaceTeam(project.id);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const canManage = !project.role || project.role !== "member";

  async function cancel(invitationId: string) {
    if (cancelling) return;
    setCancelling(invitationId);
    let result: Awaited<ReturnType<typeof team.cancel>>;
    try {
      result = await team.cancel(invitationId);
    } catch {
      toastManager.add({
        title: "Invitation not cancelled",
        description: "Try again in a moment.",
        type: "warning",
      });
      return;
    } finally {
      setCancelling(null);
    }

    if (!result.ok) {
      toastManager.add({
        title: "Invitation not cancelled",
        description: result.error.message,
        type: "warning",
      });
    }
  }

  return (
    <SettingsPage title="Team">
      {canManage && (
        <div className="flex justify-end px-4">
          <InviteTeamDialog />
        </div>
      )}
      <SettingGroup title="Members">
        {team.loading ? (
          <p className="px-4 py-6 text-[13px] text-muted-foreground">
            Loading team…
          </p>
        ) : team.error ? (
          <p role="alert" className="px-4 py-6 text-[13px] text-destructive-foreground">
            {team.error}
            <Button variant="ghost" size="sm" className="ml-2" onClick={() => void team.refresh()}>Retry</Button>
          </p>
        ) : (
          team.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 border-b border-border/60 px-4 py-3.5 last:border-b-0"
            >
              <Avatar className="size-8">
                <AvatarImage src={member.avatarUrl ?? undefined} />
                <AvatarFallback seed={member.email ?? member.name ?? member.userId} />
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">
                  {member.name ?? member.email ?? "Teammate"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.email ?? "No email on file"}
                </p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
                {roleLabel(member.role)}
              </span>
            </div>
          ))
        )}
      </SettingGroup>
      {canManage && (
      <SettingGroup title={`Invitations · ${team.invitations.length}`}>
        {team.invitations.length ? (
          team.invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="break-all text-[13px] font-medium">
                  {invitation.email}
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {invitation.role === "admin" ? "Admin" : "Member"} ·{" "}
                  {invitation.emailSentAt ? "Email sent" : "Email not sent"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-xs"
                disabled={cancelling !== null}
                onClick={() => {
                  void cancel(invitation.id);
                }}
              >
                {cancelling === invitation.id ? "Cancelling…" : "Cancel invitation"}
              </Button>
            </div>
          ))
        ) : (
          <p className="px-4 py-6 text-[13px] text-muted-foreground">
            No pending invitations. Bring a teammate into the conversation.
          </p>
        )}
      </SettingGroup>
      )}
    </SettingsPage>
  );
}

export function TeamSettings(){return features.teams?<EnabledTeamSettings/>:null;}

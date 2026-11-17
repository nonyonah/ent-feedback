"use client";

import {ErrorNotice} from '@/components/ui/error-notice';
import {features} from "@/lib/features";

import {removeWorkspaceMemberAction} from '@/server/actions/workspaces';
import {Skeleton} from '@/components/ui/skeleton';
import {Dialog,DialogTrigger,DialogHeader,DialogPopup,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
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
  const canManage = project.role === "owner" || project.role === "admin";
  const [removing,setRemoving]=useState<typeof team.members[number]|null>(null);
  const [removePending,setRemovePending]=useState(false);
  const [removeError,setRemoveError]=useState('');
  async function remove(){if(!removing||removePending)return;setRemovePending(true);setRemoveError('');try{const result=await removeWorkspaceMemberAction({workspaceId:project.id,memberId:removing.id});if(!result.ok)throw Error(result.error.message);setRemoving(null);await team.refresh();toastManager.add({title:'Teammate removed',type:'success'});}catch(error){setRemoveError(error instanceof Error?error.message:'This teammate could not be removed.');}finally{setRemovePending(false);}}

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
          <div aria-busy="true" aria-label="Loading team" className="space-y-3 p-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></div>
        ) : team.error ? (
          <ErrorNotice  className="px-4 py-6 text-[13px] text-foreground">
            {team.error}
            <Button variant="ghost" size="sm" className="ml-2" onClick={() => void team.refresh()}>Retry</Button>
          </ErrorNotice>
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
                <p title={member.name??member.email??undefined} className="truncate text-[13px] font-medium">
                  {member.name ?? member.email ?? "Teammate"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.email ?? "No email on file"}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-control-quiet px-2 py-0.5 text-xs">
                {roleLabel(member.role)}
              </span>
              {canManage&&member.role==='member'&&<Dialog open={removing?.id===member.id} onOpenChange={open=>{if(open){setRemoveError('');setRemoving(member);}else if(!removePending)setRemoving(null);}}><DialogTrigger render={<Button size="sm" variant="ghost"/>}>Remove<span className="sr-only"> {member.name??member.email??'teammate'}</span></DialogTrigger><DialogPopup bottomStickOnMobile={false}><DialogHeader><DialogTitle>Remove teammate?</DialogTitle><DialogDescription>{member.name??member.email??'This teammate'} will lose access to {project.name}. Their feedback and replies will stay.</DialogDescription></DialogHeader>{removeError&&<ErrorNotice className="mx-6 mb-4">{removeError}</ErrorNotice>}<DialogFooter><Button variant="secondary" disabled={removePending} onClick={()=>setRemoving(null)}>Keep teammate</Button><Button variant="destructive" loading={removePending} disabled={removePending} onClick={()=>void remove()}>Remove teammate</Button></DialogFooter></DialogPopup></Dialog>}
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
              <Button loading={cancelling === invitation.id}
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

export function TeamSettings(){const {project}=useProject();return features.teams?<EnabledTeamSettings key={project.id}/>:null;}

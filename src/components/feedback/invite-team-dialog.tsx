"use client";
import {features} from "@/lib/features";

import * as React from "react";

import { UserPlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useProject } from "@/components/feedback/project-provider";
import { useWorkspaceTeam } from "@/components/feedback/workspace-team";
import { toastManager } from "@/components/ui/toast";

type InviteRole = "admin" | "member";

function EnabledInviteTeamDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const { project } = useProject();
  const team = useWorkspaceTeam(project.id);
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const [emails, setEmails] = React.useState("");
  const [role, setRole] = React.useState<InviteRole>("member");
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const canManage = !project.role || project.role !== "member";

  function setOpen(value: boolean) {
    setInternalOpen(value);
    onOpenChange?.(value);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    const list = Array.from(
      new Set(
        emails
          .toLowerCase()
          .split(/[\s,;]+/)
          .filter(Boolean),
      ),
    );

    if (!list.length || list.some((email) => !/^\S+@[^@.]+\.[^@]+$/.test(email))) {
      setError("Enter valid email addresses, separated by commas.");
      return;
    }

    const knownEmails = new Set(
      team.members
        .map((member) => member.email)
        .filter((email): email is string => Boolean(email)),
    );
    for (const invitation of team.invitations) {
      knownEmails.add(invitation.email);
    }

    if (list.some((email) => knownEmails.has(email))) {
      setError(
        "One of these addresses already belongs to your team or pending invitations.",
      );
      return;
    }

    setSubmitting(true);
    let result: Awaited<ReturnType<typeof team.invite>>;
    try {
      result = await team.invite(list, role);
    } catch {
      setSubmitting(false);
      setError("The invitations could not be created. Try again.");
      return;
    }
    setSubmitting(false);

    if (!result.ok) {
      const fieldError = result.error.fieldErrors
        ? Object.values(result.error.fieldErrors)[0]?.[0]
        : undefined;
      setError(fieldError ?? result.error.message);
      return;
    }

    setOpen(false);

    const sent = result.data.invitations.filter((invitation) => invitation.emailSentAt);
    const failed = result.data.failures;

    if (failed.length > 0) {
      toastManager.add({
        title: sent.length > 0 ? "Invitations partially sent" : "Invitations created",
        description:
          sent.length > 0
            ? `${sent.length} email${sent.length === 1 ? "" : "s"} sent. ${failed.length} could not be delivered.`
            : "The invitation emails could not be sent. The invitations remain pending.",
        type: "warning",
      });
      return;
    }

    toastManager.add({
      title: "Invitations sent",
      description: `${sent.length} email${sent.length === 1 ? "" : "s"} sent.`,
      type: "success",
    });
  }

  if (!canManage) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) {
          setEmails("");
          setError("");
        }
      }}
    >
      {!hideTrigger && (
        <DialogTrigger
          render={
            trigger ?? (
              <Button size="sm" className="h-7 rounded-full px-2.25 text-sm" />
            )
          }
        >
          <UserPlusIcon />
          Invite team
        </DialogTrigger>
      )}
      <DialogPopup className="max-w-[440px]" bottomStickOnMobile={false}>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="text-base">Invite your team</DialogTitle>
            <DialogDescription className="text-[13px]">
              Give teammates a place in {project.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-6 pb-6">
            <Field>
              <FieldLabel htmlFor="invite-emails">Email addresses</FieldLabel>
              <Textarea
                autoFocus
                required
                id="invite-emails"
                placeholder="teammate@company.com"
                value={emails}
                onChange={(event) => {
                  setEmails(event.target.value);
                  setError("");
                }}
              />
              <FieldDescription>
                Invite several people with comma-separated addresses.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <Select
                items={[
                  { label: "Member", value: "member" },
                  { label: "Admin", value: "admin" },
                ]}
                value={role}
                onValueChange={(value) => {
                  if (value) setRole(value as InviteRole);
                }}
              >
                <SelectTrigger aria-label="Invitation role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectPopup>
              </Select>
              <FieldDescription>
                {role === "admin"
                  ? "Admins manage workspace settings and feedback."
                  : "Members review feedback and join conversations."}
              </FieldDescription>
            </Field>
            {error && (
              <p role="alert" className="text-xs text-destructive-foreground">
                {error}
              </p>
            )}
          </div>
          <DialogFooter className="flex-row justify-end">
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full"
                />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              className="rounded-full"
              disabled={!emails.trim() || submitting}
            >
              {submitting ? "Sending…" : "Send invitations"}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}

export function InviteTeamDialog(props:React.ComponentProps<typeof EnabledInviteTeamDialog>){return features.teams?<EnabledInviteTeamDialog {...props}/>:null;}

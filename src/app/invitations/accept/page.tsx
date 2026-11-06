import {features} from "@/lib/features";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  AcceptInvitationButton,
  SwitchAccountButton,
} from "@/components/feedback/invitation-actions";
import { PageShell } from "@/components/feedback/page-shell";
import { Button } from "@/components/ui/button";
import { getOptionalAppUser } from "@/server/auth";
import { previewInvitation } from "@/server/services/workspaces";

export const instant = false;

function InvitationMessage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <PageShell
      eyebrow="Workspace invitation"
      title={title}
      description={description}
      backHref="/"
      backLabel="Back to Ent"
    >
      {children}
    </PageShell>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  if(!features.teams)return <InvitationMessage title="Team invitations are unavailable" description="Team access is temporarily disabled for v1."/>;
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  if (!token) {
    return (
      <InvitationMessage
        title="This invitation link is incomplete."
        description="Ask a workspace admin to send a new invitation."
      />
    );
  }

  const user = await getOptionalAppUser();

  if (!user) {
    const next = `/invitations/accept?token=${encodeURIComponent(token)}`;
    redirect(`/auth?next=${encodeURIComponent(next)}`);
  }

  const invitation = await previewInvitation(token);

  if (!invitation) {
    return (
      <InvitationMessage
        title="This invitation could not be found."
        description="The link may have been cancelled or replaced by a newer invitation."
      />
    );
  }

  if (invitation.state === "accepted") {
    return (
      <InvitationMessage
        title="This invitation was already accepted."
        description={`You already have access to ${invitation.workspaceName}.`}
      >
        <Button className="min-h-10 rounded-xl px-4" render={<Link href="/dashboard/boards" />}>
          Open dashboard
        </Button>
      </InvitationMessage>
    );
  }

  if (invitation.state !== "pending" || invitation.expired) {
    return (
      <InvitationMessage
        title="This invitation is no longer valid."
        description="Ask a workspace admin to send you a fresh invitation."
      />
    );
  }

  if (!user.email || user.email !== invitation.email) {
    return (
      <InvitationMessage
        title="This invitation belongs to another email address."
        description={`You are signed in as ${user.email ?? "an account without a verified email"}. Switch accounts to accept the invitation for ${invitation.workspaceName}.`}
      >
        <SwitchAccountButton />
      </InvitationMessage>
    );
  }

  return (
    <PageShell
      eyebrow="Workspace invitation"
      title={`Join ${invitation.workspaceName}.`}
      description={`${invitation.inviterName ?? "A teammate"} invited you to join as ${
        invitation.role === "admin" ? "an admin" : "a member"
      }.`}
      backHref="/"
      backLabel="Back to Ent"
    >
      <div className="max-w-[480px] rounded-xl border p-6 sm:p-8">
        <p className="text-sm leading-6 text-muted-foreground">
          You are signed in as{" "}
          <span className="font-medium text-foreground">{invitation.email}</span>.
          Accepting adds this workspace to your account.
        </p>
        <div className="mt-6">
          <AcceptInvitationButton token={token} />
        </div>
      </div>
    </PageShell>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import { acceptInvitationAction } from "@/server/actions/workspaces";

export function AcceptInvitationButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState("");

  function accept() {
    setError("");
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof acceptInvitationAction>>;
      try {
        result = await acceptInvitationAction(token);
      } catch {
        setError("The invitation could not be accepted. Try again.");
        return;
      }

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      toastManager.add({
        title: "Invitation accepted",
        description: `You joined ${result.data.workspaceName}.`,
        type: "success",
      });
      router.push("/dashboard/boards");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Button className="min-h-10 self-start rounded-xl px-4" onClick={accept} disabled={pending}>
        {pending ? <Spinner /> : null}
        {pending ? "Joining…" : "Accept invitation"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive-foreground">
          {error}
        </p>
      )}
    </div>
  );
}

export function SwitchAccountButton() {
  const { signOut } = useClerk();

  return (
    <Button
      variant="outline"
      className="min-h-10 self-start rounded-xl px-4"
      onClick={() => {
        void signOut({
          redirectUrl: `${window.location.origin}${window.location.pathname}${window.location.search}`,
        });
      }}
    >
      Sign in with a different account
    </Button>
  );
}

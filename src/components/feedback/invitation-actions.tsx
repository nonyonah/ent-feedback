"use client";


import {ErrorNotice} from '@/components/ui/error-notice';
import * as React from "react";
import {useRouter} from "next/navigation";
import { useClerk,useUser } from "@clerk/nextjs";

import {Input} from '@/components/ui/input';
import {saveRegistrationProfileAction} from '@/server/actions/registration';
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { acceptInvitationAction } from "@/server/actions/workspaces";

export function AcceptInvitationButton({ token,needsProfile=false }: { token: string;needsProfile?:boolean }) {
  const {user}=useUser();
  const router=useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState("");
  const [firstName,setFirstName]=React.useState('');const [lastName,setLastName]=React.useState('');

  function accept() {
    setError("");
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof acceptInvitationAction>>;
      try {
        if(needsProfile){const saved=await saveRegistrationProfileAction({firstName,lastName});if(!saved.ok){setError(saved.error.message);return;}}
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
      try{if(user)localStorage.setItem("ent-active-workspace:"+user.id,result.data.workspaceId);}catch{}
      router.push("/dashboard/boards");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {needsProfile&&<div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-[13px]">First name<Input autoComplete="given-name" maxLength={80} value={firstName} disabled={pending} onChange={event=>setFirstName(event.target.value)}/></label><label className="space-y-1.5 text-[13px]">Last name<Input autoComplete="family-name" maxLength={80} value={lastName} disabled={pending} onChange={event=>setLastName(event.target.value)}/></label></div>}
      <Button loading={pending} className="min-h-10 self-start rounded-xl px-4" onClick={accept} disabled={pending||(needsProfile&&(!firstName.trim()||!lastName.trim()))}>
        {pending ? "Joining…" : "Accept invitation"}
      </Button>
      {error && (
        <ErrorNotice  className="text-xs text-foreground">
          {error}
        </ErrorNotice>
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

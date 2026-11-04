"use client";
import * as React from "react";
import { useProject } from "@/components/feedback/project-provider";
import { boardHref } from "@/lib/project-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { PageShell, PreviewNote } from "@/components/feedback/page-shell";

export function PreferencesView() {
  const {project,activeBoard}=useProject();
  const publicHref=activeBoard?boardHref(project,activeBoard):"/project";
  const [status,setStatus]=React.useState(true);const [replies,setReplies]=React.useState(true);const [email,setEmail]=React.useState("alex@company.com");const [saved,setSaved]=React.useState(false);
  return <PageShell backHref={publicHref} backLabel="Back to the board" eyebrow="Stay in the loop" title="Just the updates you care about." description="Choose what lands in your inbox. You can change your mind anytime.">
    <form className="flex flex-col gap-6" onSubmit={e=>{e.preventDefault();setSaved(true);}}>
      <div className="rounded-lg border p-5 sm:p-6"><Field><FieldLabel htmlFor="notification-email">Email address</FieldLabel><Input type="email" required id="notification-email" value={email} onChange={e=>{setEmail(e.target.value);setSaved(false);}}/><FieldDescription>Updates about the posts you follow will go here.</FieldDescription></Field></div>
      <section className="divide-y rounded-lg border"><div className="flex items-center justify-between gap-6 p-5 sm:p-6"><div><label htmlFor="notify-status" className="text-sm font-medium">Status changes</label><p className="mt-1 text-sm leading-5 text-muted-foreground">Know when an idea is planned, in progress, or shipped.</p></div><Switch id="notify-status" checked={status} onCheckedChange={value=>{setStatus(value);setSaved(false);}}/></div><div className="flex items-center justify-between gap-6 p-5 sm:p-6"><div><label htmlFor="notify-replies" className="text-sm font-medium">New comments</label><p className="mt-1 text-sm leading-5 text-muted-foreground">Keep up with the conversation on posts you follow.</p></div><Switch id="notify-replies" checked={replies} onCheckedChange={value=>{setReplies(value);setSaved(false);}}/></div></section>
      <div className="flex items-center justify-between gap-4"><p role="status" className="text-xs text-muted-foreground">{saved?"Preferences saved for this preview.":"Only for the ideas you choose to follow."}</p><Button type="submit">{saved?"Saved":"Save preferences"}</Button></div>
      <PreviewNote>Notification settings preview. Email delivery will be connected with the backend.</PreviewNote>
    </form>
  </PageShell>;
}

"use client";
import * as React from "react";
import {useProject} from "@/components/feedback/project-provider";
import Link from "next/link";
import { EnvelopeSimpleIcon } from "@/components/icons";
import { CheckIcon } from "@/components/icons";
import { ClockIcon } from "@/components/icons";
import { WarningCircleIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { PageShell, PreviewNote } from "@/components/feedback/page-shell";
import { Spinner } from "@/components/ui/spinner";

const subscribeToLocation = () => () => {};
export type AuthStage = "email" | "check-email" | "verified" | "expired" | "error";
export function AuthView({ initialStage = "email", initialSending = false }: { initialStage?: AuthStage; initialSending?: boolean }) {
  const {setPublicUser}=useProject();
  const returnTo = React.useSyncExternalStore(subscribeToLocation, () => { const value = new URLSearchParams(window.location.search).get("next") || "/"; try { const url = new URL(value, window.location.origin); return url.origin === window.location.origin && value.startsWith("/") && !value.startsWith("//") ? url.pathname + url.search + url.hash : "/"; } catch { return "/"; } }, () => "/");
  const [stage,setStage]=React.useState(initialStage);
  const [email,setEmail]=React.useState("");
  const [sending,setSending]=React.useState(initialSending);
  const [resent,setResent]=React.useState(false);
  const titles = { email:"Your voice belongs here.", "check-email":"Check your inbox.", verified:"You’re all set.", expired:"This link has expired.", error:"That link didn’t work." };
  const descriptions = { email:"Sign in with your email to keep your votes, comments, and followed posts together. No password to remember.", "check-email":"One small step, and you’re part of the conversation.", verified:"Your email is verified. You can now pick up where you left off.", expired:"Sign-in links only work for a short time. Request a fresh one to continue.", error:"We couldn’t verify this sign-in link. It may have already been used." };
  async function submit(e:React.FormEvent) {e.preventDefault();setSending(true);await new Promise(r=>setTimeout(r,400));setSending(false);setStage("check-email");}
  return <PageShell backHref={returnTo} backLabel="Back to where you left off" eyebrow="Welcome to Ent" title={titles[stage]} description={descriptions[stage]}>
    <div className="max-w-[480px] rounded-xl border p-6 sm:p-8">
      {stage==="email" ? <form onSubmit={submit} className="flex flex-col gap-5"><Field><FieldLabel htmlFor="sign-in-email">Email address</FieldLabel><Input id="sign-in-email" type="email" autoComplete="email" required placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} className="[&_input]:h-10 [&_input]:sm:h-10" /><FieldDescription>We’ll send you a link to sign in securely.</FieldDescription></Field><Button type="submit" disabled={sending} className="min-h-11">{sending?<Spinner/>:<EnvelopeSimpleIcon data-icon="inline-start"/>}{sending?"Preparing your link…":"Send sign-in link"}</Button><p className="text-center text-xs leading-5 text-muted-foreground">No password. No extra account to manage.</p></form> : <>
        <span className="mb-5 inline-flex size-12 items-center justify-center rounded-full bg-muted text-foreground">{stage==="verified"?<CheckIcon className="size-6"/>:stage==="expired"?<ClockIcon className="size-6"/>:stage==="error"?<WarningCircleIcon className="size-6"/>:<EnvelopeSimpleIcon className="size-6"/>}</span>
        {stage==="check-email" && <><h2 className="text-lg font-semibold">Your sign-in link is on its way.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Open the link sent to <span className="font-medium text-foreground">{email || "you@company.com"}</span>. You can close this tab once you’re signed in.</p><div className="mt-6 flex flex-wrap gap-2"><Button variant="outline" onClick={()=>setResent(true)} disabled={resent}>{resent?"Link requested":"Resend link"}</Button><Button variant="ghost" onClick={()=>{setStage("email");setResent(false);}}>Use a different email</Button></div>{resent&&<p role="status" className="mt-3 text-xs text-muted-foreground">Resend preview requested. No email has been sent.</p>}<div className="mt-8 border-t pt-4"><Button variant="ghost" onClick={()=>setPublicUser({email:email||"alex@company.com",name:(email.split("@")[0]||"Alex").replace(/[._-]/g," ")})} render={<Link href={"/auth/verified?next="+encodeURIComponent(returnTo)}/>}>Preview successful verification →</Button></div></>}
        {stage==="verified" && <><h2 className="text-lg font-semibold">A little less friction.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Vote on what matters, follow an idea, or share one of your own.</p><Button className="mt-6" render={<Link href={returnTo}/>}>Continue</Button></>}
        {(stage==="expired"||stage==="error")&&<><p className="text-sm leading-6 text-muted-foreground">Your feedback is still here. Let’s get you a new link.</p><Button className="mt-6" onClick={()=>setStage("email")}>Request a new link</Button></>}
      </>}
    </div>
    <div className="mt-5"><PreviewNote>Email-flow preview only. No emails are sent and no sign-in session is created.</PreviewNote></div>
  </PageShell>;
}

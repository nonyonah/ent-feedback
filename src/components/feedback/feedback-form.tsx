"use client";
import * as React from "react";
import Link from "next/link";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { StatusLabel } from "@/components/feedback/status-label";
import { useFeedback } from "@/components/feedback/feedback-provider";

export type FormPreview = "default" | "similar" | "success" | "error" | "sending" | "invalid";
export function FeedbackForm({ onDone, preview = "default", compact = false }: { onDone?: () => void; preview?: FormPreview; compact?: boolean }) {
  const { addFeedback, items, vote } = useFeedback();
  const uid = React.useId();
  const [title, setTitle] = React.useState(preview === "similar" ? "Dark mode" : ["sending", "error"].includes(preview) ? "Keyboard shortcuts for the dashboard" : "");
  const [description, setDescription] = React.useState(["sending", "error"].includes(preview) ? "I’d love to move through requests with my keyboard when reviewing feedback." : "");
  const [email, setEmail] = React.useState("");
  const [attempted, setAttempted] = React.useState(preview === "invalid");
  const [state, setState] = React.useState<"idle" | "sending" | "success" | "error">(preview === "success" ? "success" : preview === "error" ? "error" : preview === "sending" ? "sending" : "idle");
  const [postedId, setPostedId] = React.useState<string | null>(null);
  const titleError = attempted && title.trim().length < 4;
  const descriptionError = attempted && description.trim().length < 10;
  const terms = title.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 2) ?? [];
  const similar = terms.length ? items.map((item) => ({ item, score: terms.filter((term) => (item.title + " " + item.description).toLowerCase().includes(term)).length })).filter((match) => match.score > 0).sort((a,b) => b.score - a.score).slice(0,3).map((match) => match.item) : [];

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setAttempted(true);
    if (title.trim().length < 4 || description.trim().length < 10) return;
    setState("sending");
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      const item = addFeedback({ title, description, email });
      setPostedId(item.id); setState("success");
    } catch { setState("error"); }
  }

  if (state === "success") return <div className="flex flex-col items-center gap-4 py-8 text-center" role="status">
    <span className="flex size-12 items-center justify-center rounded-full bg-status-shipped-bg text-status-shipped-fg"><CheckIcon weight="bold" className="size-6" aria-hidden="true" /></span>
    <div><h2 className="text-xl font-semibold leading-7">Your idea is on the board.</h2><p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">Thanks for helping us make something better. Others can now join the conversation.</p></div>
    {postedId ? <Button render={<Link href={"/items/" + postedId} />} onClick={onDone}>View your idea</Button> : <Button onClick={() => { setState("idle"); setTitle(""); setDescription(""); setAttempted(false); }}>Share another idea</Button>}
    {onDone && <Button variant="ghost" onClick={onDone}>Back to feedback</Button>}
  </div>;

  return <form onSubmit={submit} className="flex flex-col gap-5">
    {state === "error" && <Alert variant="error"><WarningCircleIcon weight="bold"/><AlertTitle>Your idea couldn’t be posted.</AlertTitle><AlertDescription>Your draft is still here. Check your connection and try again.</AlertDescription></Alert>}
    <Field data-invalid={titleError || undefined}><FieldLabel htmlFor={uid+"-title"}>Title</FieldLabel><Input id={uid+"-title"} className="[&_input]:h-10 [&_input]:sm:h-10" placeholder="A short, specific summary" value={title} onChange={(event) => setTitle(event.target.value)} aria-invalid={titleError || undefined} aria-describedby={titleError ? uid+"-title-error" : undefined} maxLength={160} disabled={state === "sending"} />{titleError && <p id={uid+"-title-error"} className="text-xs text-destructive-foreground">Add a title with at least 4 characters.</p>}</Field>
    {similar.length > 0 && <section aria-label="Similar ideas" className="rounded-lg border bg-muted/30 p-3"><p className="text-xs font-medium">Someone might be thinking the same thing.</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Vote on an existing idea to keep the conversation together.</p><ul className="mt-3 flex flex-col gap-2">{similar.map((item) => <li key={item.id} className="flex items-center gap-2"><Button type="button" size="xs" variant={item.voted ? "secondary" : "outline"} aria-label={"Vote for "+item.title} aria-pressed={item.voted} onClick={() => vote(item.id)} className="min-h-9 min-w-11"><ArrowUpIcon weight="bold" />{item.votes}</Button><Link className="min-w-0 flex-1 text-xs font-medium leading-5 hover:underline" href={"/items/"+item.id}>{item.title}</Link>{!compact && <StatusLabel status={item.status} />}</li>)}</ul></section>}
    <Field data-invalid={descriptionError || undefined}><FieldLabel htmlFor={uid+"-description"}>Description</FieldLabel><Textarea id={uid+"-description"} className="[&_textarea]:min-h-24 [&_textarea]:sm:min-h-24" placeholder="What problem would this solve? A little context goes a long way." value={description} onChange={(event) => setDescription(event.target.value)} aria-invalid={descriptionError || undefined} aria-describedby={descriptionError ? uid+"-description-error" : undefined} maxLength={3000} disabled={state === "sending"} />{descriptionError && <p id={uid+"-description-error"} className="text-xs text-destructive-foreground">Add at least 10 characters of context.</p>}</Field>
    <Field><FieldLabel htmlFor={uid+"-email"}>Email <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel><Input id={uid+"-email"} className="[&_input]:h-10 [&_input]:sm:h-10" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={state === "sending"} /><FieldDescription>Use your email to follow up on this idea when notifications are available.</FieldDescription></Field>
    <div className="flex justify-end gap-2">{onDone && <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>}<Button type="submit" className="min-h-11 sm:min-h-10" disabled={state === "sending"}>{state === "sending" && <Spinner />} {state === "sending" ? "Posting idea…" : state === "error" ? "Try again" : "Post idea"}</Button></div>
  </form>;
}

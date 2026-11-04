"use client";
import * as React from "react";
import Link from "next/link";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { PageShell, PreviewNote } from "@/components/feedback/page-shell";
import { useProject, type FeedbackBoard } from "@/components/feedback/project-provider";
import { boardHref } from "@/lib/project-links";

export function CreateBoardView() {
  const {project,boards,createBoard}=useProject();
  const [slugEdited,setSlugEdited]=React.useState(false);
  const [name,setName]=React.useState("");const [slug,setSlug]=React.useState("");const [description,setDescription]=React.useState("");const [error,setError]=React.useState("");const [created,setCreated]=React.useState<FeedbackBoard|null>(null);
  if(created)return <PageShell eyebrow={project.name} title="Your feedback board is ready." description="Now give customers a place to share what matters to them."><div className="rounded-xl border p-6"><span className="flex size-12 items-center justify-center rounded-full bg-status-shipped-bg text-status-shipped-fg"><CheckIcon weight="bold" className="size-6"/></span><h2 className="mt-5 text-xl font-semibold">{created.name}</h2><p className="mt-2 text-sm text-muted-foreground">Created inside {project.name}. Your board starts empty and is ready for its first idea.</p><div className="mt-6 flex flex-wrap gap-2"><Button render={<Link href={boardHref(project,created)}/>}>Open board</Button><Button variant="outline" render={<Link href="/share"/>}>Share your board</Button></div><Link className="mt-5 inline-block text-sm text-muted-foreground hover:underline" href="/project">Back to {project.name}</Link></div></PageShell>;
  return <PageShell eyebrow={project.name} title="Create a feedback board" description="Give one kind of conversation a clear home. Try Feature Requests, Bugs, or Product Feedback.">
    <form onSubmit={event=>{event.preventDefault();if(boards.some(board=>board.slug===slug)){setError("A board with this handle already exists in this project.");return;}setError("");setCreated(createBoard({name:name.trim(),slug,description:description.trim()}));}} className="flex flex-col gap-5">
      <div className="rounded-lg border bg-muted/20 p-4 text-sm"><span className="text-muted-foreground">Inside project</span><p className="mt-1 font-medium">{project.name}</p></div>
      <Field><FieldLabel htmlFor="board-name">Board name</FieldLabel><Input id="board-name" required maxLength={60} placeholder="Feature requests" value={name} onChange={event=>{setName(event.target.value);if(!slugEdited)setSlug(event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""));}}/><FieldDescription>Keep it clear so customers know where to post.</FieldDescription></Field>
      <Field data-invalid={Boolean(error)}><FieldLabel htmlFor="board-handle">Board handle</FieldLabel><Input id="board-handle" required maxLength={50} pattern="[a-z0-9]+(-[a-z0-9]+)*" aria-invalid={Boolean(error)} value={slug} onChange={event=>{setSlugEdited(true);setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""));setError("");}}/><FieldDescription>/p/{project.slug}/boards/{slug||"your-board"}</FieldDescription>{error&&<p role="alert" className="text-xs text-destructive-foreground">{error}</p>}</Field>
      <Field><FieldLabel htmlFor="board-description">Board introduction</FieldLabel><Textarea id="board-description" placeholder="What would you like your customers to share?" maxLength={200} value={description} onChange={event=>setDescription(event.target.value)}/><FieldDescription>A short welcome at the top of this board.</FieldDescription></Field>
      <div className="flex justify-end gap-2"><Button variant="outline" render={<Link href="/project"/>}>Cancel</Button><Button type="submit">Create board</Button></div><PreviewNote/>
    </form>
  </PageShell>;
}

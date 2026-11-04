"use client";
import * as React from "react";
import Link from "next/link";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { ChatTextIcon } from "@phosphor-icons/react/dist/ssr/ChatText";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { PageShell, PreviewNote } from "@/components/feedback/page-shell";
import { ProjectNav } from "@/components/feedback/project-nav";
import { useProject } from "@/components/feedback/project-provider";
import { boardHref } from "@/lib/project-links";

export function ProjectView() {
  const {project,boards,selectBoard}=useProject();
  return <PageShell backHref={null} eyebrow="Your project" title={project.name} description={project.description||"Your boards, your customers, and the conversations that move your product forward."} wide>
    <ProjectNav/>
    <section className="mb-8 rounded-lg border bg-muted/20 p-5"><div className="flex items-center gap-3"><Avatar className="size-10 rounded-lg"><AvatarImage src={project.logo}/><AvatarFallback>{project.name.slice(0,2).toUpperCase()}</AvatarFallback></Avatar><div><h2 className="text-sm font-semibold">A clear path to your first conversation</h2><p className="mt-1 text-xs text-muted-foreground">Start with one board. Add more when you need them.</p></div></div><ol className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><li className="flex items-center gap-2"><CheckIcon weight="bold" className="size-4 text-status-shipped-fg"/>Create your project</li><li><Link href={boards.length?"/project":"/project/boards/new"} className="inline-flex items-center gap-2 hover:underline">{boards.length?<CheckIcon weight="bold" className="size-4 text-status-shipped-fg"/>:<span className="flex size-5 items-center justify-center rounded-full border text-xs">2</span>}Create a feedback board</Link></li><li><Link href={boards.length?"/share":"/project/boards/new"} className="inline-flex items-center gap-2 hover:underline"><span className="flex size-5 items-center justify-center rounded-full border text-xs">3</span>Share it with your customers</Link></li></ol></section>
    <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Feedback boards</h2><p className="mt-1 text-sm text-muted-foreground">{boards.length} {boards.length===1?"board":"boards"} in this project</p></div><Button render={<Link href="/project/boards/new"/>}><PlusIcon weight="bold" data-icon="inline-start"/>Create board</Button></div>
    {boards.length?<div className="grid gap-4 sm:grid-cols-2">{boards.map(board=><article key={board.id} className="rounded-lg border p-5"><span className="flex size-9 items-center justify-center rounded-lg bg-muted"><ChatTextIcon weight="bold" className="size-4"/></span><h3 className="mt-4 text-lg font-semibold">{board.name}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{board.description||"A public place to collect ideas and hear from your customers."}</p><p className="mt-3 text-xs text-muted-foreground">Public board · /{board.slug}</p><div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" onClick={()=>selectBoard(board.id)} render={<Link href={boardHref(project,board)}/>}>Open board<ArrowRightIcon weight="bold"/></Button><Button variant="ghost" onClick={()=>selectBoard(board.id)} render={<Link href="/dashboard"/>}>Manage feedback</Button><Button variant="ghost" onClick={()=>selectBoard(board.id)} render={<Link href="/share"/>}>Share</Button></div></article>)}</div>:<Empty className="rounded-lg border py-14"><EmptyMedia variant="icon"><ChatTextIcon weight="bold"/></EmptyMedia><EmptyHeader><EmptyTitle>Your first conversation starts here.</EmptyTitle><EmptyDescription>Create a feedback board inside this project. Give it a clear name, then invite your customers to share ideas.</EmptyDescription></EmptyHeader><EmptyContent><Button render={<Link href="/project/boards/new"/>}><PlusIcon weight="bold"/>Create your first board</Button></EmptyContent></Empty>}
    <div className="mt-6"><PreviewNote/></div>
  </PageShell>;
}

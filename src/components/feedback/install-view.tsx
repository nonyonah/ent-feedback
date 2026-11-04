"use client";
import * as React from "react";
import Link from "next/link";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import { Button } from "@/components/ui/button";
import { PageShell, PreviewNote } from "@/components/feedback/page-shell";
import { useProject } from "@/components/feedback/project-provider";
import { ProjectNav } from "@/components/feedback/project-nav";
import { BoardPicker, NoBoard } from "@/components/feedback/board-context";
import { boardHref } from "@/lib/project-links";
const subscribeToOrigin = () => () => {};
export function InstallView() {
  const {project,activeBoard}=useProject();const [copied,setCopied]=React.useState(false);const [error,setError]=React.useState("");
  const origin = React.useSyncExternalStore(subscribeToOrigin, () => window.location.origin, () => "https://your-ent-app.example");
  const snippet='<script src="'+origin+'/widget.js" data-project="'+project.slug+'" data-board="'+(activeBoard?.slug??'')+'" defer></script>';
  async function copy(){try{await navigator.clipboard.writeText(snippet);setCopied(true);setError("");}catch{setError("Select the snippet below and copy it manually.");}}
  return <PageShell eyebrow="A small button. An open conversation." title="Bring feedback into your product." description="Let customers share ideas right where they’re using your app." wide>
    <ProjectNav/>{!activeBoard?<NoBoard/>:<><BoardPicker/><div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-8"><section><div className="mb-3 flex items-center gap-3"><span className="flex size-6 items-center justify-center rounded-full border text-xs">1</span><h2 className="text-sm font-semibold">Copy your installation snippet</h2></div><p className="text-sm leading-6 text-muted-foreground">Add this script before the closing body tag on your website. It creates the launcher and opens the embedded board.</p><div className="mt-4 overflow-hidden rounded-lg border bg-muted/30"><div className="flex items-center justify-between border-b px-4 py-2"><span className="text-xs text-muted-foreground">HTML</span><Button size="sm" variant="ghost" onClick={()=>void copy()}>{copied?<CheckIcon weight="bold"/>:<CopyIcon weight="bold"/>}{copied?"Copied":"Copy"}</Button></div><pre className="overflow-x-auto whitespace-pre-wrap break-all p-4 text-xs leading-6"><code>{snippet}</code></pre></div>{error&&<p role="alert" className="mt-2 text-xs text-destructive-foreground">{error}</p>}</section><section><div className="mb-3 flex items-center gap-3"><span className="flex size-6 items-center justify-center rounded-full border text-xs">2</span><h2 className="text-sm font-semibold">Make yourself at home</h2></div><p className="text-sm leading-6 text-muted-foreground">The widget sits in the bottom-right corner and adapts to smaller screens. Customers can browse ideas, vote, and submit from the same panel.</p><Button className="mt-4" variant="outline" render={<Link href="/widget-preview"/>}><ArrowSquareOutIcon weight="bold"/>Try it inside a sample app</Button></section><section><div className="mb-3 flex items-center gap-3"><span className="flex size-6 items-center justify-center rounded-full border text-xs">3</span><h2 className="text-sm font-semibold">Share your board, too</h2></div><p className="text-sm leading-6 text-muted-foreground">A direct link works anywhere: your app menu, a welcome email, or your next customer conversation.</p><Button className="mt-4" variant="outline" render={<Link href={activeBoard?boardHref(project,activeBoard):"/project"}/>}>Open public board</Button></section><PreviewNote>The loader is functional. The embedded board currently uses sample data; project routing, shared votes, and submissions will connect to the backend next.</PreviewNote></div>
      <aside className="rounded-xl border bg-muted/20 p-5"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Widget preview</p><div className="mt-4 overflow-hidden rounded-xl border bg-background shadow-sm"><iframe title="Live feedback widget preview" src="/embed" className="h-[560px] w-full border-0" /></div><p className="mt-4 text-xs leading-5 text-muted-foreground">An interactive sample board. Open the sample app to review it at its full 380px width.</p></aside>
    </div></>}
  </PageShell>;
}

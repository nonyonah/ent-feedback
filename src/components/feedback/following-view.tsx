"use client";
import * as React from "react";
import Link from "next/link";
import { useProject } from "@/components/feedback/project-provider";
import { boardHref } from "@/lib/project-links";
import { BellIcon } from "@phosphor-icons/react/dist/ssr/Bell";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { PageShell } from "@/components/feedback/page-shell";
import { BoardFeedbackRow } from "@/components/feedback/board-feedback-row";
import { useFeedback } from "@/components/feedback/feedback-provider";
function subscribe(fn:()=>void){window.addEventListener("storage",fn);window.addEventListener("ent-follow-change",fn);return()=>{window.removeEventListener("storage",fn);window.removeEventListener("ent-follow-change",fn);};}
function snapshot(){try{return Object.keys(localStorage).filter(key=>key.startsWith("ent-follow:")&&localStorage.getItem(key)==="true").sort().join("|");}catch{return "";}}
export function FollowingView({ demo = false }: { demo?: boolean }) {
  const {project,activeBoard}=useProject();
  const publicHref=activeBoard?boardHref(project,activeBoard):"/project";
  const {items}=useFeedback();const keys=React.useSyncExternalStore(subscribe,snapshot,()=> "");const followed=demo?items.slice(0,3):items.filter(item=>keys.split("|").includes("ent-follow:"+item.id));
  return <PageShell backHref={publicHref} backLabel="Back to the board" eyebrow="Your corner of the conversation" title="Following" description="The ideas you’re keeping an eye on, all in one place.">
    <div className="mb-5 flex justify-end"><Button variant="outline" render={<Link href="/preferences"/>}>Notification preferences</Button></div>
    {followed.length?<div className="flex flex-col">{followed.map(item=><div key={item.id} className="border-b last:border-0"><BoardFeedbackRow item={item}/></div>)}</div>:<Empty className="rounded-lg border py-14"><EmptyMedia variant="icon"><BellIcon weight="bold"/></EmptyMedia><EmptyHeader><EmptyTitle>A good idea is worth following.</EmptyTitle><EmptyDescription>Follow a post to keep it here. You can find the follow action beside any conversation.</EmptyDescription></EmptyHeader><EmptyContent><Button render={<Link href={publicHref}/>}>Explore feedback</Button></EmptyContent></Empty>}
    {demo&&<p className="mt-5 text-xs text-muted-foreground">Sample followed posts for design review.</p>}
  </PageShell>;
}

"use client";
import {EmptyIllustration} from "./empty-illustration";
import * as React from "react";
import {useUser} from "@clerk/nextjs";
import {loadFollowingAction} from "@/server/actions/feedback";
import type {FeedbackItemData} from "@/lib/feedback-data";
import Link from "next/link";
import { useProject } from "@/components/feedback/project-provider";
import { boardHref } from "@/lib/project-links";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { PageShell } from "@/components/feedback/page-shell";
import { BoardFeedbackRow } from "@/components/feedback/board-feedback-row";

export function FollowingView() {
  const {project,activeBoard}=useProject();
  const publicHref=activeBoard?boardHref(project,activeBoard):"/dashboard/boards";
  const {user,isLoaded}=useUser();const key=project.id+':'+(user?.id??'guest');
  const [snapshot,setSnapshot]=React.useState<{key:string;items:FeedbackItemData[];error:string}|null>(null);
  const [attempt,setAttempt]=React.useState(0);
  React.useEffect(()=>{let cancelled=false;if(!isLoaded||!user)return;void loadFollowingAction(project.id).then(result=>{if(cancelled)return;setSnapshot({key,items:result.ok?result.data.items:[],error:result.ok?'':result.error.message});}).catch(()=>{if(!cancelled)setSnapshot({key,items:[],error:'Followed posts could not be loaded.'});});return()=>{cancelled=true;};},[isLoaded,user,key,project.id,attempt]);
  const loading=!isLoaded||Boolean(user&&snapshot?.key!==key);const followed=snapshot?.key===key?snapshot.items:[];const error=snapshot?.key===key?snapshot.error:'';
  return <PageShell backHref={publicHref} backLabel="Back to the board" eyebrow="Your corner of the conversation" title="Following" description="The ideas you’re keeping an eye on, all in one place.">
    <div className="mb-5 flex justify-end"><Button variant="outline" render={<Link href="/dashboard?notifications=open"/>}>Notification preferences</Button></div>
    {error?<div role="alert">{error}<Button variant="ghost" onClick={()=>setAttempt(value=>value+1)}>Retry</Button></div>:loading?<p role="status">Loading feedback…</p>:followed.length?<div className="flex flex-col">{followed.map(item=><div key={item.id} className="border-b last:border-0"><BoardFeedbackRow item={item}/></div>)}</div>:<Empty className="rounded-lg border py-14"><EmptyIllustration variant="notifications"/><EmptyHeader><EmptyTitle>No followed posts</EmptyTitle><EmptyDescription>Follow a post to see it here.</EmptyDescription></EmptyHeader><EmptyContent><Button render={<Link href={publicHref}/>}>Explore feedback</Button></EmptyContent></Empty>}

  </PageShell>;
}

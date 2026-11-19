"use client";
import {PublicPageHeading} from "./public-page-heading";
import {PublicLoadError} from "./public-load-error";
import toolbarStyles from "./board-toolbar.module.css";
import {EmptyIllustration} from "./empty-illustration";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
export function BoardLoading() {
  return <main id="public-content" tabIndex={-1} className="scroll-mt-28 md:scroll-mt-16 mx-auto w-full max-w-5xl px-4 pb-28 pt-12 sm:px-8" role="status" aria-label="Loading feedback">
    <div className={toolbarStyles.container}><div className={toolbarStyles.toolbar}>
      <PublicPageHeading resource="feedback"/>
      <div aria-hidden="true" className={toolbarStyles.actions}>
        <Skeleton className={"motion-reduce:animate-none w-10 rounded-lg "+toolbarStyles.controlSkeleton}/>
        <Skeleton className={"motion-reduce:animate-none min-w-0 w-24 rounded-lg "+toolbarStyles.controlSkeleton}/>
        <Skeleton className={"motion-reduce:animate-none w-32 rounded-lg "+toolbarStyles.controlSkeleton}/>
      </div>
    </div></div>
    <div aria-hidden="true">
      <div className="mt-6 flex flex-col gap-2">{[1,2,3].map(n=><div key={n} className="flex gap-4 rounded-lg p-3 sm:p-4"><Skeleton className="motion-reduce:animate-none h-7 w-12 shrink-0 rounded-xl"/><div className="flex min-w-0 flex-1 flex-col gap-3"><Skeleton className="motion-reduce:animate-none h-5 w-4/5"/><Skeleton className="motion-reduce:animate-none h-4 w-full"/><Skeleton className="motion-reduce:animate-none h-4 w-3/5"/><Skeleton className="motion-reduce:animate-none h-5 w-1/3"/></div></div>)}</div>
    </div>
    <span className="sr-only">Loading feedback…</span>
  </main>;
}
export function BoardState({ kind, onRetry }: { kind:"empty"|"error"|"no-results"; onRetry?:()=>void }) {
  if(kind==="error")return <PublicLoadError resource="feedback" onRetry={onRetry??(()=>window.location.reload())}/>;
  const content={empty:{title:"No feedback yet",description:"Share the first idea."},"no-results":{title:"No matching feedback",description:"Try another search or status."}}[kind];
  return <Empty className="rounded-lg border px-6 py-16"><EmptyIllustration variant={kind==="no-results"?"search":"empty"}/><EmptyHeader><EmptyTitle>{content.title}</EmptyTitle><EmptyDescription>{content.description}</EmptyDescription></EmptyHeader><EmptyContent><Button render={<Link href={kind==="empty"?"/submit":"/"}/>}>{kind==="empty"?"Share the first idea":"View all feedback"}</Button><Link href="/dashboard/boards" className="text-xs text-muted-foreground hover:underline">Open project</Link></EmptyContent></Empty>;
}

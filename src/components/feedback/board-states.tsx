"use client";
import * as React from "react";
import Link from "next/link";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { ChatTextIcon } from "@phosphor-icons/react/dist/ssr/ChatText";
import { WifiSlashIcon } from "@phosphor-icons/react/dist/ssr/WifiSlash";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
export function BoardLoading() {
  return <div className="mx-auto w-full max-w-[720px] px-4 py-12" role="status" aria-label="Loading feedback"><Skeleton className="mb-4 h-8 w-48"/><Skeleton className="mb-10 h-4 w-64 max-w-full"/><div className="mb-5 flex gap-2">{[1,2,3].map(n=><Skeleton key={n} className="h-8 w-20 rounded-full"/>)}</div><div className="flex flex-col gap-6">{[1,2,3].map(n=><div key={n} className="flex gap-4"><Skeleton className="h-8 w-12 shrink-0 rounded-full"/><div className="flex flex-1 flex-col gap-3"><Skeleton className="h-5 w-4/5"/><Skeleton className="h-4 w-full"/><Skeleton className="h-3 w-1/3"/></div></div>)}</div><span className="sr-only">Loading feedback…</span></div>;
}
export function BoardState({ kind, onRetry }: { kind:"empty"|"error"|"no-results"; onRetry?:()=>void }) {
  const [retrying,setRetrying]=React.useState(false);
  const content={empty:{title:"Every great product starts with an idea.",description:"Be the first to share what would make this product better.",icon:ChatTextIcon},error:{title:"We couldn’t load the conversation.",description:"Your ideas aren’t going anywhere. Check your connection, then give it another try.",icon:WifiSlashIcon},"no-results":{title:"No ideas found. Yet.",description:"Try a different search or status. Your next great idea might be a few words away.",icon:MagnifyingGlassIcon}}[kind];const Icon=content.icon;
  return <Empty className="rounded-lg border px-6 py-16"><EmptyMedia variant="icon"><Icon weight="bold"/></EmptyMedia><EmptyHeader><EmptyTitle>{content.title}</EmptyTitle><EmptyDescription>{content.description}</EmptyDescription></EmptyHeader><EmptyContent>{kind==="error"?<Button disabled={retrying} onClick={()=>{if(onRetry)onRetry();else{setRetrying(true);window.setTimeout(()=>setRetrying(false),600);}}}>{retrying?"Trying again…":"Try again"}</Button>:<Button render={<Link href={kind==="empty"?"/submit":"/"}/>}>{kind==="empty"?"Share the first idea":"View all feedback"}</Button>}<Link href="/project" className="text-xs text-muted-foreground hover:underline">Open project</Link></EmptyContent></Empty>;
}

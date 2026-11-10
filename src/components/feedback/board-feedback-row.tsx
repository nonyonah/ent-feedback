"use client";
import {TrendingBadge} from "./trending-badge";
import {FeedbackTypeLabel} from "./feedback-type-label";

import Link from "next/link";
import { ArrowUpIcon } from "@/components/icons";
import { ChatIcon as MessageSquareIcon } from "@/components/icons";
import { PushPinIcon as PinIcon } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { type FeedbackItemData } from "@/lib/feedback-data";
import { cn } from "@/lib/utils";
import { useProject } from "./project-provider";
import { feedbackHref } from "@/lib/project-links";
import { StatusLabel } from "@/components/feedback/status-label";

export function BoardFeedbackRow({ item }: { item: FeedbackItemData }): React.ReactElement {
  const { vote } = useFeedback();
  const { project } = useProject();
  const href = feedbackHref(project, item.id);
  const participants = [...new Map(item.comments.map((comment) => [comment.author, comment])).values()].slice(0, 2);

  return (
    <Card render={<article />} className="grid grid-cols-[48px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 sm:grid-cols-[48px_minmax(0,1fr)_auto] rounded-lg border-0 p-3 shadow-none before:hidden hover:bg-muted/30 sm:gap-x-4 sm:p-4">
      <Button
        aria-label={(item.voted ? "Remove vote from " : "Vote for ") + item.title}
        aria-pressed={item.voted}
        className="relative -mt-2 min-h-11 w-12 shrink-0 rounded-full p-0 hover:bg-transparent sm:min-h-11"
        onClick={() => vote(item.id)}
        variant="ghost"
      >
        <span className={cn("flex h-[26px] w-12 items-center justify-center gap-0.5 rounded-full border bg-background text-xs font-semibold tabular-nums text-muted-foreground transition-colors", item.voted ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary")}>
          <ArrowUpIcon aria-hidden="true" className="size-3.5!" />
          {item.votes}
        </span>
      </Button>
      <div className="min-w-0 flex-1">
        <Link className="break-words text-pretty text-sm font-semibold leading-5 tracking-tight outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring" href={href}>
          {item.pinned && <PinIcon aria-label="Pinned" className="me-1 inline size-3.5 text-muted-foreground" />}
          {item.title}
        </Link><TrendingBadge id={item.id} className="ms-2 align-middle"/>
        <p className="mt-2 line-clamp-2 break-words text-base leading-[1.5] text-muted-foreground">{item.description}</p>
      </div>
      <Link className="-mt-2 hidden min-h-11 shrink-0 items-center gap-2 rounded-md outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring sm:flex" href={href} aria-label={item.comments.length + " comments on " + item.title}>
        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">{item.comments.length}<MessageSquareIcon aria-hidden="true" className="size-4" /></span>
        {participants.length > 0 && <AvatarGroup style={{ "--avatar-size": "24px" } as React.CSSProperties}>{participants.map((person) => <Avatar key={person.author} aria-label={person.author}><AvatarImage src={person.avatarUrl} alt=""/><AvatarFallback seed={person.author}/></Avatar>)}</AvatarGroup>}
      </Link>
      <div style={{gridColumn:"2 / -1"}} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-4"><span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground"><Avatar className="size-5"><AvatarImage src={item.avatarUrl} alt=""/><AvatarFallback seed={item.author}/></Avatar><span className="truncate">{item.author}</span></span><StatusLabel status={item.status}/><Link className="inline-flex h-7 shrink-0 items-center gap-1 text-muted-foreground sm:hidden" href={href} aria-label={item.comments.length+" comments on "+item.title}>{item.comments.length}<MessageSquareIcon className="size-3.5"/></Link><span data-slot="feedback-type-chip" className="ms-auto shrink-0 rounded-full bg-control-quiet px-2 py-1 text-xs text-muted-foreground"><FeedbackTypeLabel category={item.category??"feedback"}/></span></div>{Boolean(item.tags?.length)&&<div style={{gridColumn:"2 / -1"}} className="flex flex-wrap gap-1.5">{item.tags?.map(tag=><span key={tag.id} className="max-w-full break-words rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{tag.name}</span>)}</div>}
    </Card>
  );
}

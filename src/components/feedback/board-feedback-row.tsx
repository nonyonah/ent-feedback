"use client";

import Link from "next/link";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { ChatIcon as MessageSquareIcon } from "@phosphor-icons/react/dist/ssr/Chat";
import { PushPinIcon as PinIcon } from "@phosphor-icons/react/dist/ssr/PushPin";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { type FeedbackItemData } from "@/lib/feedback-data";
import { cn } from "@/lib/utils";
import { StatusLabel } from "@/components/feedback/status-label";

export function BoardFeedbackRow({ item }: { item: FeedbackItemData }): React.ReactElement {
  const { vote } = useFeedback();
  const participants = [...new Map(item.comments.map((comment) => [comment.author, comment])).values()].slice(0, 2);

  return (
    <Card render={<article />} className="flex-row items-start gap-3 rounded-lg border-0 p-3 shadow-none before:hidden hover:bg-muted/30 sm:gap-4 sm:p-4">
      <Button
        aria-label={(item.voted ? "Remove vote from " : "Vote for ") + item.title}
        aria-pressed={item.voted}
        className="relative -mt-2 min-h-11 w-12 shrink-0 rounded-full p-0 hover:bg-transparent sm:min-h-11"
        onClick={() => vote(item.id)}
        variant="ghost"
      >
        <span className={cn("flex h-[26px] w-12 items-center justify-center gap-0.5 rounded-full border bg-background text-xs font-semibold tabular-nums text-muted-foreground transition-colors", item.voted ? "border-vote-active-border bg-vote-active-bg text-primary" : "border-border hover:border-primary")}>
          <ArrowUpIcon weight="bold" aria-hidden="true" className="size-3.5!" />
          {item.votes}
        </span>
      </Button>
      <div className="min-w-0 flex-1">
        <Link className="text-pretty text-lg font-semibold leading-7 tracking-tight outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring" href={"/items/" + item.id}>
          {item.pinned && <PinIcon weight="bold" aria-label="Pinned" className="mr-1 inline size-3.5 text-muted-foreground" />}
          {item.title}
        </Link>
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">{item.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-4">
          <span className="text-muted-foreground">{item.author}</span>
          <StatusLabel status={item.status} />
        </div>
        <Link className="mt-1 inline-flex min-h-11 items-center gap-1 rounded-md text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:hidden" href={"/items/" + item.id} aria-label={item.comments.length + " comments on " + item.title}>{item.comments.length}<MessageSquareIcon weight="bold" aria-hidden="true" className="size-4" /></Link>
      </div>
      <Link className="-mt-2 hidden min-h-11 shrink-0 items-center gap-2 rounded-md outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring sm:flex" href={"/items/" + item.id} aria-label={item.comments.length + " comments on " + item.title}>
        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">{item.comments.length}<MessageSquareIcon weight="bold" aria-hidden="true" className="size-4" /></span>
        {participants.length > 0 && <AvatarGroup style={{ "--avatar-size": "24px" } as React.CSSProperties}>{participants.map((person) => <Avatar key={person.author} aria-label={person.author}><AvatarFallback>{person.initials}</AvatarFallback></Avatar>)}</AvatarGroup>}
      </Link>
    </Card>
  );
}

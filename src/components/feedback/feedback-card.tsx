"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatusTag } from "@/components/feedback/status-tag";
import { VoteButton } from "@/components/feedback/vote-button";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { cn } from "@/lib/utils";
import type { FeedbackItemData } from "@/lib/feedback-data";

export function FeedbackCard({
  item,
  className,
}: {
  item: FeedbackItemData;
  className?: string;
}): React.ReactElement {
  const { vote } = useFeedback();

  return (
    <Card
      className={cn(
        "w-full flex-row items-start gap-4 rounded-lg border-border bg-card p-4 transition-shadow duration-200 before:rounded-[calc(var(--radius-lg)-1px)] hover:shadow-sm focus-within:ring-2 focus-within:ring-ring/40",
        item.pinned && "border-primary",
        className,
      )}
    >
      <VoteButton onVote={() => vote(item.id)} voted={item.voted} votes={item.votes} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <Link
            className="block text-pretty text-lg font-semibold leading-7 tracking-tight outline-none hover:underline hover:underline-offset-4 focus-visible:underline focus-visible:underline-offset-4"
            href={`/items/${item.id}`}
          >
            {item.pinned && <span className="sr-only">Pinned: </span>}
            {item.title}
          </Link>
          <StatusTag className="shrink-0" status={item.status} />
        </div>

        <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
          {item.description}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-4 text-muted-foreground">
          <span>
            {item.comments.length}{" "}
            {item.comments.length === 1 ? "comment" : "comments"}
          </span>
          <span>{item.author}</span>
          <span>{item.createdAt}</span>
        </div>
      </div>
    </Card>
  );
}

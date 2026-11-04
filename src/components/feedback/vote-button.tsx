"use client";

import { CaretUpIcon as ChevronUpIcon } from "@phosphor-icons/react/dist/ssr/CaretUp";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VoteButton({
  votes,
  voted,
  onVote,
  className,
}: {
  votes: number;
  voted: boolean;
  onVote: () => void;
  className?: string;
}): React.ReactElement {
  return (
    <Button
      aria-label={voted ? "Remove your vote" : "Vote for this idea"}
      aria-pressed={voted}
      className={cn(
        "h-14 w-12 shrink-0 flex-col gap-0.5 rounded-lg border px-0 py-2 shadow-none transition-[transform,background-color,border-color,color] duration-150 before:hidden active:scale-95 motion-reduce:transform-none sm:h-14 sm:w-12",
        voted
          ? "border-vote-active-border bg-vote-active-bg text-primary hover:border-vote-active-border hover:bg-vote-active-bg"
          : "border-border bg-background text-foreground hover:border-primary hover:bg-background",
        className,
      )}
      onClick={onVote}
      variant="outline"
    >
      <ChevronUpIcon weight="bold"
        aria-hidden="true"
        className={cn("size-4", voted ? "text-primary" : "text-muted-foreground")}
        />
      <span
        className={cn(
          "text-sm font-semibold leading-5 tabular-nums",
          voted && "text-primary",
        )}
      >
        {votes}
      </span>
    </Button>
  );
}

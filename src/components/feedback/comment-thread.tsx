"use client";

import * as React from "react";
import { HeartIcon } from "@phosphor-icons/react/dist/ssr/Heart";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { cn } from "@/lib/utils";
import type { FeedbackItemData } from "@/lib/feedback-data";

export function CommentThread({
  item, variant = "default",
}: {
  item: FeedbackItemData;
  variant?: "default" | "dashboard";
}): React.ReactElement {
  const { addComment, toggleCommentLike } = useFeedback();
  const [body, setBody] = React.useState("");
  const composerRef = React.useRef<HTMLTextAreaElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!body.trim()) {
      return;
    }

    addComment(item.id, body);
    setBody("");
    toastManager.add({
      description: "Your comment is now visible to everyone.",
      title: "Comment posted",
      type: "success",
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        {item.comments.length === 0 && (
          <p className="text-sm leading-5 text-muted-foreground">
            No comments yet. Start the conversation.
          </p>
        )}

        {item.comments.map((comment) => {
          const isOwner = comment.kind === "owner";

          return (
            <article className="group flex items-start gap-3" key={comment.id}>
              <Avatar
                className="size-8"
                style={{ "--avatar-size": "2rem" } as React.CSSProperties}
              >
                <AvatarFallback
                  className={cn(
                    "bg-muted text-xs text-muted-foreground",
                    isOwner && "bg-primary/10 text-primary",
                  )}
                >
                  {comment.initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium leading-5">
                    {comment.author}
                  </span>
                  <span className="text-xs leading-4 text-muted-foreground">
                    {comment.time}
                  </span>
                  {isOwner && (
                    <span className="inline-flex items-center rounded-lg bg-vote-active-bg px-1.5 py-px text-xs font-medium leading-4 text-primary">
                      Team
                    </span>
                  )}
                </div>

                <p className="whitespace-pre-line text-sm leading-5 text-foreground">
                  {comment.body}
                </p>

                <div className="-ms-2 flex items-center gap-1 self-start">
                  <Button
                    aria-label={(comment.liked ? "Unlike" : "Like") + " comment by " + comment.author}
                    aria-pressed={Boolean(comment.liked)}
                    className={cn("min-h-11 min-w-11 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground sm:h-6 sm:min-h-6 sm:min-w-6", comment.liked && "text-primary hover:text-primary")}
                    onClick={() => toggleCommentLike(item.id, comment.id)}
                    size="xs"
                    variant="ghost"
                  >
                    <HeartIcon weight={comment.liked ? "fill" : "bold"} aria-hidden="true" />
                    {(comment.likes ?? 0) > 0 && <span className="tabular-nums">{comment.likes}</span>}
                  </Button>
                  <Button
                    className="min-h-11 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:text-foreground sm:h-6 sm:min-h-6"
                    onClick={() => composerRef.current?.focus()}
                    size="xs"
                    variant="ghost"
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <form className={cn("flex flex-col gap-3", variant === "dashboard" && "order-first rounded-[20px] border border-border/60 bg-muted/30 p-2")} onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="new-comment">
          Add a comment
        </label>
        <Textarea
          className={cn("shadow-none [&_textarea]:min-h-24 [&_textarea]:sm:min-h-24", variant === "dashboard" && "border-0 bg-transparent ring-0 before:hidden [&_textarea]:min-h-14 [&_textarea]:sm:min-h-14")}
          id="new-comment"
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add a comment or share more context…"
          ref={composerRef}
          value={body}
        />
        <div className="flex justify-end">
          <Button
            className="min-h-11 sm:h-7 sm:min-h-7"
            disabled={!body.trim()}
            type="submit"
          >
            Comment
          </Button>
        </div>
      </form>
    </div>
  );
}

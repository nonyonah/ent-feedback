"use client";

import * as React from "react";
import {features} from "@/lib/features";
import {ComposerTools,AttachmentPreview} from "@/components/feedback/composer-tools";
import { HeartIcon } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const { addComment, toggleCommentLike, pending } = useFeedback();
  const [images,setImages]=React.useState<string[]>([]);
  const [body, setBody] = React.useState("");
  const composerRef = React.useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!body.trim()&&!images.length) {
      return;
    }

    try {
    await addComment(item.id, body, images);
    setImages([]);
    setBody("");
    toastManager.add({
      description: "Your comment is now visible to everyone.",
      title: "Comment posted",
      type: "success",
    });
    }catch(error){toastManager.add({title:"Comment wasn’t posted",description:error instanceof Error?error.message:"Try again. Your draft is still here.",type:"error"});}
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
          const isOwner = features.teams && comment.kind === "owner";

          return (
            <article className="group flex items-start gap-3" key={comment.id}>
              <Avatar
                className="size-8"
                style={{ "--avatar-size": "2rem" } as React.CSSProperties}
              >
                <AvatarImage src={comment.avatarUrl} alt=""/>
                <AvatarFallback
                  className={cn(
                    "bg-muted text-xs text-muted-foreground",
                    isOwner && "bg-primary/10 text-primary-text",
                  )}
                 seed={comment.author}/>
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
                    <span className="inline-flex items-center rounded-lg bg-vote-active-bg px-1.5 py-px text-xs font-medium leading-4 text-primary-text">
                      Team
                    </span>
                  )}
                </div>

                <p className="whitespace-pre-line text-base leading-[1.5] text-foreground">
                  {comment.body}
                </p>

                {comment.images?.length?<AttachmentPreview images={comment.images}/>:null}
                <div className="-ms-2 flex items-center gap-1 self-start">
                  <Button
                    aria-label={(comment.liked ? "Unlike" : "Like") + " comment by " + comment.author}
                    aria-pressed={Boolean(comment.liked)}
                    className={cn("min-h-11 min-w-11 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground sm:h-6 sm:min-h-6 sm:min-w-6", comment.liked && "text-primary hover:text-primary [&_svg]:opacity-100")}
                    onClick={() => toggleCommentLike(item.id, comment.id)}
                    size="xs"
                    variant="ghost"
                  >
                    <HeartIcon  aria-hidden="true" />
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
          disabled={pending}
          id="new-comment"
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add a comment or share more context…"
          ref={composerRef}
          value={body}
        />
        <div className="flex items-end justify-between gap-3"><ComposerTools disabled={pending} value={body} onChange={setBody} inputRef={composerRef} images={images} onImagesChange={setImages}/>
          <Button
            className="min-h-11 sm:h-7 sm:min-h-7"
            disabled={pending||(!body.trim()&&!images.length)}
            type="submit"
          >
            Comment
          </Button>
        </div>
      </form>
    </div>
  );
}

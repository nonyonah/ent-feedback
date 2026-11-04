"use client";

import * as React from "react";
import Link from "next/link";
import { useProject } from "@/components/feedback/project-provider";
import { boardHref } from "@/lib/project-links";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { UsersIcon } from "@phosphor-icons/react/dist/ssr/Users";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toastManager } from "@/components/ui/toast";
import { CommentThread } from "@/components/feedback/comment-thread";
import { StatusLabel } from "@/components/feedback/status-label";
import { PostActionIcon } from "@/components/feedback/post-action-icons";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { cn } from "@/lib/utils";

function subscribeToFollowing(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener("ent-follow-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("ent-follow-change", callback);
  };
}

function PostActions({ id, title }: { id: string; title: string }): React.ReactElement {
  const key = "ent-follow:" + id;
  const following = React.useSyncExternalStore(subscribeToFollowing, () => {
    try { return window.localStorage.getItem(key) === "true"; } catch { return false; }
  }, () => false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState("");

  function toggleFollowing(): void {
    try {
      window.localStorage.setItem(key, String(!following));
      window.dispatchEvent(new Event("ent-follow-change"));
      toastManager.add({ title: following ? "Unfollowed post" : "Following post", description: "Your preference is saved in this browser.", type: "success" });
    } catch {
      toastManager.add({ title: "Couldn’t save your preference", description: "Browser storage is unavailable. Please try again.", type: "error" });
    }
  }

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(new URL("/items/" + id, window.location.origin).href);
      toastManager.add({ title: "Link copied", type: "success" });
    } catch {
      setShareUrl(new URL("/items/" + id, window.location.origin).href);
      setShareOpen(true);
      toastManager.add({ title: "Copy the link below", description: "Select the post address and copy it manually.", type: "info" });
    }
  }

  async function share(): Promise<void> {
    const url = new URL("/items/" + id, window.location.origin).href;
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; }
      catch (error) { if (error instanceof Error && error.name === "AbortError") return; }
    }
    setShareUrl(url);
    setShareOpen(true);
  }

  return <>
    <div className="flex flex-col items-stretch gap-1">
      <Button aria-pressed={following} className="min-h-11 justify-start pl-0 pr-3 text-muted-foreground hover:bg-transparent hover:text-black sm:min-h-9 [&_svg]:opacity-100" variant="ghost" onClick={toggleFollowing}>{following ? <CheckIcon weight="bold" data-icon="inline-start" /> : <PostActionIcon name="bell" data-icon="inline-start" />}{following ? "Following this post" : "Follow this post"}</Button>
      <Button className="min-h-11 justify-start pl-0 pr-3 text-muted-foreground hover:bg-transparent hover:text-black sm:min-h-9 [&_svg]:opacity-100" variant="ghost" onClick={() => void copyLink()}><PostActionIcon name="link" data-icon="inline-start" />Copy link</Button>
      <Button className="min-h-11 justify-start pl-0 pr-3 text-muted-foreground hover:bg-transparent hover:text-black sm:min-h-9 [&_svg]:opacity-100" variant="ghost" onClick={() => void share()}><PostActionIcon name="share" data-icon="inline-start" />Share</Button>
    </div>
    <Dialog open={shareOpen} onOpenChange={setShareOpen}>
      <DialogPopup><DialogHeader><DialogTitle>Share this post</DialogTitle><DialogDescription>Send this link to someone who would like to join the conversation.</DialogDescription></DialogHeader><DialogPanel className="flex flex-col gap-3"><Input aria-label="Post link" value={shareUrl} readOnly onFocus={(event) => event.target.select()} /><Button onClick={() => void copyLink()}><PostActionIcon name="link" data-icon="inline-start" />Copy link</Button></DialogPanel></DialogPopup>
    </Dialog>
  </>;
}

export function ItemDetail({ id }: { id: string }): React.ReactElement {
  const {project,activeBoard}=useProject();
  const publicHref=activeBoard?boardHref(project,activeBoard):"/project";
  const { items, vote } = useFeedback();
  const item = items.find((candidate) => candidate.id === id);

  if (!item) {
    return <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">This idea is no longer here</h1>
      <p className="mt-2 max-w-sm text-sm leading-5 text-muted-foreground">It may have been merged with another request. Browse the board to see what everyone is voting on.</p>
      <Button className="mt-6 min-h-11" render={<Link href={publicHref} />} variant="outline"><ArrowLeftIcon weight="bold" data-icon="inline-start" />Back to the board</Button>
    </main>;
  }

  return (
    <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <Link className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8" href={publicHref}><ArrowLeftIcon weight="bold" aria-hidden="true" className="size-4" />All feedback</Link>
      <div className="mt-5 grid min-w-0 grid-cols-1 gap-y-8 lg:grid-cols-[minmax(0,648px)_232px] lg:gap-x-14">
        <section aria-labelledby="post-title" className="min-w-0">
          <div className="flex items-start gap-4">
            <Button aria-label={item.voted ? "Remove your vote" : "Vote for this idea"} aria-pressed={item.voted} className="min-h-11 w-[54px] shrink-0 rounded-full p-0 hover:bg-transparent sm:min-h-11" variant="ghost" onClick={() => vote(item.id)}>
              <span className={cn("flex h-8 w-[54px] items-center justify-center gap-0.5 rounded-full border text-sm font-semibold tabular-nums", item.voted ? "border-vote-active-border bg-vote-active-bg text-primary" : "border-border bg-background text-muted-foreground")}><ArrowUpIcon weight="bold" aria-hidden="true" className="size-3.5!" />{item.votes}</span>
            </Button>
            <div className="flex min-w-0 flex-1 flex-col gap-2"><h1 id="post-title" className="text-pretty text-2xl font-semibold leading-8 tracking-tight">{item.title}</h1><p className="flex items-center gap-1.5 text-xs leading-4 text-muted-foreground"><UsersIcon weight="bold" aria-hidden="true" className="size-4" />{item.votes} {item.votes === 1 ? "person has" : "people have"} voted for this</p></div>
          </div>
          <p className="mt-5 whitespace-pre-wrap break-words text-pretty text-sm leading-6">{item.description}</p>
        </section>

        <aside aria-label="Post information" className="rounded-lg border p-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start lg:rounded-none lg:border-0 lg:p-0">
          <section aria-labelledby="author-heading"><h2 id="author-heading" className="mb-3 text-xs font-medium text-muted-foreground">Author</h2><div className="flex items-center gap-3"><Avatar className="size-8"><AvatarFallback className="bg-muted text-xs text-muted-foreground">{item.initials}</AvatarFallback></Avatar><div className="min-w-0"><p className="break-words text-sm font-medium">{item.author}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.createdAt}</p></div></div></section>
          <Separator className="my-6" />
          <section aria-labelledby="details-heading"><h2 id="details-heading" className="mb-3 text-xs font-semibold uppercase text-foreground">Details</h2><dl className="flex w-[138px] items-start justify-between gap-[9px]"><dt className="text-sm leading-5 text-muted-foreground">Status</dt><dd><StatusLabel status={item.status} /></dd></dl></section>
          <Separator className="my-6" />
          <section aria-labelledby="actions-heading"><h2 id="actions-heading" className="mb-2 text-xs font-semibold uppercase text-foreground">Actions</h2><PostActions id={item.id} title={item.title} /></section>
        </aside>

        <section aria-labelledby="conversation-heading" className="min-w-0 border-t pt-6 lg:col-start-1">
          <h2 id="conversation-heading" className="text-base font-semibold leading-6">Conversation</h2>
          <div className="mt-5"><CommentThread key={item.id} item={item} /></div>
        </section>
      </div>
    </main>
  );
}

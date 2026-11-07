"use client";
import {TrendingBadge} from "./trending-badge";
import {Select,SelectTrigger,SelectValue,SelectPopup,SelectItem} from "@/components/ui/select";
import {FeedbackTypeLabel} from "./feedback-type-label";
import {FEEDBACK_CATEGORIES,type FeedbackCategory} from "@/lib/feedback-data";

import * as React from "react";
import Link from "next/link";
import { useProject } from "@/components/feedback/project-provider";
import { boardHref } from "@/lib/project-links";
import { ArrowLeftIcon } from "@/components/icons";
import { ArrowUpIcon } from "@/components/icons";
import { CheckIcon } from "@/components/icons";
import { UsersIcon } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

function PostActions({ id, title }: { id: string; title: string }): React.ReactElement {
  const {items,toggleFollow,pending}=useFeedback();
  const following=Boolean(items.find(item=>item.id===id)?.following);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState("");

  async function toggleFollowing(): Promise<void> {
    try {
      await toggleFollow(id);
      toastManager.add({title:following?"Unfollowed post":"Following post",description:following?undefined:"You’ll receive comments and status updates.",type:"success"});
    } catch(error) {
      toastManager.add({title:"Couldn’t save your preference",description:error instanceof Error?error.message:"Please try again.",type:"error"});
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
    <div className="flex flex-col items-stretch gap-0">
      <Button disabled={pending} aria-pressed={following} className="min-h-11 justify-start pl-0 pr-3 text-muted-foreground hover:bg-transparent hover:text-black dark:hover:text-foreground sm:h-7 sm:min-h-7 [&_svg]:opacity-100" variant="ghost" onClick={()=>void toggleFollowing()}>{following ? <CheckIcon data-icon="inline-start" /> : <PostActionIcon name="bell" data-icon="inline-start" />}{following ? "Following this post" : "Follow this post"}</Button>
      <Button className="min-h-11 justify-start pl-0 pr-3 text-muted-foreground hover:bg-transparent hover:text-black dark:hover:text-foreground sm:h-7 sm:min-h-7 [&_svg]:opacity-100" variant="ghost" onClick={() => void copyLink()}><PostActionIcon name="link" data-icon="inline-start" />Copy link</Button>
      <Button className="min-h-11 justify-start pl-0 pr-3 text-muted-foreground hover:bg-transparent hover:text-black dark:hover:text-foreground sm:h-7 sm:min-h-7 [&_svg]:opacity-100" variant="ghost" onClick={() => void share()}><PostActionIcon name="share" data-icon="inline-start" />Share</Button>
    </div>
    <Dialog open={shareOpen} onOpenChange={setShareOpen}>
      <DialogPopup><DialogHeader><DialogTitle>Share this post</DialogTitle><DialogDescription>Send this link to someone who would like to join the conversation.</DialogDescription></DialogHeader><DialogPanel className="flex flex-col gap-3"><Input aria-label="Post link" value={shareUrl} readOnly onFocus={(event) => event.target.select()} /><Button onClick={() => void copyLink()}><PostActionIcon name="link" data-icon="inline-start" />Copy link</Button></DialogPanel></DialogPopup>
    </Dialog>
  </>;
}

export function ItemDetail({ id,boardId }: { id: string;boardId?:string }): React.ReactElement {
  const {project,activeBoard,selectBoard}=useProject();
  React.useEffect(()=>{if(boardId&&activeBoard?.id!==boardId)selectBoard(boardId);},[boardId,activeBoard?.id,selectBoard]);
  const publicHref=activeBoard?boardHref(project,activeBoard):"/dashboard/boards";
  const { items, vote,loading,error,updateCategory,pending } = useFeedback();
  const item = items.find((candidate) => candidate.id === id);

  if(loading||(boardId&&activeBoard?.id!==boardId))return <main role="status" className="p-8 text-center text-sm">Loading feedback…</main>;
  if(error)return <main className="p-8 text-center text-sm">Feedback could not be loaded. Use Retry loading feedback above.</main>;
  if (!item) {
    return <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">This idea is no longer here</h1>
      <p className="mt-2 max-w-sm text-sm leading-5 text-muted-foreground">It may have been merged with another request. Browse the board to see what everyone is voting on.</p>
      <Button className="mt-6 min-h-11" render={<Link href={publicHref} />} variant="outline"><ArrowLeftIcon data-icon="inline-start" />Back to the board</Button>
    </main>;
  }

  return (
    <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <Link className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8" href={publicHref}><ArrowLeftIcon aria-hidden="true" className="size-4" />All feedback</Link>
      <div className="mt-5 grid min-w-0 grid-cols-1 gap-y-8 lg:grid-cols-[minmax(0,648px)_232px] lg:gap-x-14">
        <section aria-labelledby="post-title" className="min-w-0">
          <div className="flex items-start gap-4">
            <Button aria-label={item.voted ? "Remove your vote" : "Vote for this idea"} aria-pressed={item.voted} className="min-h-11 w-[54px] shrink-0 rounded-full p-0 hover:bg-transparent sm:min-h-11" variant="ghost" onClick={() => vote(item.id)}>
              <span className={cn("flex h-8 w-[54px] items-center justify-center gap-0.5 rounded-full border text-sm font-semibold tabular-nums", item.voted ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground")}><ArrowUpIcon aria-hidden="true" className="size-3.5!" />{item.votes}</span>
            </Button>
            <div className="flex min-w-0 flex-1 flex-col gap-2"><h1 id="post-title" className="text-pretty text-2xl font-semibold leading-8 tracking-tight">{item.title}</h1><TrendingBadge id={item.id}/><p className="flex items-center gap-1.5 text-xs leading-5 text-muted-foreground"><UsersIcon aria-hidden="true" className="size-4" />{item.votes} {item.votes === 1 ? "person has" : "people have"} voted for this</p></div>
          </div>
          <p className="mt-5 whitespace-pre-wrap break-words text-pretty text-base leading-[1.5]">{item.description}</p>{item.images?.map((image,index)=><Avatar key={index} className="mt-3 h-48 w-full rounded-xl"><AvatarImage src={image} alt={"Feedback attachment "+(index+1)} className="object-contain"/></Avatar>)}
        </section>

        <aside aria-label="Post information" className="rounded-lg border p-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start lg:rounded-none lg:border-0 lg:p-0">
          <section aria-labelledby="author-heading"><h2 id="author-heading" className="mb-3 text-xs font-medium text-muted-foreground">Author</h2><div className="flex items-center gap-3"><Avatar className="size-8"><AvatarImage src={item.avatarUrl} alt=""/><AvatarFallback className="bg-muted text-xs text-muted-foreground" seed={item.author}/></Avatar><div className="min-w-0"><p className="break-words text-sm font-medium">{item.author}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.createdAt}</p></div></div></section>
          <Separator className="my-6" />
          <section aria-labelledby="details-heading"><h2 id="details-heading" className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Details</h2><dl className="grid w-fit grid-cols-[42px_auto] items-center gap-[9px]"><dt className="text-sm leading-5 text-muted-foreground">Status</dt><dd><StatusLabel status={item.status} /></dd></dl><dl className="mt-2 grid w-fit grid-cols-[42px_auto] items-center gap-[9px] text-[13px]"><dt className="text-muted-foreground">Type</dt><dd><Select value={item.category??"feedback"} disabled={pending||!item.canEditCategory} items={Object.entries(FEEDBACK_CATEGORIES).map(([value,label])=>({value,label}))} onValueChange={value=>{if(value)void updateCategory(item.id,value as FeedbackCategory).catch(error=>toastManager.add({title:"Type wasn’t saved",description:error instanceof Error?error.message:"Try again.",type:"error"}));}}><SelectTrigger aria-label="Change feedback type" className="h-6 min-h-6 w-auto min-w-0 gap-1 rounded-md border-0 bg-transparent p-0 text-[13px] shadow-none before:hidden focus-visible:ring-0 data-disabled:opacity-100"><SelectValue>{value=><FeedbackTypeLabel category={value as FeedbackCategory}/>}</SelectValue></SelectTrigger><SelectPopup>{Object.keys(FEEDBACK_CATEGORIES).map(value=><SelectItem key={value} value={value}><FeedbackTypeLabel category={value as keyof typeof FEEDBACK_CATEGORIES}/></SelectItem>)}</SelectPopup></Select></dd></dl>{Boolean(item.tags?.length)&&<div className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">{item.tags?.map(tag=><span key={tag.id} className="rounded-lg bg-muted px-2 py-1 text-[13px] text-muted-foreground">{tag.name}</span>)}</div>}</section>
          <Separator className="my-6" />
          <section aria-labelledby="actions-heading"><h2 id="actions-heading" className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Actions</h2><PostActions id={item.id} title={item.title} /></section>
        </aside>

        <section aria-labelledby="conversation-heading" className="min-w-0 border-t pt-6 lg:col-start-1">
          <h2 id="conversation-heading" className="text-base font-semibold leading-6 text-muted-foreground">Conversation</h2>
          <div className="mt-5"><CommentThread key={item.id} item={item} /></div>
        </section>
      </div>
    </main>
  );
}

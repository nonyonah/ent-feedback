"use client";

import * as React from "react";
import {features} from "@/lib/features";
import {ComposerTools,AttachmentPreview} from "@/components/feedback/composer-tools";
import {HeartIcon} from "@/components/icons";
import {Avatar,AvatarFallback,AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {toastManager} from "@/components/ui/toast";
import {useFeedback} from "@/components/feedback/feedback-provider";
import {StatusLabel} from "./status-label";
import {cn} from "@/lib/utils";
import type {FeedbackItemData,FeedbackComment} from "@/lib/feedback-data";

function CommentComposer({itemId,parent,onDone,onCancel}:{itemId:string;parent?:FeedbackComment;onDone?:()=>void;onCancel?:()=>void}){
 const {addComment,pending}=useFeedback();
 const [body,setBody]=React.useState("");const [images,setImages]=React.useState<string[]>([]);
 const input=React.useRef<HTMLTextAreaElement>(null);const id=React.useId();
 async function submit(event:React.FormEvent){
  event.preventDefault();if(pending||(!body.trim()&&!images.length))return;
  try{await addComment(itemId,body,images,parent?.id);setBody("");setImages([]);onDone?.();}
  catch(error){toastManager.add({title:parent?"Reply wasn’t posted":"Comment wasn’t posted",description:error instanceof Error?error.message:"Try again. Your draft is still here.",type:"error"});}
 }
 return <form onSubmit={submit} className="flex min-w-0 flex-col gap-3 rounded-[20px] border border-border/60 bg-muted/30 p-2">
  <label htmlFor={id} className="sr-only">{parent?"Reply to "+parent.author:"Add a comment"}</label>
  <Textarea id={id} ref={input} autoFocus={Boolean(parent)} disabled={pending} value={body} onChange={event=>setBody(event.target.value)} placeholder={parent?"Reply to "+parent.author+"…":"Add a comment or share more context…"} className="border-0 bg-transparent shadow-none ring-0 before:hidden [&_textarea]:min-h-14 [&_textarea]:sm:min-h-14"/>
  <div className="flex flex-wrap items-end justify-between gap-2"><ComposerTools disabled={pending} value={body} onChange={setBody} inputRef={input} images={images} onImagesChange={setImages}/><div className="ml-auto flex gap-1">{onCancel&&<Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onCancel}>Cancel</Button>}<Button type="submit" size="sm" className="rounded-full" disabled={pending||(!body.trim()&&!images.length)}>{parent?"Reply":"Comment"}</Button></div></div>
 </form>;
}

function CommentNode({comment,item,depth=0}:{comment:FeedbackComment;item:FeedbackItemData;depth?:number}){
 const {toggleCommentLike,pending}=useFeedback();const [replying,setReplying]=React.useState(false);
 const children=item.comments.filter(child=>child.parentCommentId===comment.id);
 const isOwner=features.teams&&comment.kind==="owner";
 return <article className="min-w-0" aria-label={"Comment by "+comment.author}>
  <div className="flex items-start gap-3"><Avatar className="size-8 shrink-0"><AvatarImage src={comment.avatarUrl} alt=""/><AvatarFallback seed={comment.author}/></Avatar>
   <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{comment.author}</span><span className="text-xs text-muted-foreground">{comment.time}</span>{isOwner&&<span className="rounded-md bg-control-quiet px-1.5 text-xs text-muted-foreground">Team</span>}</div>
    <p className="mt-1 whitespace-pre-line break-words text-base leading-[1.5]">{comment.body}</p>
    {Boolean(comment.images?.length)&&<AttachmentPreview images={comment.images!}/>}
    <div className="-ml-2 mt-1 flex items-center gap-1"><Button type="button" size="xs" variant={comment.liked?"default":"ghost"} disabled={pending} aria-label={(comment.liked?"Unlike":"Like")+" comment by "+comment.author} aria-pressed={Boolean(comment.liked)} onClick={()=>toggleCommentLike(item.id,comment.id)} className={cn("min-h-9 min-w-9 rounded-full px-2 text-xs sm:h-6 sm:min-h-6 sm:min-w-6",comment.liked?"bg-primary text-primary-foreground hover:bg-primary [&_svg]:opacity-100":"text-muted-foreground hover:text-foreground")}><HeartIcon aria-hidden="true" className={comment.liked?"fill-current":undefined}/>{(comment.likes??0)>0&&<span className="tabular-nums">{comment.likes}</span>}</Button><Button type="button" size="xs" variant="ghost" aria-expanded={replying} disabled={pending} onClick={()=>setReplying(value=>!value)} className="min-h-9 rounded-lg px-2 text-xs text-muted-foreground sm:h-6 sm:min-h-6">Reply</Button></div>
   </div>
  </div>
  {replying&&<div className={cn("mt-3",depth<2&&"ml-5 border-l border-border pl-4")}><CommentComposer itemId={item.id} parent={comment} onDone={()=>setReplying(false)} onCancel={()=>setReplying(false)}/></div>}
  {children.length>0&&<div className={cn("mt-4 flex min-w-0 flex-col gap-4",depth<2&&"ml-5 border-l border-border pl-4")}>{children.map(child=><CommentNode key={child.id} comment={child} item={item} depth={depth+1}/>)}</div>}
 </article>;
}

export function CommentThread({item,variant="default"}:{item:FeedbackItemData;variant?:"default"|"dashboard"}):React.ReactElement{
 const ids=new Set(item.comments.map(comment=>comment.id));
 const roots=item.comments.filter(comment=>!comment.parentCommentId||!ids.has(comment.parentCommentId));
 const events=[...roots.map(comment=>({kind:"comment" as const,id:comment.id,createdOrder:comment.createdOrder??0,comment})),...(item.statusHistory??[]).map(event=>({kind:"status" as const,id:event.id,createdOrder:event.createdOrder,event}))].sort((a,b)=>a.createdOrder-b.createdOrder);
 return <div data-slot="comment-thread" data-variant={variant} className="flex min-w-0 flex-col gap-5">
  <CommentComposer itemId={item.id}/>
  {events.length===0&&<p className="text-sm text-muted-foreground">No comments yet.</p>}
  <div className="flex min-w-0 flex-col gap-5">{events.map(entry=>entry.kind==="comment"?<CommentNode key={entry.id} item={item} comment={entry.comment}/>:<div key={entry.id} data-slot="status-history-event" className="ml-4 flex items-start gap-3 border-l border-border py-2 pl-5"><span className="min-w-0 flex-1 text-sm"><span className="font-medium">{entry.event.author}</span><span className="text-muted-foreground"> changed status to </span><span className="ml-1.5 inline-flex"><StatusLabel status={entry.event.status}/></span><span className="mt-1 block text-xs text-muted-foreground">{entry.event.time}</span></span></div>)}</div>
 </div>;
}

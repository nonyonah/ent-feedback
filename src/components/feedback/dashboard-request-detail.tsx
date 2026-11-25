"use client";
import {SampleControls} from "./sample-controls";
import {SampleBadge} from "@/components/feedback/sample-badge";
import {McpReplyProposals} from "./mcp-reply-proposals";
import {LinearFeedbackLink} from "./linear-feedback-link";
import {AttachmentPreview} from "./composer-tools";
import {TrendingBadge} from "./trending-badge";
import {RequestClassification} from "./request-classification";
import {PossibleDuplicates} from "./possible-duplicates";
import Link from "next/link";
import {useProject} from "./project-provider";
import {feedbackHref} from "@/lib/project-links";
import { ArrowLeftIcon } from "@/components/icons";
import { ArrowUpIcon } from "@/components/icons";
import { ArrowSquareOutIcon } from "@/components/icons";
import { CaretDoubleUpIcon } from "@/components/icons";
import { CaretDoubleDownIcon } from "@/components/icons";
import { CopyIcon } from "@/components/icons";
import { GlobeIcon } from "@/components/icons";
import { CheckIcon } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "@/components/ui/select";
import { toastManager } from "@/components/ui/toast";
import { CommentThread } from "@/components/feedback/comment-thread";
import { StatusLabel } from "@/components/feedback/status-label";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { STATUS_LABELS, STATUS_ORDER, type FeedbackItemData, type FeedbackStatus } from "@/lib/feedback-data";
const actions={open:"Plan",planned:"Start building","in-progress":"Mark shipped",shipped:"Shipped"};
export function DashboardRequestDetail({item,boardName,boardUrl,onBack,onPrevious,onNext,onOpenRequest}:{item:FeedbackItemData;boardName:string;boardUrl:string;onBack:()=>void;onPrevious?:()=>void;onNext?:()=>void;onOpenRequest?:(id:string)=>void}){
 const {vote,updateStatus,removeItems,retry}=useFeedback();
 const {project,boards}=useProject();
 const board=boards.find(candidate=>candidate.id===item.boardId);
 const publicItemHref=feedbackHref(project,item.id);
 const nextStatus=STATUS_ORDER[STATUS_ORDER.indexOf(item.status)+1];
 async function copy(){try{await navigator.clipboard.writeText(new URL(publicItemHref,window.location.origin).href);toastManager.add({title:"Post link copied",type:"success"});}catch{toastManager.add({title:"Couldn’t copy link",description:"Open the public post and copy its address.",type:"error"});}}
 return <>
  <header className="flex min-h-14 shrink-0 items-center gap-2 px-4"><Button variant="ghost" size="icon-sm" aria-label="Back to requests" onClick={onBack} className="size-9 rounded-full lg:hidden"><ArrowLeftIcon className="size-3.5"/></Button><p className="min-w-0 truncate text-[13px] font-medium tracking-[-0.135px]">{boardName}</p><div className="ml-auto flex shrink-0 items-center gap-0.5"><Button variant="ghost" size="icon-sm" aria-label="Copy post link" title="Copy post link" onClick={()=>void copy()} className="size-9 rounded-full lg:size-7"><CopyIcon className="size-4"/></Button><Button variant="ghost" size="icon-sm" aria-label="Previous request" title="Previous request" disabled={!onPrevious} onClick={onPrevious} className="size-9 rounded-full lg:size-7"><CaretDoubleUpIcon className="size-4"/></Button><Button variant="ghost" size="icon-sm" aria-label="Next request" title="Next request" disabled={!onNext} onClick={onNext} className="size-9 rounded-full lg:size-7"><CaretDoubleDownIcon className="size-4"/></Button><Button variant="ghost" size="icon-sm" aria-label="Open public post" title="Open public post" render={<Link href={publicItemHref}/>} className="size-9 rounded-full lg:size-7"><ArrowSquareOutIcon className="size-4"/></Button></div></header>
  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-28 sm:px-6"><article className="mx-auto max-w-2xl py-6"><h2 className="text-balance text-[14px] font-semibold leading-[1.35] tracking-[-0.14px]">{item.isSample && <SampleBadge/>}{item.title}</h2><TrendingBadge id={item.id} className="mt-2"/>{board&&item.isSample&&<SampleControls key={item.id} board={board} item={item}/>}<div className="mt-3 flex items-center gap-2.5"><Avatar className="size-8"><AvatarImage src={item.avatarUrl} alt=""/><AvatarFallback className="text-xs" seed={item.author}/></Avatar><div><p className="text-[13px] font-medium tracking-[-0.065px]">{item.author}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.createdAt}</p></div></div><p className="mt-4 whitespace-pre-line break-words text-sm leading-[1.6] tracking-[-0.07px]">{item.description}</p>{Boolean(item.images?.length)&&<div className="mt-4" aria-label="Feedback attachments"><AttachmentPreview images={item.images!}/></div>}<div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-1.5"><Link href={boardUrl} className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-foreground/[0.04] px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"><span className="size-1.5 rounded-full bg-primary"/>{boardName}</Link><Link href={publicItemHref} className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-foreground/[0.04] px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"><GlobeIcon className="size-3"/>On board</Link></div><Button size="sm" variant={item.voted?"default":"outline"} aria-label={"Vote for "+item.title} aria-pressed={item.voted} onClick={()=>vote(item.id)} className="h-8 min-w-16 rounded-full px-3 text-xs tabular-nums"><ArrowUpIcon className="size-3"/>{item.votes}</Button></div><div className="mt-4"><LinearFeedbackLink key={item.id} feedbackId={item.id}/></div><RequestClassification item={item}/>{onOpenRequest&&(project.role==='owner'||project.role==='admin')&&<PossibleDuplicates key={project.id+item.id} workspaceId={project.id} id={item.id} title={item.title} onOpen={onOpenRequest} onMerged={id=>{removeItems([item.id]);onOpenRequest(id);retry();}}/>}<section className="mt-6" aria-label="Request conversation"><h3 className="mb-4 text-xs font-medium text-muted-foreground">Conversation · {(item.commentCount??item.comments.length)} {(item.commentCount??item.comments.length)===1?"comment":"comments"}</h3>{(project.role==='owner'||project.role==='admin')&&<div className="mb-5"><McpReplyProposals workspaceId={project.id} feedbackId={item.id} onPosted={retry}/></div>}<CommentThread item={item} variant="dashboard"/></section></article></div>
  <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-3"><div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-[14px] border border-border/60 bg-background/85 p-1 shadow-[0_6px_18px_-6px_#0000001a] backdrop-blur-xl"><Select items={STATUS_ORDER.map(value=>({label:STATUS_LABELS[value],value}))} value={item.status} onValueChange={value=>{if(value)updateStatus(item.id,value as FeedbackStatus);}}><SelectTrigger aria-label={"Change status for "+item.title} className="h-9 min-h-9 w-auto min-w-0 justify-start gap-1.5 rounded-[10px] border-0 bg-transparent px-2 shadow-none before:hidden sm:h-7 sm:min-h-7 [&_[data-slot=select-value]]:flex-none"><SelectValue>{value=><StatusLabel status={value as FeedbackStatus}/>}</SelectValue></SelectTrigger><SelectPopup>{STATUS_ORDER.map(status=><SelectItem key={status} value={status}><StatusLabel status={status}/></SelectItem>)}</SelectPopup></Select><Button size="sm" className="h-9 min-h-9 shrink-0 gap-1.5 rounded-[10px] px-2.5 text-xs sm:h-7 sm:min-h-7" disabled={!nextStatus} onClick={()=>{if(nextStatus)updateStatus(item.id,nextStatus);}}>{item.status==="shipped"&&<CheckIcon/>}{actions[item.status]}</Button></div></div>
 </>;
}

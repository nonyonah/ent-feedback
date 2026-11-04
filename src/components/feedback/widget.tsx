"use client";
import * as React from "react";
import Link from "next/link";
import { ChatTextIcon } from "@phosphor-icons/react/dist/ssr/ChatText";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBackdrop, DialogPortal, DialogPrimitive, DialogTitle, DialogViewport } from "@/components/ui/dialog";
import { Select, SelectGroup, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { StatusLabel } from "@/components/feedback/status-label";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { useProject } from "@/components/feedback/project-provider";
import { STATUS_ORDER, STATUS_LABELS, type FeedbackStatus } from "@/lib/feedback-data";
import { boardHref } from "@/lib/project-links";
import { cn } from "@/lib/utils";

export function WidgetPanel({ onClose, initialView = "board", embedded = false }: { onClose?: () => void; initialView?: "board" | "submit"; embedded?: boolean }) {
  const { items, vote } = useFeedback();
  const { project, activeBoard } = useProject();
  const [view, setView] = React.useState(initialView);
  const [filter, setFilter] = React.useState<"all" | FeedbackStatus>("all");
  const visible = items.filter((item) => filter === "all" || item.status === filter).sort((a,b) => b.votes - a.votes);
  const title = <span className="text-sm font-semibold">{view === "board" ? (activeBoard?.name??project.name) : "Share an idea"}</span>;
  return <div className="flex h-full min-h-0 flex-col bg-popover text-popover-foreground">
    <header className="flex shrink-0 items-center gap-3 border-b p-4">
      {view === "submit" ? <Button aria-label="Back to feedback" variant="ghost" size="icon" onClick={() => setView("board")}><ArrowLeftIcon weight="bold" /></Button> : <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><ChatTextIcon weight="bold" className="size-4" /></span>}
      <div className="min-w-0 flex-1">{embedded ? <h1>{title}</h1> : <DialogTitle>{title}</DialogTitle>}<p className="mt-1 text-xs text-muted-foreground">{view === "board" ? "A little feedback. A better product." : "What would make your day easier?"}</p></div>
      {onClose && <Button aria-label="Close feedback widget" variant="ghost" size="icon" onClick={onClose}><XIcon weight="bold" /></Button>}
    </header>
    {view === "board" ? <>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3"><p className="text-xs text-muted-foreground">{visible.length} ideas</p><Select items={[{ label:"All statuses", value:"all" },...STATUS_ORDER.map((status)=>({label:STATUS_LABELS[status],value:status}))]} value={filter} onValueChange={(value)=>{if(value)setFilter(value as typeof filter);}}><SelectTrigger aria-label="Filter widget feedback" className="w-36 min-w-0"><SelectValue /></SelectTrigger><SelectPopup><SelectGroup><SelectItem value="all">All statuses</SelectItem>{STATUS_ORDER.map(status=><SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}</SelectGroup></SelectPopup></Select></div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><ul className="divide-y">{visible.map(item=><li key={item.id} className="flex gap-3 p-4"><Button aria-label={"Vote for "+item.title} aria-pressed={item.voted} variant={item.voted?"secondary":"outline"} className="min-h-11 min-w-11 self-start flex-col gap-0 px-2" onClick={()=>vote(item.id)}><ArrowUpIcon weight="bold" /><span className="text-xs tabular-nums">{item.votes}</span></Button><div className="min-w-0 flex-1"><Link className="break-words text-sm font-semibold leading-5 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring" href={"/items/"+item.id} target={embedded ? "_blank" : undefined} rel={embedded ? "noopener noreferrer" : undefined}>{item.title}</Link><div className="mt-2"><StatusLabel status={item.status}/></div><p className="mt-1 text-xs text-muted-foreground">{item.comments.length} comments</p></div></li>)}</ul>{visible.length===0 && <div className="px-6 py-12 text-center"><p className="font-medium">Room for a new idea.</p><p className="mt-2 text-sm text-muted-foreground">Nothing with this status yet. Share what’s on your mind.</p></div>}</div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t p-4"><Link href={activeBoard?boardHref(project,activeBoard):"/project"} target={embedded ? "_blank" : undefined} rel={embedded ? "noopener noreferrer" : undefined} className="text-xs text-muted-foreground hover:underline">Powered by Ent</Link><Button onClick={()=>setView("submit")} className="min-h-10"><PlusIcon weight="bold" data-icon="inline-start" />Share an idea</Button></footer>
    </> : <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"><FeedbackForm compact onDone={()=>setView("board")} /></div>}
  </div>;
}

export function Widget({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open,setOpen]=React.useState(defaultOpen);
  const launcher=React.useRef<HTMLButtonElement>(null);
  return <Dialog open={open} onOpenChange={setOpen}>
    <Button ref={launcher} aria-expanded={open} aria-label={open?"Close feedback widget":"Open feedback widget"} className="fixed bottom-5 right-4 size-12 rounded-full shadow-lg sm:size-10" onClick={()=>setOpen(!open)} size="icon-xl">{open?<XIcon weight="bold"/>:<ChatTextIcon weight="bold"/>}</Button>
    <DialogPortal><DialogBackdrop className="sm:bg-black/10 sm:backdrop-blur-none" /><DialogViewport className="flex items-end justify-end p-0 sm:p-4 sm:pb-20"><DialogPrimitive.Popup className={cn("flex h-[min(560px,calc(100dvh-32px))] w-full min-w-0 flex-col overflow-hidden rounded-t-xl border bg-popover shadow-lg outline-none sm:w-[380px] sm:rounded-xl")} finalFocus={launcher}><WidgetPanel onClose={()=>setOpen(false)} /></DialogPrimitive.Popup></DialogViewport></DialogPortal>
  </Dialog>;
}

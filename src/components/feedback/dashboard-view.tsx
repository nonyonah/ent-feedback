"use client";

import * as React from "react";
import Link from "next/link";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { ChatCircleIcon } from "@phosphor-icons/react/dist/ssr/ChatCircle";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { toastManager } from "@/components/ui/toast";
import { SubmitDialog } from "@/components/feedback/submit-dialog";
import { StatusLabel } from "@/components/feedback/status-label";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { useProject } from "@/components/feedback/project-provider";
import { NoBoard } from "@/components/feedback/board-context";
import { DashboardSidebar } from "@/components/feedback/dashboard-sidebar";
import { DashboardRequestDetail } from "@/components/feedback/dashboard-request-detail";
import { STATUS_LABELS, STATUS_ORDER, type FeedbackStatus } from "@/lib/feedback-data";
import { FEEDBACK_SORT_OPTIONS, compareFeedback } from "@/lib/feedback-sort";
import { boardHref } from "@/lib/project-links";
import { cn } from "@/lib/utils";

export function DashboardView(): React.ReactElement {
  const { project, activeBoard } = useProject();
  const { items } = useFeedback();
  const [filter, setFilter] = React.useState<"all" | FeedbackStatus>("all");
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState("top");
  const [copied, setCopied] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const publicHref = activeBoard ? boardHref(project, activeBoard) : "/project";
  const visibleItems = items.filter(item => (filter === "all" || item.status === filter) && [item.title, item.description, item.author].join(" ").toLowerCase().includes(query.trim().toLowerCase())).sort((a,b) => compareFeedback(sort,a,b));
  const selected = visibleItems.find(item => item.id === selectedId) ?? visibleItems[0];
  const selectedIndex = selected ? visibleItems.findIndex(item => item.id === selected.id) : -1;
  async function copyLink() {
    try { await navigator.clipboard.writeText(new URL(publicHref,window.location.origin).href); setCopied(true); toastManager.add({title:"Board link copied",type:"success"}); }
    catch { toastManager.add({title:"Couldn’t copy the link",description:"Open the public board and copy its address instead.",type:"error"}); }
  }
  function resetSelection() { setSelectedId(null); setDetailOpen(false); }
  return <SidebarProvider className="h-dvh min-h-0 overflow-hidden bg-sidebar" style={{"--sidebar-width":"260px","--sidebar":"var(--dashboard-sidebar)"} as React.CSSProperties}>
    <a href="#feedback-inbox" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:p-3 focus:ring-2 focus:ring-ring">Skip to feedback</a>
    <DashboardSidebar filter={filter} onFilterChange={value=>{setFilter(value);setQuery("");resetSelection();}} onBoardChange={()=>{setFilter("all");setQuery("");setCopied(false);resetSelection();}} onCopyLink={()=>void copyLink()} copied={copied}/>
    <SidebarInset className="h-dvh min-w-0 overflow-hidden bg-[var(--dashboard-body)]" id="feedback-inbox">
      {!activeBoard ? <div className="mx-auto w-full max-w-xl p-6"><div className="mb-5 md:hidden"><SidebarTrigger/></div><NoBoard/></div> : <div className="flex h-full min-h-0">
        <section aria-label="Request inbox" className={cn("flex min-h-0 w-full shrink-0 flex-col border-r border-border/60 lg:w-[300px] xl:w-[320px]",detailOpen&&"hidden lg:flex")}>
          <header className="flex h-12 shrink-0 items-center gap-2 pl-4 pr-2.5"><SidebarTrigger className="md:hidden"/><h1 className="text-[13.5px] font-medium tracking-[-0.135px]">Requests</h1><span className="text-[11px] tabular-nums text-muted-foreground">{items.length}</span><div className="ml-auto"><SubmitDialog trigger={<Button aria-label="Add feedback" title="Add feedback" size="icon-sm" variant="outline" className="size-9 rounded-full lg:size-7"><PlusIcon weight="bold" className="size-3.5"/></Button>}/></div></header>
          <div className="px-4 pb-3"><InputGroup className="border-0 bg-transparent shadow-none before:hidden has-focus-visible:ring-2"><InputGroupAddon className="pl-0"><MagnifyingGlassIcon weight="bold" className="size-3.5"/></InputGroupAddon><InputGroupInput aria-label="Search feedback" value={query} onChange={event=>{setQuery(event.target.value);resetSelection();}} placeholder="Search requests…" type="search" className="h-9 pl-0 text-[13px]"/></InputGroup><div className="mt-1 flex gap-1.5"><Select items={[{label:"All statuses",value:"all"},...STATUS_ORDER.map(value=>({label:STATUS_LABELS[value],value}))]} value={filter} onValueChange={value=>{if(value){setFilter(value as typeof filter);resetSelection();}}}><SelectTrigger aria-label="Filter by status" className="h-8 min-w-0 flex-1 rounded-lg bg-transparent text-xs shadow-none"><SelectValue/></SelectTrigger><SelectPopup><SelectItem value="all">All statuses</SelectItem>{STATUS_ORDER.map(status=><SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}</SelectPopup></Select><Select items={FEEDBACK_SORT_OPTIONS} value={sort} onValueChange={value=>{if(value)setSort(value);}}><SelectTrigger aria-label="Sort feedback" className="h-8 w-[100px] min-w-0 rounded-lg bg-transparent text-xs shadow-none"><SelectValue/></SelectTrigger><SelectPopup>{FEEDBACK_SORT_OPTIONS.map(option=><SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectPopup></Select></div></div>
          <p aria-live="polite" className="sr-only">{visibleItems.length} requests{filter!=="all"&&" · "+STATUS_LABELS[filter]}</p>
          <ul aria-label="Feedback requests" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-3">{visibleItems.map(item=><li key={item.id}><button type="button" aria-pressed={selected?.id===item.id} aria-label={"Open request: "+item.title} onClick={()=>{setSelectedId(item.id);setDetailOpen(true);}} className={cn("flex min-h-16 w-full flex-col justify-center gap-1 rounded-xl px-2.5 py-2 text-left outline-none hover:bg-foreground/[0.025] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:min-h-14",selected?.id===item.id&&"bg-foreground/[0.04]")}><span className="flex w-full items-center gap-2"><span className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-[-0.065px]">{item.title}</span><StatusLabel status={item.status} iconOnly/></span><span className="flex w-full items-center gap-1.5"><Avatar className="size-4"><AvatarFallback className="text-[7px]">{item.initials}</AvatarFallback></Avatar><span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{item.author}</span><span className="inline-flex items-center gap-0.5 rounded-[5px] bg-foreground/[0.04] px-1.5 py-0.5 text-[9.5px] font-semibold tabular-nums text-muted-foreground"><ArrowUpIcon weight="bold" className="size-2.5"/>{item.votes}</span><span aria-label={item.comments.length+" comments"} className="inline-flex items-center gap-0.5 text-[10px] tabular-nums text-muted-foreground"><ChatCircleIcon weight="bold" className="size-2.5"/>{item.comments.length}</span><span className="min-w-7 text-right text-[11px] text-muted-foreground/75">{item.createdAt}</span></span></button></li>)}{visibleItems.length===0&&<li className="px-4 py-10 text-center"><p className="text-sm font-medium">{items.length?"No matching feedback":"Your first idea starts here"}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{items.length?"Try another search or status.":"Add a request, or share your board with customers."}</p>{items.length?<Button className="mt-4" variant="outline" size="sm" onClick={()=>{setQuery("");setFilter("all");}}>Clear filters</Button>:<Button className="mt-4" variant="outline" size="sm" render={<Link href="/share"/>}>Share your board</Button>}</li>}</ul>
        </section>
        <section aria-label="Selected request" className={cn("relative min-w-0 flex-1 flex-col",detailOpen?"flex":"hidden lg:flex")}>
          {selected?<DashboardRequestDetail key={selected.id} item={selected} boardName={activeBoard.name} boardUrl={publicHref} onBack={()=>setDetailOpen(false)} onPrevious={selectedIndex>0?()=>setSelectedId(visibleItems[selectedIndex-1].id):undefined} onNext={selectedIndex<visibleItems.length-1?()=>setSelectedId(visibleItems[selectedIndex+1].id):undefined}/>:<div className="flex h-full flex-col items-center justify-center px-6 text-center"><p className="text-sm font-medium">A little feedback. A better product.</p><p className="mt-2 text-xs text-muted-foreground">Choose a request to read the conversation.</p></div>}
        </section>
      </div>}
    </SidebarInset>
  </SidebarProvider>;
}

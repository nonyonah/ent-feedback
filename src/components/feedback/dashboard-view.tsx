"use client";
import {Skeleton} from "@/components/ui/skeleton";
import {TrendingBadge} from "./trending-badge";
import {EmptyIllustration} from "./empty-illustration";

import * as React from "react";
import {BillingNotice} from "./billing-notice";
import {useSearchParams} from "next/navigation";
import Link from "next/link";
import {FilterIcon} from "@/components/icons";
import {Menu,MenuTrigger,MenuPopup,MenuGroup,MenuGroupLabel,MenuRadioGroup,MenuRadioItem,MenuItem,MenuSeparator} from "@/components/ui/menu";
import { ArrowUpIcon } from "@/components/icons";
import { ChatCircleIcon } from "@/components/icons";
import {RequestSearch} from "./request-search";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { toastManager } from "@/components/ui/toast";
import { StatusLabel } from "@/components/feedback/status-label";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { useProject } from "@/components/feedback/project-provider";
import { NoBoard } from "@/components/feedback/board-context";
import { DashboardSidebar } from "@/components/feedback/dashboard-sidebar";
import { DashboardRequestDetail } from "@/components/feedback/dashboard-request-detail";
import {FeedbackTypeLabel} from "./feedback-type-label";
import { FEEDBACK_CATEGORIES, STATUS_LABELS, type FeedbackCategory, type FeedbackStatus } from "@/lib/feedback-data";
import { FEEDBACK_SORT_OPTIONS, compareFeedback } from "@/lib/feedback-sort";
import { boardHref } from "@/lib/project-links";
import { cn } from "@/lib/utils";

import { ShareView } from "@/components/feedback/share-view";
import { DashboardBoards } from "@/components/feedback/dashboard-boards";
import { DashboardSettings, SettingsSidebar, type SettingsSection } from "@/components/feedback/dashboard-settings";

export function DashboardView({view="requests",settingsSection="branding",initialFilter="all"}:{initialFilter?:"all"|FeedbackStatus;view?:"requests"|"boards"|"settings"|"share";settingsSection?:SettingsSection}): React.ReactElement {
  const { project, activeBoard, boards } = useProject();
  const { items,loading,error } = useFeedback();
  const boardFilter=useSearchParams().get("board");
  const [categoryFilter,setCategoryFilter]=React.useState("all");
  const [tagFilter,setTagFilter]=React.useState("all");
  const availableTags=Array.from(new Map(items.flatMap(item=>item.tags??[]).map(tag=>[tag.id,tag])).values());
  const [filter, setFilter] = React.useState<"all" | FeedbackStatus>(initialFilter);
  const [sort, setSort] = React.useState("trending");
  const [copied, setCopied] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const publicHref = activeBoard ? boardHref(project, activeBoard) : "/dashboard/boards";
  const visibleItems = items.filter(item => (!boardFilter||item.boardId===boardFilter) && (categoryFilter==="all"||(item.category??"feedback")===categoryFilter) && (tagFilter==="all"||item.tags?.some(tag=>tag.id===tagFilter)) && (filter === "all" || item.status === filter)).sort((a,b) => compareFeedback(sort,a,b));
  const selected = visibleItems.find(item => item.id === selectedId) ?? visibleItems[0];
  const selectedBoard=boards.find(board=>board.id===selected?.boardId)??activeBoard;
  const selectedIndex = selected ? visibleItems.findIndex(item => item.id === selected.id) : -1;
  async function copyLink() {
    try { await navigator.clipboard.writeText(new URL(publicHref,window.location.origin).href); setCopied(true); toastManager.add({title:"Board link copied",type:"success"}); }
    catch { toastManager.add({title:"Couldn’t copy the link",description:"Open the public board and copy its address instead.",type:"error"}); }
  }
  function resetSelection() { setSelectedId(null); setDetailOpen(false); }
  return <SidebarProvider className="h-dvh min-h-0 overflow-hidden bg-sidebar" style={{"--sidebar-width":"260px","--sidebar":"var(--dashboard-sidebar)"} as React.CSSProperties}>
    <a href="#feedback-inbox" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:p-3 focus:ring-2 focus:ring-ring">Skip to feedback</a>
    {view === "settings" ? <SettingsSidebar section={settingsSection}/> : <DashboardSidebar view={view} filter={filter} onFilterChange={value=>{setFilter(value);resetSelection();}} onCopyLink={()=>void copyLink()} copied={copied}/>}
    <SidebarInset data-tour="workspace-content" className="h-dvh min-w-0 overflow-hidden bg-[var(--dashboard-body)]" id="feedback-inbox">
      {!(view==="settings"&&settingsSection==="billing")&&<BillingNotice/>}
      {view === "share" ? <div className="min-h-0 flex-1 overflow-y-auto"><div className="px-4 pt-3 md:hidden"><SidebarTrigger/></div><ShareView/></div> : view === "settings" ? <div className="min-h-0 flex-1 overflow-y-auto"><div className="px-4 pt-3 md:hidden"><SidebarTrigger/></div><DashboardSettings key={project.id} section={settingsSection}/></div> : view === "boards" ? <DashboardBoards/> : !activeBoard ? <div className="mx-auto w-full max-w-xl p-6"><div className="mb-5 md:hidden"><SidebarTrigger/></div><NoBoard/></div> : <div className="flex h-full min-h-0">
        <section aria-label="Request inbox" className={cn("flex min-h-0 w-full shrink-0 flex-col border-r border-border/60 lg:w-[300px] xl:w-[320px]",detailOpen&&"hidden lg:flex")}>
          <header className="flex h-12 shrink-0 items-center gap-2 pl-4 pr-2.5"><SidebarTrigger className="md:hidden"/><h1 className="text-[13px] font-medium tracking-[-0.135px]">Requests</h1><span aria-label={visibleItems.length+" requests in this view"} className="text-[13px] tabular-nums text-muted-foreground">{visibleItems.length}</span><div className="ml-auto flex min-w-0 items-center gap-1"><Menu><MenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Filter and sort requests" title={"Sort: "+FEEDBACK_SORT_OPTIONS.find(option=>option.value===sort)?.label} className="size-8 rounded-lg text-muted-foreground"/>}><FilterIcon className="size-4"/></MenuTrigger><MenuPopup align="end"><MenuGroup><MenuGroupLabel>Sort by</MenuGroupLabel><MenuRadioGroup value={sort} onValueChange={value=>setSort(value)}>{FEEDBACK_SORT_OPTIONS.map(option=><MenuRadioItem key={option.value} value={option.value}>{option.label}</MenuRadioItem>)}</MenuRadioGroup></MenuGroup>{boardFilter&&<><MenuSeparator/><MenuItem render={<Link href="/dashboard"/>}>Show workspace requests</MenuItem></>}</MenuPopup></Menu><Select value={categoryFilter} onValueChange={value=>{if(value){setCategoryFilter(value);resetSelection();}}} items={[{value:"all",label:"All types"},...Object.entries(FEEDBACK_CATEGORIES).map(([value,label])=>({value,label}))]}><SelectTrigger aria-label="Filter request type" className="h-8 w-[118px] min-w-0 rounded-lg px-2 text-[13px]"><SelectValue>{value=>value==="all"?"All types":<FeedbackTypeLabel category={value as FeedbackCategory}/>}</SelectValue></SelectTrigger><SelectPopup><SelectItem value="all">All types</SelectItem>{Object.keys(FEEDBACK_CATEGORIES).map(value=><SelectItem key={value} value={value}><FeedbackTypeLabel category={value as keyof typeof FEEDBACK_CATEGORIES}/></SelectItem>)}</SelectPopup></Select></div></header>
          <div className="px-4 pb-3"><RequestSearch dashboard items={visibleItems} loading={loading} error={error} onSelect={id=>{setSelectedId(id);setDetailOpen(true);}}/></div>
          {availableTags.length>0&&<div className="flex flex-wrap gap-2 px-4 pb-3"><Select value={tagFilter} onValueChange={value=>{if(value){setTagFilter(value);resetSelection();}}} items={[{value:"all",label:"All tags"},...availableTags.map(tag=>({value:tag.id,label:tag.name}))]}><SelectTrigger aria-label="Filter tag" className="h-8 w-auto text-[13px]"><SelectValue/></SelectTrigger><SelectPopup><SelectItem value="all">All tags</SelectItem>{availableTags.map(tag=><SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>)}</SelectPopup></Select></div>}
          <p aria-live="polite" className="sr-only">{visibleItems.length} requests{filter!=="all"&&" · "+STATUS_LABELS[filter]}</p>
          <span role="status" className="sr-only">{loading?"Loading requests":""}</span><ul aria-busy={loading} aria-label="Feedback requests" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-3">{visibleItems.map(item=><li key={item.id}><button type="button" aria-pressed={selected?.id===item.id} aria-label={"Open request: "+item.title} onClick={()=>{setSelectedId(item.id);setDetailOpen(true);}} className={cn("flex min-h-16 w-full flex-col justify-center gap-1 rounded-xl px-2.5 py-2 text-left outline-none hover:bg-control-quiet/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:min-h-14",selected?.id===item.id&&"bg-control-quiet")}><span className="flex w-full items-center gap-2"><span className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-[-0.065px]">{item.title}</span><TrendingBadge id={item.id}/><StatusLabel status={item.status} iconOnly/></span><span className="flex w-full items-center gap-1.5"><Avatar className="size-4"><AvatarImage src={item.avatarUrl} alt=""/><AvatarFallback className="text-[13px]" seed={item.author}/></Avatar><span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">{item.author}</span><span data-voted={item.voted} className={cn("inline-flex h-4.5 items-center gap-0.5 rounded-md px-1 text-xs font-semibold leading-none tabular-nums",item.voted?"bg-primary text-primary-foreground":"bg-control-quiet text-muted-foreground")}><ArrowUpIcon className="size-2.5"/>{item.votes}</span><span aria-label={item.comments.length+" comments"} className="inline-flex items-center gap-0.5 text-[13px] tabular-nums text-muted-foreground"><ChatCircleIcon className="size-3.5"/>{item.comments.length}</span><span className="min-w-7 text-right text-[13px] text-muted-foreground">{item.createdAt}</span></span></button></li>)}{loading&&<li className="space-y-1">{[0,1,2,3,4,5].map(row=><div key={row} aria-hidden="true" className="space-y-2 rounded-xl px-2.5 py-3"><Skeleton className="h-4 w-4/5"/><div className="flex items-center gap-2"><Skeleton className="size-4 rounded-full"/><Skeleton className="h-3 w-1/3"/><Skeleton className="ml-auto h-3 w-10"/></div></div>)}</li>}{!loading&&!error&&visibleItems.length===0&&<li className="px-4 py-10 text-center"><EmptyIllustration variant="requests" className="mb-4"/><p className="text-sm font-medium">{items.length?"No matching feedback":"No requests yet"}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{items.length?"Try another filter.":"Share your board to get feedback."}</p>{items.length?<Button className="mt-4" variant="outline" size="sm" onClick={()=>{setFilter("all");setCategoryFilter("all");setTagFilter("all");}}>Clear filters</Button>:<Button className="mt-4" variant="outline" size="sm" render={<Link href="/dashboard/share"/>}>Share your board</Button>}</li>}</ul>
        </section>
        <section aria-label="Selected request" className={cn("relative min-w-0 flex-1 flex-col",detailOpen?"flex":"hidden lg:flex")}>
          {selected?<DashboardRequestDetail key={selected.id} item={selected} boardName={selectedBoard?.name??"Feedback"} boardUrl={selectedBoard?boardHref(project,selectedBoard):publicHref} onBack={()=>setDetailOpen(false)} onPrevious={selectedIndex>0?()=>setSelectedId(visibleItems[selectedIndex-1].id):undefined} onNext={selectedIndex<visibleItems.length-1?()=>setSelectedId(visibleItems[selectedIndex+1].id):undefined}/>:<div className="flex h-full flex-col items-center justify-center px-6 text-center"><EmptyIllustration className="mb-4"/><p className="text-sm font-medium">Select a request</p><p className="mt-2 text-xs text-muted-foreground">Read and reply here.</p></div>}
        </section>
      </div>}
    </SidebarInset>
  </SidebarProvider>;
}

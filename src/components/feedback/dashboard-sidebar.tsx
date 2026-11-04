"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { BellIcon } from "@phosphor-icons/react/dist/ssr/Bell";
import { CaretUpDownIcon } from "@phosphor-icons/react/dist/ssr/CaretUpDown";
import { ChatTextIcon } from "@phosphor-icons/react/dist/ssr/ChatText";
import { SquaresFourIcon } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import { PaletteIcon } from "@phosphor-icons/react/dist/ssr/Palette";
import { ShareNetworkIcon } from "@phosphor-icons/react/dist/ssr/ShareNetwork";
import { CodeIcon } from "@phosphor-icons/react/dist/ssr/Code";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrayIcon } from "@phosphor-icons/react/dist/ssr/Tray";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { SwatchesIcon } from "@phosphor-icons/react/dist/ssr/Swatches";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Menu, MenuTrigger, MenuPopup, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { StatusLabel } from "@/components/feedback/status-label";
import { useProject } from "@/components/feedback/project-provider";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { STATUS_ORDER, type FeedbackStatus } from "@/lib/feedback-data";
import { boardHref } from "@/lib/project-links";

const rowClass = "h-11 gap-2.5 rounded-xl px-2 text-[13px] font-medium tracking-[-0.065px] text-sidebar-foreground/80 hover:bg-sidebar-accent/60 data-[active=true]:bg-background data-[active=true]:text-foreground data-[active=true]:shadow-[inset_0_0_0_0.5px_#0000001f] md:h-[30px] [&>svg]:size-[15px]";
const labelClass = "mb-1.5 h-auto px-2 text-[9px] font-semibold uppercase leading-3 tracking-[0.72px] text-muted-foreground";

export function DashboardSidebar({filter,onFilterChange,onBoardChange,onCopyLink,copied}:{filter:"all"|FeedbackStatus;onFilterChange:(filter:"all"|FeedbackStatus)=>void;onBoardChange:()=>void;onCopyLink:()=>void;copied:boolean}) {
 const {project,boards,activeBoard,selectBoard}=useProject();
 const {items}=useFeedback();
 const {setOpenMobile}=useSidebar();
 const publicHref=activeBoard?boardHref(project,activeBoard):"/project";
 const initials=project.name.split(/\s+/).map(word=>word[0]).join("").slice(0,2).toUpperCase();
 function close(){setOpenMobile(false);}
 function count(value:number){return <span className="ml-auto flex h-[18px] min-w-[22px] shrink-0 items-center justify-center rounded-md bg-sidebar-accent/70 px-1.5 text-[10.5px] font-semibold tabular-nums text-muted-foreground">{value}</span>;}
 const links=[{href:"/project-settings",label:"Appearance",Icon:PaletteIcon},{href:"/share",label:"Share",Icon:ShareNetworkIcon},{href:"/install",label:"Widget installation",Icon:CodeIcon}];
 return <Sidebar className="border-r border-sidebar-border/60">
  <SidebarHeader className="gap-0 p-2">
   <div className="flex items-center gap-1">
    <Menu><MenuTrigger render={<Button variant="ghost" className="h-11 min-w-0 flex-1 justify-start gap-2 rounded-md px-1.5 shadow-none md:h-8" aria-label="Project menu"/>}><Avatar className="size-6 shrink-0 rounded-md shadow-[inset_0_0_0_1px_#0000001a]"><AvatarImage src={project.logo}/><AvatarFallback className="rounded-md text-[10px] font-semibold">{initials}</AvatarFallback></Avatar><span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium tracking-[-0.13px]">{project.name}</span><CaretUpDownIcon weight="bold" className="size-3 shrink-0 text-muted-foreground"/></MenuTrigger><MenuPopup align="start"><MenuItem render={<Link href="/project"/>}>Project overview</MenuItem><MenuItem render={<Link href="/project-settings"/>}>Project appearance</MenuItem><MenuSeparator/><MenuItem render={<Link href="/onboarding"/>}><PlusIcon weight="bold"/>Create a project</MenuItem></MenuPopup></Menu>
    <Button aria-label="View public board" title="View public board" variant="ghost" size="icon-sm" className="size-11 shrink-0 rounded-[10px] md:size-8" render={<Link href={publicHref}/>}><ArrowUpRightIcon weight="bold" className="size-[15px]"/></Button>
    <Button aria-label="Notification preferences" title="Notification preferences" variant="ghost" size="icon-sm" className="size-11 shrink-0 rounded-[10px] md:size-8" render={<Link href="/preferences"/>}><BellIcon weight="bold" className="size-[15px]"/></Button>
   </div>
  </SidebarHeader>
  <SidebarContent className="gap-0 px-2 pb-2">
   <nav aria-label="Dashboard navigation" className="flex flex-col gap-4 pt-2.5">
    <SidebarGroup className="p-0"><SidebarGroupLabel className={labelClass}>Project</SidebarGroupLabel><SidebarGroupContent><SidebarMenu className="gap-px"><SidebarMenuItem><SidebarMenuButton className={rowClass} render={<Link href="/project"/>} onClick={close}><SquaresFourIcon weight="bold"/><span>All boards</span>{count(boards.length)}</SidebarMenuButton></SidebarMenuItem>{boards.map(board=><SidebarMenuItem key={board.id}><SidebarMenuButton className={rowClass} aria-pressed={activeBoard?.id===board.id} onClick={()=>{selectBoard(board.id);onBoardChange();close();}}><ChatTextIcon weight="bold"/><span className="min-w-0 flex-1 truncate">{board.name}</span>{activeBoard?.id===board.id&&<CheckIcon weight="bold" className="ml-auto size-3 text-muted-foreground"/>}</SidebarMenuButton></SidebarMenuItem>)}<SidebarMenuItem><SidebarMenuButton className={rowClass} render={<Link href="/project/boards/new"/>} onClick={close}><PlusIcon weight="bold"/><span>Create board</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroupContent></SidebarGroup>
    <SidebarGroup className="p-0"><SidebarGroupLabel className={labelClass}>Requests</SidebarGroupLabel><SidebarGroupContent><SidebarMenu className="gap-px"><SidebarMenuItem><SidebarMenuButton className={rowClass} isActive={filter==="all"} aria-pressed={filter==="all"} onClick={()=>{onFilterChange("all");close();}}><TrayIcon weight="bold"/><span>All feedback</span>{count(items.length)}</SidebarMenuButton></SidebarMenuItem>{STATUS_ORDER.map(status=><SidebarMenuItem key={status}><SidebarMenuButton className={rowClass} isActive={filter===status} aria-pressed={filter===status} onClick={()=>{onFilterChange(status);close();}}><StatusLabel status={status}/>{count(items.filter(item=>item.status===status).length)}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></SidebarGroup>
    <SidebarGroup className="p-0"><SidebarGroupLabel className={labelClass}>Manage</SidebarGroupLabel><SidebarGroupContent><SidebarMenu className="gap-px">{links.map(({href,label,Icon})=><SidebarMenuItem key={href}><SidebarMenuButton className={rowClass} render={<Link href={href}/>} onClick={close}><Icon weight="bold"/><span>{label}</span></SidebarMenuButton></SidebarMenuItem>)}<SidebarMenuItem><SidebarMenuButton className={rowClass} onClick={onCopyLink}>{copied?<CheckIcon weight="bold"/>:<CopyIcon weight="bold"/>}<span>{copied?"Link copied":"Copy board link"}</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroupContent></SidebarGroup>
   </nav>
  </SidebarContent>
  <SidebarFooter className="gap-3 p-2">
   <section className="rounded-xl bg-background px-2.5 pb-[9px] pt-2.5 shadow-[inset_0_0_0_1px_#0000000f]"><h2 className="flex items-center gap-1.5 text-[13px] font-medium tracking-[-0.065px]"><BellIcon weight="bold" className="size-[15px]"/>Notifications</h2><p className="mt-[5px] text-xs leading-[1.45] tracking-[-0.06px] text-muted-foreground">Choose updates for the posts and conversations you follow.</p><Link href="/preferences" className="mt-[7px] inline-flex min-h-8 items-center gap-1 rounded-sm text-xs font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring md:min-h-0">Manage notifications<span aria-hidden="true">→</span></Link></section>
   <SidebarMenu className="gap-px"><SidebarMenuItem><SidebarMenuButton className={rowClass} render={<Link href="/design"/>} onClick={close}><SwatchesIcon weight="bold"/><span>Design previews</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
  </SidebarFooter>
 </Sidebar>;
}

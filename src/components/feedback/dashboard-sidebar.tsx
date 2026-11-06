"use client";
import { DropdownChevron } from "@/components/ui/dropdown-chevron";

import {useSettingsHref} from "./use-settings-href";
import {ProductTour} from "@/components/feedback/product-tour";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {useClerk} from "@clerk/nextjs";
import { GearSixIcon } from "@/components/icons";
import { NotificationsPanel } from "@/components/feedback/notifications-panel";

import { CreateBoardDialog } from "@/components/feedback/create-board-dialog";
import { SquaresFourIcon } from "@/components/icons";
import { ShareNetworkIcon } from "@/components/icons";
import { PlusIcon } from "@/components/icons";
import { TrayIcon } from "@/components/icons";
import { CopyIcon } from "@/components/icons";
import { CheckIcon } from "@/components/icons";
import { SignOutIcon } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Menu, MenuTrigger, MenuPopup, MenuItem, MenuSeparator, MenuGroup, MenuGroupLabel } from "@/components/ui/menu";
import { Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { StatusLabel } from "@/components/feedback/status-label";
import { useProject } from "@/components/feedback/project-provider";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { STATUS_ORDER, type FeedbackStatus } from "@/lib/feedback-data";


const rowClass = "h-11 gap-2.5 rounded-xl px-2 text-[13px] font-medium tracking-[-0.065px] text-muted-foreground hover:bg-sidebar-accent/60 data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground md:h-[30px] [&>svg]:size-[15px]";
const labelClass = "mb-1.5 h-auto px-2 text-[11px] font-semibold uppercase leading-4 tracking-[0.5px] text-muted-foreground";

export function DashboardSidebar({view,filter,onFilterChange,onCopyLink,copied}:{view:"requests"|"boards"|"share";filter:"all"|FeedbackStatus;onFilterChange:(filter:"all"|FeedbackStatus)=>void;onCopyLink:()=>void;copied:boolean}) {
 const {project,projects,switchProject,boards}=useProject();const {signOut}=useClerk();
 const {items:workspaceItems}=useFeedback();
 const boardId=useSearchParams().get("board");
 const items=boardId?workspaceItems.filter(item=>item.boardId===boardId):workspaceItems;
 const {setOpenMobile}=useSidebar();
 function close(){setOpenMobile(false);}
 function count(value:number){if(value===0)return null;return <span className="ml-auto flex h-4 min-w-4 shrink-0 items-center justify-center rounded-[5px] bg-primary px-1 text-[11px] font-medium leading-none tabular-nums text-primary-foreground">{value}</span>;}
 const settingsHref=useSettingsHref();
 const links=[{href:"/dashboard/share",label:"Share",Icon:ShareNetworkIcon},{href:settingsHref,label:"Settings",Icon:GearSixIcon}];
 return <Sidebar className="border-r border-sidebar-border/60">
  <SidebarHeader className="gap-0 p-2">
   <div className="flex items-center gap-1">
    <Menu><MenuTrigger render={<Button variant="ghost" className="h-11 min-w-0 flex-1 justify-start gap-2 rounded-md px-1.5 shadow-none md:h-8" data-tour="workspace-menu" aria-label="Workspace menu"/>}><Avatar className="size-6 shrink-0 rounded-full shadow-[inset_0_0_0_1px_#0000001a]"><AvatarImage src={project.logo}/><AvatarFallback className="rounded-full text-[13px] font-semibold" seed={project.id}/></Avatar><span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium tracking-[-0.13px]">{project.name}</span><DropdownChevron className="size-3 shrink-0 text-muted-foreground"/></MenuTrigger><MenuPopup align="start"><MenuGroup><MenuGroupLabel>Workspaces</MenuGroupLabel>{projects.map(workspace=><MenuItem key={workspace.id} onClick={()=>switchProject(workspace.id)} render={<Link prefetch={true} href="/dashboard/boards"/>}><span className="flex-1">{workspace.name}</span>{workspace.id===project.id&&<CheckIcon className="size-3"/>}</MenuItem>)}</MenuGroup><MenuSeparator/><MenuItem render={<Link prefetch={true} href="/onboarding"/>}>Create workspace</MenuItem><MenuSeparator/><MenuItem onClick={()=>{void signOut({redirectUrl:"/"})}} variant="destructive" className="text-red-600 data-highlighted:text-red-700"><SignOutIcon/>Log out</MenuItem></MenuPopup></Menu>
    <CreateBoardDialog trigger={<Button data-tour="create-board" aria-label="Create board" title="Create board" variant="ghost" size="icon-sm" className="relative size-5 min-h-5 sm:size-5 shrink-0 rounded-full border border-border bg-sidebar text-foreground shadow-none after:absolute after:-inset-3 hover:bg-sidebar-accent"><PlusIcon className="size-3 opacity-80"/></Button>}/>
    <NotificationsPanel/>
   </div>
  </SidebarHeader>
  <SidebarContent className="gap-0 px-2 pb-2">
   <nav aria-label="Dashboard navigation" className="flex flex-col gap-4 pt-2.5">
    <SidebarGroup className="p-0"><SidebarGroupLabel className={labelClass}>Workspace</SidebarGroupLabel><SidebarGroupContent><SidebarMenu className="gap-px"><SidebarMenuItem><SidebarMenuButton className={rowClass} data-tour="boards" isActive={view==="boards"} render={<Link prefetch={true} href="/dashboard/boards"/>} onClick={close}><SquaresFourIcon/><span>All boards</span>{count(boards.length)}</SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroupContent></SidebarGroup>
    <SidebarGroup data-tour="requests" className="p-0"><SidebarGroupLabel className={labelClass}>Requests</SidebarGroupLabel><SidebarGroupContent><SidebarMenu className="gap-px"><SidebarMenuItem><SidebarMenuButton className={rowClass} render={view === "requests" ? undefined : <Link prefetch={true} href="/dashboard"/>} isActive={view==="requests"&&filter==="all"} aria-pressed={view==="requests"&&filter==="all"} onClick={()=>{onFilterChange("all");close();}}><TrayIcon/><span>All feedback</span>{count(items.length)}</SidebarMenuButton></SidebarMenuItem>{STATUS_ORDER.map(status=><SidebarMenuItem data-tour={status==="open"?"feedback-statuses":undefined} key={status}><SidebarMenuButton className={rowClass} render={view === "requests" ? undefined : <Link prefetch={true} href={"/dashboard?status="+status}/>} isActive={view==="requests"&&filter===status} aria-pressed={view==="requests"&&filter===status} onClick={()=>{onFilterChange(status);close();}}><StatusLabel status={status}/>{count(items.filter(item=>item.status===status).length)}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></SidebarGroup>
    <SidebarGroup className="p-0"><SidebarGroupLabel className={labelClass}>Manage</SidebarGroupLabel><SidebarGroupContent><SidebarMenu className="gap-px">{links.map(({href,label,Icon})=><SidebarMenuItem key={href}><SidebarMenuButton className={rowClass} data-tour={label.toLowerCase()} render={<Link prefetch={true} href={href}/>} onClick={close}><Icon/><span>{label}</span></SidebarMenuButton></SidebarMenuItem>)}<SidebarMenuItem><SidebarMenuButton className={rowClass} onClick={onCopyLink}>{copied?<CheckIcon/>:<CopyIcon/>}<span>{copied?"Link copied":"Copy board link"}</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroupContent></SidebarGroup>
   </nav>
  </SidebarContent>

 <div className="mt-auto p-2"><ProductTour/></div>
 </Sidebar>;
}

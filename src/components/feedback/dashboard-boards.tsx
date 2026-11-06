"use client";
import * as React from "react";
import Link from "next/link";
import { DndContext, closestCenter, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RenameBoardDialog } from "@/components/feedback/rename-board-dialog";
import { PencilSimpleIcon } from "@/components/icons";
import { DotsThreeIcon } from "@/components/icons";
import { DotsSixVerticalIcon } from "@/components/icons";
import { CopyIcon } from "@/components/icons";
import { ShareNetworkIcon } from "@/components/icons";
import { ArrowUpRightIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Menu, MenuTrigger, MenuPopup, MenuItem } from "@/components/ui/menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toastManager } from "@/components/ui/toast";
import { useProject, type FeedbackBoard } from "@/components/feedback/project-provider";
import { NoBoard } from "@/components/feedback/board-context";
import { BoardIcon } from "@/components/feedback/board-icon";
import { boardHref } from "@/lib/project-links";
import { cn } from "@/lib/utils";
function BoardCard({board}:{board:FeedbackBoard}){
 const {project,selectBoard,boardsPending}=useProject();
 const [renaming,setRenaming]=React.useState(false);
 const {attributes,listeners,setNodeRef,setActivatorNodeRef,transform,transition,isDragging}=useSortable({id:board.id,disabled:boardsPending||project.role==='member'});
 const {onKeyDown,...pointerListeners}=listeners??{};
 async function copy(){try{await navigator.clipboard.writeText(new URL(boardHref(project,board),window.location.origin).href);toastManager.add({title:"Board link copied",type:"success"});}catch{toastManager.add({title:"Couldn’t copy the link",description:"Open the public board and copy its address.",type:"error"});}}
 return <><article aria-label={board.name} data-board-id={board.id} ref={setNodeRef} {...pointerListeners} style={{transform:CSS.Transform.toString(transform),transition:transition?"transform 200ms var(--ease-in-out)":undefined,zIndex:isDragging?1:undefined}} className={cn("group relative cursor-grab rounded-[18px] bg-background dark:bg-card p-5 outline-none",isDragging&&"cursor-grabbing shadow-lg ring-1 ring-ring/30")}><div className="flex min-h-6 items-center gap-2 pr-16"><BoardIcon board={board}/><h2 className="min-w-0 break-words text-base font-semibold leading-6">{board.name}</h2></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{board.description||"Help shape what we build next."}</p><p className="mt-3 text-xs leading-5 text-muted-foreground">Public board · /{board.slug}</p><div className="mt-5 flex flex-wrap gap-2"><Button size="sm" className="h-7 cursor-pointer rounded-[10px] px-[9px] text-sm" onClick={()=>selectBoard(board.id)} render={<Link prefetch={true} href={"/dashboard?board="+board.id}/>}>Open inbox</Button></div><Button disabled={boardsPending||project.role==='member'} ref={setActivatorNodeRef} {...attributes} onKeyDown={event=>onKeyDown?.(event)} aria-label={"Move board "+board.name} title="Drag to reorder · Space and arrows to move with keyboard" variant="ghost" size="icon" className="absolute right-12 top-3 size-8 cursor-grab rounded-full text-muted-foreground hover:text-muted-foreground focus-visible:text-foreground active:cursor-grabbing"><DotsSixVerticalIcon className="size-4"/></Button><Menu><MenuTrigger render={<Button aria-label={"Board actions for "+board.name} title="Board actions" variant="ghost" size="icon" className="absolute right-3 top-3 size-8 cursor-pointer rounded-full text-muted-foreground"/>}><DotsThreeIcon className="size-6"/></MenuTrigger><MenuPopup align="end"><MenuItem disabled={boardsPending||project.role==='member'} onClick={()=>setRenaming(true)}><PencilSimpleIcon/>Rename</MenuItem><MenuItem onClick={()=>selectBoard(board.id)} render={<Link prefetch={true} href="/dashboard/share"/>}><ShareNetworkIcon/>Share</MenuItem><MenuItem onClick={()=>void copy()}><CopyIcon/>Copy link</MenuItem><MenuItem onClick={()=>selectBoard(board.id)} render={<Link prefetch={true} href={boardHref(project,board)}/>}><ArrowUpRightIcon/>View public board</MenuItem></MenuPopup></Menu></article><RenameBoardDialog key={String(renaming)+board.name} board={renaming?board:null} onClose={()=>setRenaming(false)}/></>;
}
export function DashboardBoards(){
 const {project,boards,reorderBoards}=useProject();const id=React.useId();
 const sensors=useSensors(useSensor(MouseSensor,{activationConstraint:{distance:8}}),useSensor(TouchSensor,{activationConstraint:{delay:250,tolerance:8}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));
 function boardName(id:string|number){return boards.find(board=>board.id===id)?.name??"Board";}
 return <section aria-label="All boards" className="min-h-0 flex-1 overflow-y-auto"><div className="px-4 pt-3 md:hidden"><SidebarTrigger/></div><div className="mx-auto max-w-[1000px] px-6 pb-16 pt-8 sm:pt-14"><h1 className="text-[14px] font-semibold tracking-[-0.14px]">All boards</h1><p className="mt-2 text-sm text-muted-foreground">{boards.length} {boards.length===1?"board":"boards"} inside {project.name}</p><DndContext id={id} sensors={sensors} collisionDetection={closestCenter} accessibility={{screenReaderInstructions:{draggable:"To move a board, press Space. Use the arrow keys to choose a position, then Space to drop. Press Escape to cancel."},announcements:{onDragStart:({active})=>"Picked up "+boardName(active.id)+".",onDragOver:({active,over})=>over?"Moving "+boardName(active.id)+" to position "+(boards.findIndex(board=>board.id===over.id)+1)+".":undefined,onDragEnd:({active,over})=>over?"Moved "+boardName(active.id)+" to position "+(boards.findIndex(board=>board.id===over.id)+1)+".":"Board dropped.",onDragCancel:()=>"Board move cancelled."}}} onDragEnd={({active,over})=>{if(over&&active.id!==over.id)void reorderBoards(String(active.id),String(over.id)).catch(error=>toastManager.add({title:"Board order wasn’t saved",description:error instanceof Error?error.message:"Try moving the board again.",type:"error"}));}}><SortableContext items={boards.map(board=>board.id)} strategy={rectSortingStrategy}><div className="mt-8 grid gap-4 sm:grid-cols-2">{boards.map(board=><BoardCard key={board.id} board={board}/>)}</div></SortableContext></DndContext>{!boards.length&&<div className="mt-8"><NoBoard/></div>}</div></section>;
}

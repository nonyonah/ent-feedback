"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "@/components/ui/select";
import { useProject } from "@/components/feedback/project-provider";
export function BoardPicker() {
 const {boards,activeBoard,selectBoard}=useProject();
 return <div className="mb-6 max-w-sm"><p className="mb-2 text-xs font-medium text-muted-foreground">Feedback board</p><Select items={boards.map(b=>({label:b.name,value:b.id}))} value={activeBoard?.id??null} onValueChange={value=>{if(value)selectBoard(value);}}><SelectTrigger aria-label="Feedback board" className="w-full"><SelectValue placeholder="Choose a board"/></SelectTrigger><SelectPopup>{boards.map(board=><SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>)}</SelectPopup></Select></div>;
}
export function NoBoard() {return <div className="rounded-lg border p-8 text-center"><h2 className="text-lg font-semibold">Start with a feedback board.</h2><p className="mt-2 text-sm text-muted-foreground">Create a board inside your project, then share it with your customers.</p><Button className="mt-5" render={<Link href="/project/boards/new"/>}>Create your first board</Button></div>;}

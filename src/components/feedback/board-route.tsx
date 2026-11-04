"use client";
import * as React from "react";
import Link from "next/link";
import { useProject } from "@/components/feedback/project-provider";
import { BoardView } from "@/components/feedback/board-view";
import { BoardLoading } from "@/components/feedback/board-states";
import { Button } from "@/components/ui/button";
import { SubmissionPage } from "@/components/feedback/submission-page";
export function BoardRoute({projectSlug,boardSlug,view}:{projectSlug:string;boardSlug:string;view?:"submit"}) {
  const {project,boards,activeBoard,selectBoard}=useProject();
  const board=project.slug===projectSlug?boards.find(candidate=>candidate.slug===boardSlug):undefined;
  React.useEffect(()=>{if(board&&activeBoard?.id!==board.id)selectBoard(board.id);},[board,activeBoard?.id,selectBoard]);
  if(!board)return <main className="mx-auto max-w-[680px] px-4 py-20 text-center"><h1 className="text-2xl font-semibold">This board isn’t available.</h1><p className="mt-3 text-sm text-muted-foreground">Open the project to choose a board. Boards created in this frontend preview reset on refresh.</p><Button className="mt-6" render={<Link href="/project"/>}>Open project</Button></main>;
  if(activeBoard?.id!==board.id)return <BoardLoading/>;
  return view==="submit"?<SubmissionPage/>:<BoardView/>;
}

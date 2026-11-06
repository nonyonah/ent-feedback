"use client";
import * as React from "react";
import Link from "next/link";
import { useProject } from "@/components/feedback/project-provider";
import {PublicBoardContent} from "@/components/feedback/public-board-content";
import { BoardLoading } from "@/components/feedback/board-states";
import { Button } from "@/components/ui/button";
import { SubmissionPage } from "@/components/feedback/submission-page";
export function BoardRoute({projectSlug,boardSlug,view}:{projectSlug:string;boardSlug:string;view?:"submit"}) {
  const {project,projects,switchProject,boards,activeBoard,selectBoard}=useProject();
  const targetProject=projects.find(candidate=>candidate.slug===projectSlug);
  React.useEffect(()=>{if(targetProject&&targetProject.id!==project.id)switchProject(targetProject.id);},[targetProject,project.id,switchProject]);
  const board=project.slug===projectSlug?boards.find(candidate=>candidate.slug===boardSlug):undefined;
  React.useEffect(()=>{if(board&&activeBoard?.id!==board.id)selectBoard(board.id);},[board,activeBoard?.id,selectBoard]);
  if(targetProject&&targetProject.id!==project.id)return <BoardLoading/>;
  if(!board)return <main className="mx-auto max-w-[680px] px-4 py-20 text-center"><h1 className="text-2xl font-semibold">This board isn’t available.</h1><p className="mt-3 text-sm text-muted-foreground">Choose another board or check the link with the workspace owner.</p><Button className="mt-6" render={<Link href="/dashboard/boards"/>}>Open project</Button></main>;
  if(activeBoard?.id!==board.id)return <BoardLoading/>;
  return view==="submit"?<SubmissionPage/>:<PublicBoardContent/>;
}

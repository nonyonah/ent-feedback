"use client";
import * as React from "react";
import { WidgetPanel } from "@/components/feedback/widget";
import { useProject } from "@/components/feedback/project-provider";
import { BoardLoading } from "@/components/feedback/board-states";

function postToHost(message: object) {
  try {
    if (document.referrer && window.parent !== window) {
      window.parent.postMessage(message, new URL(document.referrer).origin);
    }
  } catch {}
}
function close() {
  postToHost({ type: "ent:close", inputModality: document.documentElement.dataset.inputModality });
}

export function EmbeddedBoard({ boardSlug }: { boardSlug?: string }) {
  const { project, boards, activeBoard, selectBoard } = useProject();
  const board = boardSlug ? boards.find(item => item.slug === boardSlug) : boards[0];
  React.useEffect(() => {
    if (board && activeBoard?.id !== board.id) selectBoard(board.id);
  }, [board, activeBoard?.id, selectBoard]);
  React.useEffect(() => {
    const report=()=>{
      const themeMode=project.theme==="dark"||project.theme==="light"?project.theme:"system";
      postToHost({type:"ent:appearance",accent:project.accent,theme:document.documentElement.classList.contains("dark")?"dark":"light",themeMode});
    };
    report();
    const observer=new MutationObserver(report);observer.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
    window.addEventListener("ent-theme-change",report);window.addEventListener("storage",report);
    return()=>{observer.disconnect();window.removeEventListener("ent-theme-change",report);window.removeEventListener("storage",report);};
  }, [project.accent,project.theme]);
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  if (!board) return <main className="flex min-h-svh items-center justify-center p-6 text-center text-sm text-muted-foreground">This feedback board isn’t available. Check the widget installation settings.</main>;
  if (activeBoard?.id !== board.id) return <BoardLoading />;
  return <main className="flex h-dvh min-h-0 flex-col overflow-hidden"><WidgetPanel embedded onClose={close} /></main>;
}

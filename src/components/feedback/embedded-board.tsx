"use client";
import * as React from "react";
import { WidgetPanel } from "@/components/feedback/widget";
export function EmbeddedBoard() {
  function close() {
    try { if (document.referrer) window.parent.postMessage({ type: "ent:close" }, new URL(document.referrer).origin); } catch {}
  }
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  return <main className="flex h-dvh min-h-0 flex-col overflow-hidden"><WidgetPanel embedded onClose={close} /></main>;
}

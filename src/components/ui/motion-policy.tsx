"use client";

import { useEffect } from "react";

/** Keep keyboard-driven interactions immediate, including portalled surfaces. */
export function MotionPolicy() {
  useEffect(() => {
    const root = document.documentElement;
    const onKey = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key.length === 1 && event.target instanceof HTMLElement && event.target.matches("input,textarea,[contenteditable=true]")) return;
      root.dataset.inputModality = "keyboard";
    };
    const onPointer = () => { root.dataset.inputModality = "pointer"; };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointer, true);
      delete root.dataset.inputModality;
    };
  }, []);
  return null;
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { ErrorNotice } from "@/components/ui/error-notice";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import { type FeedbackBoard, useProject } from "./project-provider";

export function DuplicateBoardDialog({board, onClose}: {board: FeedbackBoard; onClose: () => void}) {
  const {duplicateBoard, boardsPending} = useProject();
  const router = useRouter();
  const id = React.useId();
  const [name, setName] = React.useState(board.name.slice(0, 53) + " (copy)");
  const [copyItems, setCopyItems] = React.useState(false);
  const [copyEngagement, setCopyEngagement] = React.useState(false);
  const [error, setError] = React.useState("");
  return <Dialog open onOpenChange={open => { if (!open && !boardsPending) onClose(); }}>
    <DialogPopup bottomStickOnMobile={false} className="max-w-[440px]">
      <form onSubmit={async event => {
        event.preventDefault();
        if (boardsPending || !name.trim()) return;
        setError("");
        try {
          const created = await duplicateBoard(board.id, {name, copyItems, copyEngagement});
          onClose();
          toastManager.add({type: "success", title: "Board duplicated"});
          router.push("/dashboard?board=" + created.id);
        } catch (err) { setError(err instanceof Error ? err.message : "Couldn’t duplicate this board. Try again."); }
      }}>
        <DialogHeader>
          <DialogTitle>Duplicate board</DialogTitle>
          <DialogDescription>Copy this board’s appearance and settings to a new board.</DialogDescription>
        </DialogHeader>
        <fieldset disabled={boardsPending} className="space-y-4 px-6 pb-6">
          <div><label htmlFor={id} className="mb-1.5 block text-xs font-medium">New board name</label>
            <Input id={id} autoFocus required maxLength={60} value={name} onChange={event => setName(event.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={copyItems} onCheckedChange={checked => {
            setCopyItems(checked); if (!checked) setCopyEngagement(false);
          }} />Copy items</label>
          {copyItems && <label className="flex items-center gap-2 ps-6 text-sm"><Checkbox checked={copyEngagement} onCheckedChange={setCopyEngagement} />Copy votes and comments</label>}
          {error && <ErrorNotice>{error}</ErrorNotice>}
        </fieldset>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="secondary" disabled={boardsPending} />}>Cancel</DialogClose>
          <ActionButton type="submit" state={boardsPending ? "pending" : error ? "error" : "idle"} pendingLabel="Duplicating board…" disabled={boardsPending || !name.trim()}>Duplicate board</ActionButton>
        </DialogFooter>
      </form>
    </DialogPopup>
  </Dialog>;
}

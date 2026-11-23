"use client";

import {createContext, useContext, useEffect, useReducer, useState, useTransition} from "react";
import {Button} from "@/components/ui/button";
import {Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPopup, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {ErrorNotice} from "@/components/ui/error-notice";
import {toastManager} from "@/components/ui/toast";
import {clearSampleContentAction, editSampleContentAction, sampleBoardIdsAction} from "@/server/actions/sample-content";
import type {FeedbackItemData} from "@/lib/feedback-data";
import {useFeedback} from "./feedback-provider";
import {useProject, type FeedbackBoard} from "./project-provider";

const Samples = createContext<{ids: string[]; refresh: () => void}>({ids: [], refresh: () => {}});

export function SampleBoardsProvider({children}: {children: React.ReactNode}) {
  const {project, boards, workspaceReady} = useProject();
  const [attempt, refresh] = useReducer(n => n + 1, 0);
  const [snapshot, setSnapshot] = useState<{workspaceId: string; ids: string[]}>();
  const boardKey = boards.map(board => board.id).join(",");
  useEffect(() => {
    if (!workspaceReady || !boardKey || project.role !== "owner") return;
    let active = true;
    void sampleBoardIdsAction(project.id).then(result => {
      if (active && result.ok) setSnapshot({workspaceId: project.id, ids: result.data});
    }).catch(() => {});
    return () => {active = false;};
  }, [attempt, workspaceReady, boardKey, project.id, project.role]);
  return <Samples.Provider value={{ids: snapshot?.workspaceId === project.id ? snapshot.ids : [], refresh}}>{children}</Samples.Provider>;
}

export function SampleControls({board, item, banner = false}: {board: FeedbackBoard; item?: FeedbackItemData; banner?: boolean}) {
  const {project} = useProject();
  const {retry} = useFeedback();
  const {ids, refresh} = useContext(Samples);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  if (project.role !== "owner" || !(item ? item.isSample : ids.includes(board.id))) return null;
  const label = item ? "Edit sample" : "Clear sample content";
  return <div className={banner ? "flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-sm" : "inline-flex"}>
    {banner && <span>This board has sample content.</span>}
    <Dialog open={open} onOpenChange={value => {
      if (pending) return;
      setOpen(value);
      if (value) {setTitle(item?.title ?? ""); setDescription(item?.description ?? ""); setError("");}
    }}>
      <DialogTrigger render={<Button variant="outline" size="sm"/>}>{label}</DialogTrigger>
      <DialogPopup className="max-w-md" showCloseButton={!pending}>
        <form onSubmit={event => {
          event.preventDefault();
          start(async () => {
            setError("");
            try {
              const result = item ? await editSampleContentAction(project.id, board.id, item.id, {title, description})
                : await clearSampleContentAction(project.id, board.id);
              if (!result.ok) throw Error(result.error.message);
              setOpen(false);
              retry();
              refresh();
              toastManager.add({type: "success", title: item ? "Sample saved as regular feedback" : "Sample content cleared"});
            } catch (cause) {setError(cause instanceof Error ? cause.message : "Please try again.");}
          });
        }}>
          <DialogHeader><DialogTitle>{item ? "Edit sample feedback" : "Clear sample content?"}</DialogTitle>
            <DialogDescription>{item ? "Saving changes keeps this item when samples are cleared. Its starting votes are removed; real votes and comments stay." : "Remove all sample items from " + board.name + ", including their votes and comments. Regular feedback and edited samples stay. This can’t be undone."}</DialogDescription>
          </DialogHeader>
          {item && <fieldset disabled={pending} className="space-y-4 px-6 pb-5 text-sm">
            <label className="block">Title<Input required minLength={4} maxLength={160} value={title} onChange={e => setTitle(e.target.value)}/></label>
            <label className="block">Description<Textarea required maxLength={3000} value={description} onChange={e => setDescription(e.target.value)}/></label>
          </fieldset>}
          {error && <ErrorNotice className="mx-6 mb-4">{error}</ErrorNotice>}
          <DialogFooter><Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={pending} variant={item ? "default" : "destructive"} disabled={pending || (!!item && (title.trim() === item.title && description.trim() === item.description))}>{item ? "Save changes" : label}</Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  </div>;
}

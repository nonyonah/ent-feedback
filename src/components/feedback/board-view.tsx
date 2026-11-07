"use client";

import {BoardLoading} from "@/components/feedback/board-states";
import { NoBoard } from "@/components/feedback/board-context";
import * as React from "react";
import { PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Select, SelectGroup, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/empty-state";
import { BoardFeedbackRow } from "@/components/feedback/board-feedback-row";
import { SubmitDialog } from "@/components/feedback/submit-dialog";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { Widget } from "@/components/feedback/widget";
import { STATUS_LABELS, STATUS_ORDER, type FeedbackStatus } from "@/lib/feedback-data";
import { cn } from "@/lib/utils";
import { FEEDBACK_SORT_OPTIONS, compareFeedback } from "@/lib/feedback-sort";
import { useProject } from "@/components/feedback/project-provider";

const SORT_OPTIONS = FEEDBACK_SORT_OPTIONS;

export function BoardView(): React.ReactElement {
  const { items,loading,error } = useFeedback();
  const { activeBoard } = useProject();
  const [filter, setFilter] = React.useState<"all" | FeedbackStatus>("all");
  const [sort, setSort] = React.useState("trending");
  const visibleItems = items.filter((item) => filter === "all" || item.status === filter).sort((a, b) => compareFeedback(sort, a, b));

  if(loading)return <BoardLoading/>;
  if(error)return <main className="p-6 text-center text-sm">Feedback is unavailable. Use Retry loading feedback above.</main>;
  if (!activeBoard) return <main className="mx-auto w-full max-w-[720px] px-4 py-16"><NoBoard/></main>;
  return (
    <>
      <main className="mx-auto w-full max-w-[720px] flex-1 px-4 pb-28 pt-8">
        <div className="mx-auto w-full max-w-[680px]">
          <h1 className="sr-only">{activeBoard.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Filter ideas by status" className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 py-1">
              {(["all", ...STATUS_ORDER] as const).map((status) => <Button key={status} aria-pressed={filter === status} onClick={() => setFilter(status)} variant={filter === status ? "default" : "outline"} className={cn("min-h-11 shrink-0 rounded-full px-3 shadow-none before:hidden sm:h-8 sm:min-h-8", filter !== status && "text-muted-foreground")}>{status === "all" ? "All" : status === "shipped" ? "Completed" : STATUS_LABELS[status]}</Button>)}
            </div>
            <Select items={SORT_OPTIONS} value={sort} onValueChange={(value) => { if (value) setSort(value); }}>
              <SelectTrigger indicator="filter" aria-label="Sort feedback" className="min-h-11 min-w-0 w-auto gap-[9px] border-transparent shadow-none before:hidden sm:min-h-8 [&_[data-slot=select-value]]:flex-none"><SelectValue /></SelectTrigger>
              <SelectPopup><SelectGroup>{SORT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectPopup>
            </Select>
            <SubmitDialog trigger={<Button className="min-h-11 shrink-0 px-3 sm:h-8 sm:min-h-8"><PlusIcon data-icon="inline-start" />Submit feedback</Button>} />
          </div>
          <p aria-live="polite" className="sr-only">{visibleItems.length} {visibleItems.length === 1 ? "idea" : "ideas"}</p>
          <div className="mt-4 flex flex-col">{visibleItems.map((item) => <BoardFeedbackRow item={item} key={item.id} />)}</div>
          {visibleItems.length === 0 && <div className="mt-6 flex flex-col items-center gap-5"><EmptyState variant={items.length?"search":"empty"} description={items.length ? "Try another status." : "Share the first idea."} title={items.length ? "No matching feedback" : "No feedback yet"} />{items.length>0&&<Button onClick={() => setFilter("all")} variant="outline">Show all feedback</Button>}</div>}
        </div>
      </main>
      <Widget />
    </>
  );
}

"use client";

import { NoBoard } from "@/components/feedback/board-context";
import * as React from "react";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
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
  const { items } = useFeedback();
  const { project, activeBoard } = useProject();
  const [filter, setFilter] = React.useState<"all" | FeedbackStatus>("all");
  const [sort, setSort] = React.useState("top");
  const visibleItems = items.filter((item) => filter === "all" || item.status === filter).sort((a, b) => compareFeedback(sort, a, b));

  if (!activeBoard) return <main className="mx-auto w-full max-w-[720px] px-4 py-16"><NoBoard/></main>;
  return (
    <>
      <section className="border-b bg-background">
        <div className="mx-auto w-full max-w-[720px] px-4 pb-10 pt-10 sm:pb-12 sm:pt-14">
          <p className="text-sm text-muted-foreground">{activeBoard.name}</p><h1 className="mt-4 max-w-[428px] text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{activeBoard.description || project.description || "Help shape what we build next."}</h1>
          <p className="mt-3 max-w-lg text-pretty text-base leading-7 text-muted-foreground">Share an idea, vote on what matters, and follow what ships. We review every request and build the ones teams ask for most.</p>
          <div className="mt-6"><SubmitDialog trigger={<Button className="min-h-11 px-5 sm:h-9 sm:min-h-9"><PlusIcon weight="bold" data-icon="inline-start" />Share an idea</Button>} /></div>
        </div>
      </section>
      <main className="mx-auto w-full max-w-[720px] flex-1 px-4 pb-28 pt-8">
        <div className="mx-auto w-full max-w-[680px]">
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <div role="group" aria-label="Filter ideas by status" className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 py-1">
              {(["all", ...STATUS_ORDER] as const).map((status) => <Button key={status} aria-pressed={filter === status} onClick={() => setFilter(status)} variant={filter === status ? "default" : "outline"} className={cn("min-h-11 shrink-0 rounded-full px-3 shadow-none before:hidden sm:h-8 sm:min-h-8", filter !== status && "text-muted-foreground")}>{status === "all" ? "All" : status === "shipped" ? "Completed" : STATUS_LABELS[status]}</Button>)}
            </div>
            <Select items={SORT_OPTIONS} value={sort} onValueChange={(value) => { if (value) setSort(value); }}>
              <SelectTrigger aria-label="Sort feedback" className="min-h-11 min-w-0 w-auto gap-[9px] border-transparent shadow-none before:hidden sm:min-h-8 [&_[data-slot=select-value]]:flex-none"><SelectValue /></SelectTrigger>
              <SelectPopup><SelectGroup>{SORT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectPopup>
            </Select>
          </div>
          <p aria-live="polite" className="sr-only">{visibleItems.length} {visibleItems.length === 1 ? "idea" : "ideas"}</p>
          <div className="mt-1 flex flex-col">{visibleItems.map((item) => <BoardFeedbackRow item={item} key={item.id} />)}</div>
          {visibleItems.length === 0 && <div className="mt-6 flex flex-col items-center gap-5"><EmptyState description={items.length ? "Nothing matches this status yet. Share an idea or look at everything on the board." : "Be the first to share an idea. Your feedback will help shape what comes next."} title={items.length ? "No ideas in this view" : "Your first idea starts here"} /><Button onClick={() => setFilter("all")} variant="outline">Show all ideas</Button></div>}
        </div>
      </main>
      <Widget />
    </>
  );
}

"use client";

import {BoardLoading,BoardState} from "@/components/feedback/board-states";
import { NoBoard } from "@/components/feedback/board-context";
import * as React from "react";
import { PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {BoardToolbar} from "./board-toolbar";
import { EmptyState } from "@/components/feedback/empty-state";
import { BoardFeedbackRow } from "@/components/feedback/board-feedback-row";
import { SubmitDialog } from "@/components/feedback/submit-dialog";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { Widget } from "@/components/feedback/widget";
import { type FeedbackStatus } from "@/lib/feedback-data";
import { compareFeedback } from "@/lib/feedback-sort";
import { useProject } from "@/components/feedback/project-provider";


export function BoardView(): React.ReactElement {
  const { items,loading,error,retry } = useFeedback();
  const { activeBoard } = useProject();
  const [filter, setFilter] = React.useState<"all" | FeedbackStatus>("all");
  const [sort, setSort] = React.useState("trending");
  const visibleItems = items.filter((item) => filter === "all" || item.status === filter).sort((a, b) => compareFeedback(sort, a, b));

  if(loading)return <BoardLoading/>;
  if(error)return <main id="public-content" tabIndex={-1} className="scroll-mt-28 md:scroll-mt-16 mx-auto w-full max-w-5xl px-4 py-8 sm:px-8"><BoardState kind="error" onRetry={retry}/></main>;
  if (!activeBoard) return <main id="public-content" tabIndex={-1} className="scroll-mt-28 md:scroll-mt-16 mx-auto w-full max-w-5xl px-4 py-16 sm:px-8"><NoBoard/></main>;
  return (
    <>
      <main id="public-content" tabIndex={-1} className="scroll-mt-28 md:scroll-mt-16 mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-8 sm:px-8">
        <div className="mx-auto w-full">
          <h1 className="sr-only">{activeBoard.name}</h1>
          <BoardToolbar filter={filter} onFilterChange={setFilter} sort={sort} onSortChange={setSort}>
            <SubmitDialog trigger={<Button><PlusIcon data-icon="inline-start"/>Submit feedback</Button>}/>
          </BoardToolbar>
          <p aria-live="polite" className="sr-only">{visibleItems.length} {visibleItems.length === 1 ? "feedback post" : "feedback posts"}</p>
          <div className="mt-6 flex flex-col gap-2">{visibleItems.map((item) => <BoardFeedbackRow item={item} key={item.id} />)}</div>
          {visibleItems.length === 0 && <div className="mt-6 flex flex-col items-center gap-5"><EmptyState variant={items.length?"search":"empty"} description={items.length ? "Try another status." : "Share the first idea."} title={items.length ? "No matching feedback" : "No feedback yet"} />{items.length>0&&<Button onClick={() => setFilter("all")} variant="outline">Show all feedback</Button>}</div>}
        </div>
      </main>
      <Widget />
    </>
  );
}

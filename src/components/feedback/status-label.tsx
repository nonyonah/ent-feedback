import { STATUS_LABELS, type FeedbackStatus } from "@/lib/feedback-data";

const DOTS: Record<FeedbackStatus, string> = {
  open: "bg-status-open-dot",
  planned: "bg-status-planned-dot",
  "in-progress": "bg-status-progress-dot",
  shipped: "bg-status-shipped-dot",
};

export function StatusLabel({ status, iconOnly = false }: { status: FeedbackStatus; iconOnly?: boolean }): React.ReactElement {
  return <span data-slot="status-label" aria-label={iconOnly ? STATUS_LABELS[status] : undefined} title={iconOnly ? STATUS_LABELS[status] : undefined} className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap py-0.5 text-xs font-medium leading-4">
    <span data-slot="status-dot" aria-hidden="true" className={"size-2 shrink-0 rounded-full "+DOTS[status]}/>
    {!iconOnly && STATUS_LABELS[status]}
  </span>;
}

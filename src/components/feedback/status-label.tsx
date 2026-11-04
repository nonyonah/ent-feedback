import { STATUS_LABELS, type FeedbackStatus } from "@/lib/feedback-data";
import { cn } from "@/lib/utils";

const COLORS: Record<FeedbackStatus, string> = {
  open: "text-status-open-fg",
  planned: "text-status-planned-fg",
  "in-progress": "text-status-progress-fg",
  shipped: "text-status-shipped-fg",
};

export function StatusLabel({ status, iconOnly = false }: { status: FeedbackStatus; iconOnly?: boolean }): React.ReactElement {
  return <span aria-label={iconOnly ? STATUS_LABELS[status] : undefined} title={iconOnly ? STATUS_LABELS[status] : undefined} className={cn("inline-flex items-center gap-1 py-0.5 text-xs font-medium leading-4", COLORS[status])}>
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true" className="size-4 shrink-0">
      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,16c8.15,0,24,31.06,24,88,0,8.24-.34,15.92-.93,23.07-7.15.59-14.83.93-23.07.93-56.94,0-88-15.85-88-24A88.1,88.1,0,0,1,128,40ZM43.4,152.26C63.28,162.65,95.76,168,128,168c7.09,0,14.19-.26,21.17-.77C144.23,199,134,216,128,216A88.17,88.17,0,0,1,43.4,152.26Z" />
    </svg>
    {!iconOnly && STATUS_LABELS[status]}
  </span>;
}

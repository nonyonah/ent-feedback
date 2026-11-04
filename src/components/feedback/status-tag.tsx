import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, type FeedbackStatus } from "@/lib/feedback-data";

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  open: "bg-status-open-bg text-status-open-fg",
  planned: "bg-status-planned-bg text-status-planned-fg",
  "in-progress": "bg-status-progress-bg text-status-progress-fg",
  shipped: "bg-status-shipped-bg text-status-shipped-fg",
};

export function StatusTag({
  status,
  className,
}: {
  status: FeedbackStatus;
  className?: string;
}): React.ReactElement {
  return (
    <Badge
      className={cn(
        "h-5 min-w-0 rounded-full border-transparent px-2 py-0.5 text-xs font-medium leading-4 sm:h-5 sm:text-xs",
        STATUS_STYLES[status],
        className,
      )}
      variant="outline"
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}

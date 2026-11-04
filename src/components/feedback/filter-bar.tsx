"use client";

import { FilterChip } from "@/components/feedback/filter-chip";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  type FeedbackStatus,
} from "@/lib/feedback-data";

export type FilterValue = "all" | FeedbackStatus;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  ...STATUS_ORDER.map((status) => ({
    value: status as FilterValue,
    label: STATUS_LABELS[status],
  })),
];

export function FilterBar({
  filter,
  onFilterChange,
}: {
  filter: FilterValue;
  onFilterChange: (value: FilterValue) => void;
}): React.ReactElement {
  return (
    <div
      aria-label="Filter ideas by status"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1"
      role="group"
    >
      {FILTERS.map((item) => (
        <FilterChip
          key={item.value}
          label={item.label}
          onClick={() => onFilterChange(item.value)}
          selected={filter === item.value}
        />
      ))}
    </div>
  );
}

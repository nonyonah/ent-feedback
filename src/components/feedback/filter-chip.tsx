"use client";

import { cn } from "@/lib/utils";

export function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      aria-pressed={selected}
      className={cn(
        "relative inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        selected
          ? "border-vote-active-border bg-vote-active-bg text-primary-text hover:bg-vote-active-bg"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

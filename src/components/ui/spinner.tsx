import type React from "react";
import { cn } from "@/lib/utils";

// coss UI Spinner / Lucide Loader2 geometry, inlined to avoid another icon dependency.
export function Spinner({
  className,
  ...props
}: React.ComponentProps<'svg'>): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-slot="spinner"
      aria-label="Loading"
      className={cn("size-4 shrink-0 animate-spin motion-reduce:animate-none", className)}
      role="status"
      {...props}
    ><path d="M12 2a10 10 0 1 0 10 10" /></svg>
  );
}

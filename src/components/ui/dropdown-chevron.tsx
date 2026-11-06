import type { ComponentProps } from "react";
import { CaretDownIcon, CaretUpIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/** The trigger owns expanded state; the indicator follows its ARIA state. */
export function DropdownChevron({ className, ...props }: ComponentProps<"span">) {
  return <span aria-hidden="true" {...props} data-slot="dropdown-chevron" className={cn("relative inline-flex size-4 shrink-0 items-center justify-center self-center align-middle leading-none [&>svg]:absolute [&>svg]:inset-0 [&>svg]:m-0 [&>svg]:size-full", className)}>
    <CaretDownIcon data-direction="down" />
    <CaretUpIcon data-direction="up" />
  </span>;
}

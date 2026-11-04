import { TrayIcon as InboxIcon } from "@phosphor-icons/react/dist/ssr/Tray";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[360px] flex-col items-center gap-3 p-8 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <InboxIcon weight="bold" aria-hidden="true" className="size-5" />
      </span>
      <h3 className="text-xl font-semibold leading-7 text-foreground">{title}</h3>
      <p className="text-sm leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

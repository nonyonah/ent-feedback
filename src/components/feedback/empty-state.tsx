import {EmptyIllustration} from "./empty-illustration";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  className,
  variant="empty",
}: {
  title: string;
  description: string;
  className?: string;
  variant?: "empty"|"search"|"notifications";
}): React.ReactElement {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[360px] flex-col items-center gap-3 p-8 text-center",
        className,
      )}
    >
      <EmptyIllustration variant={variant}/>
      <h3 className="text-xl font-semibold leading-7 text-foreground">{title}</h3>
      <p className="text-sm leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

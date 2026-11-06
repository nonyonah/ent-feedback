import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function PageShell({ eyebrow, title, description, children, wide = false, embedded = false, backHref = "/dashboard/boards", backLabel = "Back to project" }: { eyebrow?: string; title: string; description: string; children: React.ReactNode; wide?: boolean; embedded?: boolean; backHref?: string | null; backLabel?: string }) {
  const Tag = embedded ? "section" : "main";
  return <Tag className={embedded ? "mx-auto w-full max-w-[760px] px-6 pb-16 pt-8 sm:pt-14" : "mx-auto w-full px-4 pb-20 pt-8 sm:px-6 sm:pt-12 " + (wide ? "max-w-[1040px]" : "max-w-[680px]")}>
    {!embedded && backHref && <Link href={backHref} className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeftIcon className="size-4" aria-hidden="true" />{backLabel}</Link>}
    {!embedded && eyebrow && <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{eyebrow}</p>}
    <h1 className="text-balance text-2xl font-semibold leading-8 tracking-tight">{title}</h1><p className="mt-2 max-w-lg text-pretty text-sm leading-6 text-muted-foreground">{description}</p>
    <div className="mt-8">{children}</div>
  </Tag>;
}

export function PreviewNote({ children }: { children?: React.ReactNode }) {
  return <p className="text-xs leading-5 text-muted-foreground">{children ?? "Design preview. Changes stay in this session until the backend is connected."}</p>;
}

export function BackToBoard() {
  return <Button variant="outline" render={<Link href="/" />}><ArrowLeftIcon data-icon="inline-start" />Back to the board</Button>;
}

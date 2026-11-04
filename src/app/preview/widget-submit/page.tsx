import { WidgetPanel } from "@/components/feedback/widget";
import { PageShell } from "@/components/feedback/page-shell";
export default function Page(){return <PageShell title="A little space for a big idea." description="The widget submission view, at its native desktop width."><div className="mx-auto h-[560px] w-full max-w-[380px] overflow-hidden rounded-xl border shadow-lg"><WidgetPanel embedded initialView="submit"/></div></PageShell>;}

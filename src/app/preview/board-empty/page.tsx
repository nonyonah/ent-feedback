import { BoardState } from "@/components/feedback/board-states";
import { PageShell } from "@/components/feedback/page-shell";
export default function Page(){return <PageShell eyebrow="Board · empty" title="Feedback" description="Help shape what we build next."><BoardState kind="empty"/></PageShell>;}

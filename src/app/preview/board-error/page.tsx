import { BoardState } from "@/components/feedback/board-states";
import { PageShell } from "@/components/feedback/page-shell";
export default function Page(){return <PageShell eyebrow="Board · error" title="Feedback" description="Help shape what we build next."><BoardState kind="error"/></PageShell>;}

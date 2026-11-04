import { BoardLoading } from "@/components/feedback/board-states";
import { PageShell } from "@/components/feedback/page-shell";
export default function Page(){return <PageShell eyebrow="Board · loading" title="Feedback" description="The conversation will be right here."><BoardLoading/></PageShell>;}

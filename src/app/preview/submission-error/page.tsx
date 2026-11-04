import { FeedbackForm } from "@/components/feedback/feedback-form";
import { PageShell } from "@/components/feedback/page-shell";
export default function Page(){return <PageShell eyebrow="Submission · error" title="Share an idea" description="One idea at a time. A little context goes a long way."><div className="mx-auto max-w-[480px] rounded-xl border p-6"><FeedbackForm preview="error"/></div></PageShell>;}

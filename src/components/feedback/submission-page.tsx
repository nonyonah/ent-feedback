"use client";
import { PageShell, PreviewNote } from "@/components/feedback/page-shell";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { NoBoard } from "@/components/feedback/board-context";
import { useProject } from "@/components/feedback/project-provider";
import { boardHref } from "@/lib/project-links";
export function SubmissionPage(){const {project,activeBoard}=useProject();return <PageShell backHref={activeBoard?boardHref(project,activeBoard):"/project"} backLabel={activeBoard?"Back to the board":"Back to project"} eyebrow={activeBoard?.name} title="What could be better?" description="A small improvement or a big idea. We’d love to hear it.">{activeBoard?<div className="rounded-lg border p-5 sm:p-6"><FeedbackForm/></div>:<NoBoard/>}<div className="mt-5"><PreviewNote/></div></PageShell>;}

"use client";
import { PageShell } from "@/components/feedback/page-shell";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { NoBoard } from "@/components/feedback/board-context";
import { useProject } from "@/components/feedback/project-provider";
import { boardHref } from "@/lib/project-links";
export function SubmissionPage(){const {project,activeBoard}=useProject();return <PageShell backHref={activeBoard?boardHref(project,activeBoard):"/dashboard/boards"} backLabel={activeBoard?"Back to the board":"Back to workspace"} eyebrow={activeBoard?.name} title="What could be better?" description="A small improvement or a big idea. We’d love to hear it.">{activeBoard?<div className="mx-auto max-w-[600px] overflow-hidden rounded-xl border border-border"><FeedbackForm/></div>:<NoBoard/>}</PageShell>;}

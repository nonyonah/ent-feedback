import type { Project, FeedbackBoard } from "@/components/feedback/project-provider";
export function boardHref(project: Pick<Project,"slug">, board: Pick<FeedbackBoard,"slug">) { return "/p/" + encodeURIComponent(project.slug) + "/boards/" + encodeURIComponent(board.slug); }

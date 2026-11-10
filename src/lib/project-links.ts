import type { Project, FeedbackBoard } from "@/components/feedback/project-provider";
import {workspaceBaseDomain,workspacePublicUrl} from "@/lib/workspace-domain";
export function boardHref(project: Pick<Project,"slug">, board: Pick<FeedbackBoard,"slug">) { return workspaceBaseDomain()?workspacePublicUrl(project.slug,"/boards/"+encodeURIComponent(board.slug)):"/p/" + encodeURIComponent(project.slug) + "/boards/" + encodeURIComponent(board.slug); }

export function feedbackHref(project: Pick<Project,"slug">, id: string) {
  const path = "/items/" + encodeURIComponent(id);
  return workspaceBaseDomain() ? workspacePublicUrl(project.slug, path) : "/p/" + encodeURIComponent(project.slug) + path;
}

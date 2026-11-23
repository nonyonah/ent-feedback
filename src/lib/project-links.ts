import type { Project, FeedbackBoard } from "@/components/feedback/project-provider";
const workspacePath=(project:Pick<Project,"slug">,path:string)=>"/"+encodeURIComponent(project.slug)+path;
export function boardHref(project: Pick<Project,"slug">, board: Pick<FeedbackBoard,"slug">) { return workspacePath(project,"/boards/"+encodeURIComponent(board.slug)); }
export function feedbackHref(project: Pick<Project,"slug">, id: string) { return workspacePath(project,"/items/"+encodeURIComponent(id)); }
export function roadmapHref(project:Pick<Project,"slug">){return workspacePath(project,"/roadmap");}
export function changelogHref(project:Pick<Project,"slug">){return workspacePath(project,"/changelog");}

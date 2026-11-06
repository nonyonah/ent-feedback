import { notFound } from "next/navigation";
import { EmbeddedBoard } from "@/components/feedback/embedded-board";
import { PublicWorkspaceBoundary } from "@/components/feedback/public-workspace-boundary";
import { getPublicWorkspace } from "@/server/public-workspace";

export const instant = false;

export default async function Page({ searchParams }: {
  searchParams: Promise<{ project?: string | string[]; board?: string | string[] }>;
}) {
  const query = await searchParams;
  if (typeof query.project !== "string" || !query.project) {
    return <main className="flex min-h-svh items-center justify-center p-6 text-center text-sm text-muted-foreground">A workspace is required to load this widget.</main>;
  }
  const workspace = await getPublicWorkspace(query.project);
  if (!workspace) notFound();
  return <PublicWorkspaceBoundary project={workspace.project} boards={workspace.boards} widget={workspace.widget}>
    <EmbeddedBoard boardSlug={typeof query.board === "string" ? query.board : undefined} />
  </PublicWorkspaceBoundary>;
}

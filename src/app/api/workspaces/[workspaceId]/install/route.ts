import { and, eq } from "drizzle-orm";
import { connection } from "next/server";
import { z } from "zod";
import { requireAppUser } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { boards, workspaces } from "@/server/db/schema";
import { getServerEnv } from "@/server/env";
import { runService, ServiceError, toResponse } from "@/server/result";
import { findActiveWorkspaceMembership } from "@/server/services/access";
import { widgetInstallPrompt } from "@/server/widget-install";

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  await connection();
  const { workspaceId } = await params;
  return toResponse(await runService(async () => {
    const user = await requireAppUser();
    const url = new URL(request.url);
    const boardId = z.uuid().parse(url.searchParams.get("board"));
    const db = getDb();
    if (!await findActiveWorkspaceMembership(db, z.uuid().parse(workspaceId), user.id)) {
      throw new ServiceError("forbidden", "You do not have access to this workspace.");
    }
    const [row] = await db.select({ projectKey: workspaces.handle, board: boards.handle, domain: workspaces.widgetInstalledDomain, loadedAt: workspaces.widgetFirstLoadedAt })
      .from(workspaces).innerJoin(boards, eq(boards.workspaceId, workspaces.id))
      .where(and(eq(workspaces.id, workspaceId), eq(boards.id, boardId))).limit(1);
    if (!row) throw new ServiceError("not_found", "Board not found.");
    return { prompt: widgetInstallPrompt(getServerEnv().NEXT_PUBLIC_APP_URL, row.projectKey, row.board), installed: Boolean(row.loadedAt), domain: row.domain };
  }));
}

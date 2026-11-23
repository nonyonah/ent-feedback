import { buildSampleItems, type BoardTemplateId } from "@/lib/board-templates";
import type { Queryable } from "@/server/db/client";
import { feedback } from "@/server/db/schema";

export async function seedBoardSamples(tx: Queryable, workspaceId: string, boardId: string, boardName: string, template: BoardTemplateId) {
  const items = buildSampleItems(template, boardName);
  await tx.insert(feedback).values(items.map((item, position) => ({
    ...item, workspaceId, boardId, roadmapOrder: position,
  })));
}

"use server";

import {getWorkspaceEntitlements} from "@/server/billing/access";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAppUser } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { boards, workspaces } from "@/server/db/schema";
import { requireWorkspaceRole } from "@/server/services/access";
import { runService, ServiceError } from "@/server/result";

const uuid = z.string().uuid();
const nameSchema = z.string().trim().min(1, "Enter a board name.").max(60);
const markerSchema = z.object({
  name: nameSchema,
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Choose a valid color."),
  emoji: z.string().trim().min(1).max(32).optional(),
});
const selection = {
  id: boards.id, projectId: boards.workspaceId, name: boards.name,
  slug: boards.handle, description: boards.description, color: boards.color,
  emoji: boards.emoji,
};

export async function createBoardAction(workspaceId: string, input: z.input<typeof markerSchema>) {
  return runService(async () => {
    const actor = await requireAppUser();
    const wid = uuid.parse(workspaceId);
    const value = markerSchema.parse(input);
    const db = getDb();
    await requireWorkspaceRole(db, { workspaceId: wid, userId: actor.id, minimumRole: "admin" });
    return db.transaction(async tx => {
      // Serialize board creation and ordering for this workspace, including empty boards.
      const [workspace] = await tx.select({ id: workspaces.id }).from(workspaces)
        .where(eq(workspaces.id, wid)).for("update");
      if (!workspace) throw new ServiceError("not_found", "Workspace not found. Refresh and try again.");
      const current = await tx.select({ handle: boards.handle, position: boards.position }).from(boards)
        .where(eq(boards.workspaceId, wid));
      const entitlement=await getWorkspaceEntitlements(wid);
      if(current.length>=entitlement.boardLimit)throw new ServiceError('forbidden',entitlement.plan==='free'?'Your Free plan includes 2 boards. Start an Essentials trial for up to 5 boards in Settings → Billing.':'Essentials includes up to 5 boards.');
      let base = value.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "board";
      base = base.slice(0, 50).replace(/-$/, "");
      if (base.length < 2) base += "-board";
      const used = new Set(current.map(board => board.handle));
      let handle = base;
      for (let suffix = 2; used.has(handle); suffix++) handle = `${base}-${suffix}`;
      const [created] = await tx.insert(boards).values({
        workspaceId: wid, name: value.name, handle, color: value.color,
        emoji: value.emoji ?? null, description: "Help shape what we build next.",
        position: current.reduce((max, board) => Math.max(max, board.position), -1) + 1,
      }).returning(selection);
      return { ...created, emoji: created.emoji ?? undefined };
    });
  });
}

export async function renameBoardAction(workspaceId: string, boardId: string, name: string) {
  return runService(async () => {
    const actor = await requireAppUser();
    const wid = uuid.parse(workspaceId);
    const bid = uuid.parse(boardId);
    const nextName = nameSchema.parse(name);
    const db = getDb();
    await requireWorkspaceRole(db, { workspaceId: wid, userId: actor.id, minimumRole: "admin" });
    const [updated] = await db.update(boards).set({ name: nextName, updatedAt: new Date() })
      .where(and(eq(boards.workspaceId, wid), eq(boards.id, bid))).returning(selection);
    if (!updated) throw new ServiceError("not_found", "Board not found in this workspace. Refresh and try again.");
    return { ...updated, emoji: updated.emoji ?? undefined };
  });
}

export async function reorderBoardsAction(workspaceId: string, orderedIds: string[]) {
  return runService(async () => {
    const actor = await requireAppUser();
    const wid = uuid.parse(workspaceId);
    const ids = z.array(uuid).min(1).parse(orderedIds);
    if (new Set(ids).size !== ids.length) throw new ServiceError("validation", "Each board must appear once.");
    const db = getDb();
    await requireWorkspaceRole(db, { workspaceId: wid, userId: actor.id, minimumRole: "admin" });
    return db.transaction(async tx => {
      const [workspace] = await tx.select({ id: workspaces.id }).from(workspaces)
        .where(eq(workspaces.id, wid)).for("update");
      if (!workspace) throw new ServiceError("not_found", "Workspace not found. Refresh and try again.");
      const current = await tx.select({ id: boards.id }).from(boards).where(eq(boards.workspaceId, wid));
      const expected = new Set(current.map(board => board.id));
      if (expected.size !== ids.length || ids.some(id => !expected.has(id))) {
        throw new ServiceError("conflict", "The board list has changed. Refresh the page and try again.");
      }
      for (const [position, id] of ids.entries()) {
        await tx.update(boards).set({ position, updatedAt: new Date() })
          .where(and(eq(boards.workspaceId, wid), eq(boards.id, id)));
      }
      return tx.select(selection).from(boards).where(eq(boards.workspaceId, wid))
        .orderBy(asc(boards.position), asc(boards.id));
    });
  });
}

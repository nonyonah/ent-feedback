"use server";

import {getWorkspaceEntitlements} from "@/server/billing/access";
import {billableBoardCount} from "@/server/billing/board-count";
import { and, asc, eq, sql, or } from "drizzle-orm";
import { z } from "zod";
import { requireAppUser } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { boards, workspaces, feedback, comments, attachments } from "@/server/db/schema";
import { requireWorkspaceRole } from "@/server/services/access";
import { runService, ServiceError } from "@/server/result";
import { trackServerAnalytics } from "@/lib/analytics/server";
import { uniqueBoardHandle } from "@/lib/board-slug";
import { boardTemplateIds } from "@/lib/board-templates";
import { seedBoardSamples } from "@/server/services/sample-items";

const uuid = z.string().uuid();
const nameSchema = z.string().trim().min(1, "Enter a board name.").max(60);
const markerSchema = z.object({
  name: nameSchema,
  template: z.enum(boardTemplateIds).default("saas"),
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
    const created=await db.transaction(async tx => {
      // Serialize board creation and ordering for this workspace, including empty boards.
      const [workspace] = await tx.select({ id: workspaces.id }).from(workspaces)
        .where(eq(workspaces.id, wid)).for("update");
      if (!workspace) throw new ServiceError("not_found", "Workspace not found. Refresh and try again.");
      const current = await tx.select({ handle: boards.handle, position: boards.position }).from(boards)
        .where(eq(boards.workspaceId, wid));
      const entitlement=await getWorkspaceEntitlements(wid,tx);
      if(await billableBoardCount(tx,wid)>=entitlement.boardLimit)throw new ServiceError('forbidden',entitlement.plan==='free'?'Your Free plan includes 2 boards. Start an Essentials trial for up to 6 boards in Settings → Billing.':'Essentials includes up to 6 boards.');
      const handle = uniqueBoardHandle(value.name, current.map(board => board.handle));
      const [created] = await tx.insert(boards).values({
        workspaceId: wid, name: value.name, handle, color: value.color,
        emoji: value.emoji ?? null, description: "Help shape what we build next.",
        position: current.reduce((max, board) => Math.max(max, board.position), -1) + 1,
      }).returning(selection);
      await seedBoardSamples(tx, wid, created.id, created.name, value.template);
      return { ...created, emoji: created.emoji ?? undefined };
    });
    trackServerAnalytics('board_created',{},{boardId:created.id,user:actor});
    trackServerAnalytics('template_selected',{type:value.template},{boardId:created.id,user:actor});
    return created;
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

export async function deleteBoardAction(workspaceId:string,boardId:string){
 return runService(async()=>{
  const actor=await requireAppUser();const wid=uuid.parse(workspaceId),bid=uuid.parse(boardId);const db=getDb();
  await requireWorkspaceRole(db,{workspaceId:wid,userId:actor.id,minimumRole:"admin"});
  return db.transaction(async tx=>{
   // Share the creation lock so deleting a board releases its plan slot atomically.
   const [workspace]=await tx.select({id:workspaces.id}).from(workspaces).where(eq(workspaces.id,wid)).for("update");
   if(!workspace)throw new ServiceError("not_found","Workspace not found. Refresh and try again.");
   const [board]=await tx.select({id:boards.id}).from(boards).where(and(eq(boards.workspaceId,wid),eq(boards.id,bid))).for("update");
   if(!board)throw new ServiceError("not_found","Board not found in this workspace. Refresh and try again.");
   const posts=tx.select({id:feedback.id}).from(feedback).where(and(eq(feedback.workspaceId,wid),eq(feedback.boardId,bid)));
   const replies=tx.select({id:comments.id}).from(comments).where(and(eq(comments.workspaceId,wid),sql`${comments.feedbackId} in (${posts})`));
   // Retain object keys for the existing retryable storage cleanup worker.
   await tx.update(attachments).set({feedbackId:null,commentId:null,status:'pending',attachedAt:null,expiresAt:new Date(Date.now()-1000),updatedAt:new Date()}).where(and(eq(attachments.workspaceId,wid),or(sql`${attachments.feedbackId} in (${posts})`,sql`${attachments.commentId} in (${replies})`)));
   await tx.update(feedback).set({mergedIntoId:null}).where(and(eq(feedback.workspaceId,wid),sql`${feedback.mergedIntoId} in (${posts})`));
   await tx.delete(boards).where(and(eq(boards.workspaceId,wid),eq(boards.id,bid)));
   return {deletedId:bid,boards:await tx.select(selection).from(boards).where(eq(boards.workspaceId,wid)).orderBy(asc(boards.position),asc(boards.id))};
  });
 });
}

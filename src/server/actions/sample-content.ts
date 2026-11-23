"use server";

import {and, eq, isNull, ne, or} from "drizzle-orm";
import {z} from "zod";
import {trackServerAnalytics} from "@/lib/analytics/server";
import {requireAppUser} from "@/server/auth";
import {getDb} from "@/server/db/client";
import {feedback} from "@/server/db/schema";
import {runService, ServiceError} from "@/server/result";
import {requireWorkspaceRole} from "@/server/services/access";

async function ownerSamples(workspaceId: string, boardId: string) {
  z.uuid().parse(workspaceId);
  z.uuid().parse(boardId);
  const user = await requireAppUser();
  const db = getDb();
  await requireWorkspaceRole(db, {workspaceId, userId: user.id, minimumRole: "owner"});
  const scope = and(eq(feedback.workspaceId, workspaceId), eq(feedback.boardId, boardId),
    eq(feedback.isSample, true), isNull(feedback.deletedAt));
  return {db, scope, user};
}

export async function sampleBoardIdsAction(workspaceId: string) {
  return runService(async () => {
    z.uuid().parse(workspaceId);
    const user = await requireAppUser();
    const db = getDb();
    await requireWorkspaceRole(db, {workspaceId, userId: user.id, minimumRole: "owner"});
    const rows = await db.selectDistinct({id: feedback.boardId}).from(feedback)
      .where(and(eq(feedback.workspaceId, workspaceId), eq(feedback.isSample, true), isNull(feedback.deletedAt)));
    return rows.map(row => row.id);
  });
}

export async function clearSampleContentAction(workspaceId: string, boardId: string) {
  return runService(async () => {
    const {db, scope, user} = await ownerSamples(workspaceId, boardId);
    const now = new Date();
    const removed = await db.update(feedback).set({deletedAt: now, updatedAt: now})
      .where(scope).returning({id: feedback.id});
    if (removed.length) trackServerAnalytics("sample_content_cleared", {}, {boardId, user});
    return removed.length;
  });
}

export async function editSampleContentAction(workspaceId: string, boardId: string, id: string, input: {title: string; description: string}) {
  return runService(async () => {
    const {db, scope} = await ownerSamples(workspaceId, boardId);
    const {title, description} = z.object({title: z.string().trim().min(4).max(160),
      description: z.string().trim().min(1).max(3000)}).parse(input);
    const [updated] = await db.update(feedback)
      .set({title, body: description, isSample: false, startingVotes: 0, updatedAt: new Date()})
      .where(and(scope, eq(feedback.id, z.uuid().parse(id)), or(ne(feedback.title, title), ne(feedback.body, description))))
      .returning({id: feedback.id});
    if (!updated) throw new ServiceError("conflict", "This sample has changed or there are no changes to save.");
    return updated.id;
  });
}

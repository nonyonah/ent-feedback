"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { trackServerAnalytics } from "@/lib/analytics/server";
import { uniqueBoardHandle } from "@/lib/board-slug";
import { requireAppUser } from "@/server/auth";
import { getWorkspaceEntitlements } from "@/server/billing/access";
import { billableBoardCount } from "@/server/billing/board-count";
import { getDb } from "@/server/db/client";
import { boards, workspaces } from "@/server/db/schema";
import { runService, ServiceError } from "@/server/result";
import { requireWorkspaceRole } from "@/server/services/access";

const options = z.object({
  name: z.string().trim().min(1, "Enter a board name.").max(60),
  copyItems: z.boolean(),
  copyEngagement: z.boolean(),
}).refine(value => !value.copyEngagement || value.copyItems, "Choose Copy items first.");

export async function duplicateBoardAction(workspaceId: string, boardId: string, input: z.input<typeof options>) {
  return runService(async () => {
    const actor = await requireAppUser();
    const wid = z.string().uuid().parse(workspaceId);
    const bid = z.string().uuid().parse(boardId);
    const value = options.parse(input);
    const board = await getDb().transaction(async tx => {
      await requireWorkspaceRole(tx, {workspaceId: wid, userId: actor.id, minimumRole: "admin"});
      await tx.select({id: workspaces.id}).from(workspaces).where(eq(workspaces.id, wid)).for("update");
      const [source] = await tx.select({description: boards.description, color: boards.color, emoji: boards.emoji})
        .from(boards).where(and(eq(boards.workspaceId, wid), eq(boards.id, bid)));
      if (!source) throw new ServiceError("not_found", "Board not found in this workspace.");
      const current = await tx.select({handle: boards.handle, position: boards.position})
        .from(boards).where(eq(boards.workspaceId, wid));
      const {boardLimit} = await getWorkspaceEntitlements(wid, tx);
      if (await billableBoardCount(tx, wid) >= boardLimit) throw new ServiceError("forbidden", `Your plan includes up to ${boardLimit} boards.`);
      const handle = uniqueBoardHandle(value.name, current.map(item => item.handle));
      const [created] = await tx.insert(boards).values({
        ...source, workspaceId: wid, name: value.name, handle,
        position: current.reduce((max, item) => Math.max(max, item.position), -1) + 1,
      }).returning({id: boards.id, projectId: boards.workspaceId, slug: boards.handle,
        name: boards.name, description: boards.description, color: boards.color, emoji: boards.emoji});
      await tx.execute(sql`insert into widget_settings
        (workspace_id, board_id, enabled, details, collect_email, collect_name, greeting, reply_time, submit_notice)
        select workspace_id, ${created.id}, enabled, details, collect_email, collect_name, greeting, reply_time, submit_notice
        from widget_settings where workspace_id = ${wid} and board_id = ${bid}`);
      if (value.copyItems) {
        await tx.execute(sql`with items as materialized (
          select f.id as old_id, gen_random_uuid() as new_id, f.title, f.body, f.category, f.status,
            f.roadmap_visible, f.roadmap_order, f.public_note, false as is_sample,
            case when ${value.copyEngagement} then f.starting_votes +
              (select count(*)::int from votes v where v.workspace_id = f.workspace_id and v.feedback_id = f.id)
              else 0 end as starting_votes
          from feedback f where f.workspace_id = ${wid} and f.board_id = ${bid}
            and f.deleted_at is null and f.merged_into_id is null
        ), inserted as (
          insert into feedback (id, workspace_id, board_id, title, body, category, status,
            roadmap_visible, roadmap_order, public_note, is_sample, starting_votes)
          select new_id, ${wid}, ${created.id}, title, body, category, status,
            roadmap_visible, roadmap_order, public_note, is_sample, starting_votes from items
          returning id
        ), replies as materialized (
          select gen_random_uuid() as new_id, c.id as old_id, c.parent_comment_id, i.new_id as feedback_id, c.body
          from comments c join items i on i.old_id = c.feedback_id join inserted p on p.id = i.new_id
          where ${value.copyEngagement} and c.workspace_id = ${wid} and c.deleted_at is null
        )
        insert into comments (id, workspace_id, feedback_id, parent_comment_id, body)
        select r.new_id, ${wid}, r.feedback_id, parent.new_id, r.body from replies r
        left join replies parent on parent.old_id = r.parent_comment_id`);
      }
      return {...created, emoji: created.emoji ?? undefined};
    });
    trackServerAnalytics("board_duplicated", {}, {boardId: board.id, user: actor});
    return board;
  });
}

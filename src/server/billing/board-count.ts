import 'server-only';
import {and,count,eq,isNotNull} from 'drizzle-orm';
import type {Queryable} from '@/server/db/client';
import {boards,previewClaims} from '@/server/db/schema';

export async function boardUsage(db:Queryable,workspaceId:string){
  const [row]=await db.select({total:count(),exempt:count(previewClaims.boardId)}).from(boards)
    .leftJoin(previewClaims,and(eq(previewClaims.boardId,boards.id),isNotNull(previewClaims.claimedAt)))
    .where(eq(boards.workspaceId,workspaceId));
  return {total:row.total,billable:row.total-row.exempt};
}

export async function billableBoardCount(db:Queryable,workspaceId:string){
  return (await boardUsage(db,workspaceId)).billable;
}

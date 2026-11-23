import 'server-only';
import {and,desc,eq,isNotNull} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {changelogEntries} from '@/server/db/schema';
import {toChangelogEntry,type ChangelogEntry} from '@/lib/changelog';
import {requireAppUser} from '@/server/auth';
import {requireWorkspaceRole} from '@/server/services/access';

export const changelogSelection = {
  id: changelogEntries.id,
  title: changelogEntries.title,
  body: changelogEntries.body,
  publishedAt: changelogEntries.publishedAt,
  createdAt: changelogEntries.createdAt,
  updatedAt: changelogEntries.updatedAt,
};

/** Public read: only entries that are live and tenant-scoped to the workspace. */
export async function readPublishedChangelog(workspaceId:string):Promise<ChangelogEntry[]>{
  const wid=z.uuid().parse(workspaceId);
  const rows=await getDb().select(changelogSelection).from(changelogEntries)
    .where(and(eq(changelogEntries.workspaceId,wid),isNotNull(changelogEntries.publishedAt)))
    .orderBy(desc(changelogEntries.publishedAt),desc(changelogEntries.createdAt));
  return rows.map(toChangelogEntry);
}

export async function listChangelogEntries(workspaceId:string):Promise<ChangelogEntry[]>{
  const wid=z.uuid().parse(workspaceId);
  const actor=await requireAppUser();
  await requireWorkspaceRole(getDb(),{workspaceId:wid,userId:actor.id,minimumRole:'member'});
  const rows=await getDb().select(changelogSelection).from(changelogEntries)
    .where(eq(changelogEntries.workspaceId,wid))
    .orderBy(desc(changelogEntries.publishedAt),desc(changelogEntries.createdAt));
  return rows.map(toChangelogEntry);
}

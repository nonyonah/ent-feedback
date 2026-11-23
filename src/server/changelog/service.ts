import 'server-only';
import {and,asc,desc,eq,inArray,isNotNull,lte,sql} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {changelogEntries,changelogFeedback,feedback,users} from '@/server/db/schema';
import {displayedVotes} from '@/server/services/displayed-votes';
import {toChangelogEntry,type ChangelogEntry,type ChangelogEntryRow,type ChangelogFeedbackLink} from '@/lib/changelog';
import {requireAppUser} from '@/server/auth';
import {requireWorkspaceRole} from '@/server/services/access';

export const changelogSelection = {
  id: changelogEntries.id,
  slug: changelogEntries.slug,
  title: changelogEntries.title,
  summary: changelogEntries.summary,
  coverImage: changelogEntries.coverImage,
  body: changelogEntries.body,
  category: changelogEntries.category,
  status: changelogEntries.status,
  authorName: users.name,
  authorAvatarUrl: users.avatarUrl,
  publishedAt: changelogEntries.publishedAt,
  scheduledFor: changelogEntries.scheduledFor,
  createdAt: changelogEntries.createdAt,
  updatedAt: changelogEntries.updatedAt,
};

const withAuthor = () => getDb().select(changelogSelection).from(changelogEntries)
  .leftJoin(users, eq(users.id, changelogEntries.authorUserId));

type SelectionRow = Omit<ChangelogEntryRow, 'feedback'>;

async function attachLinks(workspaceId: string, rows: SelectionRow[]): Promise<ChangelogEntry[]> {
  if (!rows.length) return [];
  const linked = await getDb().select({
    changelogId: changelogFeedback.changelogId,
    id: feedback.id,
    title: feedback.title,
    status: feedback.status,
    votes: displayedVotes,
  }).from(changelogFeedback)
    .innerJoin(feedback, and(eq(feedback.id, changelogFeedback.feedbackId), eq(feedback.workspaceId, changelogFeedback.workspaceId)))
    .where(and(eq(changelogFeedback.workspaceId, workspaceId), inArray(changelogFeedback.changelogId, rows.map(row => row.id))))
    .orderBy(asc(feedback.title));

  const byEntry = new Map<string, ChangelogFeedbackLink[]>();
  for (const link of linked) {
    const list = byEntry.get(link.changelogId) ?? [];
    list.push({id: link.id, title: link.title, status: link.status, votes: Number(link.votes)});
    byEntry.set(link.changelogId, list);
  }
  return rows.map(row => toChangelogEntry({...row, feedback: byEntry.get(row.id) ?? []}));
}

/** Public read: only entries that are live and tenant-scoped to the workspace. */
export async function readPublishedChangelog(workspaceId: string): Promise<ChangelogEntry[]> {
  const wid = z.uuid().parse(workspaceId);
  const rows = await withAuthor()
    .where(and(eq(changelogEntries.workspaceId, wid), eq(changelogEntries.status, 'published'), isNotNull(changelogEntries.publishedAt), lte(changelogEntries.publishedAt, new Date())))
    .orderBy(desc(changelogEntries.publishedAt), desc(changelogEntries.createdAt));
  return attachLinks(wid, rows);
}

export async function readPublishedChangelogEntry(workspaceId: string, slug: string): Promise<ChangelogEntry | null> {
  const wid = z.uuid().parse(workspaceId);
  const rows = await withAuthor()
    .where(and(eq(changelogEntries.workspaceId, wid), eq(changelogEntries.slug, slug), eq(changelogEntries.status, 'published'), isNotNull(changelogEntries.publishedAt), lte(changelogEntries.publishedAt, new Date())))
    .limit(1);
  const [entry] = await attachLinks(wid, rows);
  return entry ?? null;
}

/** Published entries that reference a feedback request, newest first. */
export async function readChangelogForFeedback(workspaceId: string, feedbackId: string): Promise<{slug: string; title: string; publishedAt: string}[]> {
  const rows = await getDb().select({slug: changelogEntries.slug, title: changelogEntries.title, publishedAt: changelogEntries.publishedAt})
    .from(changelogFeedback)
    .innerJoin(changelogEntries, and(eq(changelogEntries.id, changelogFeedback.changelogId), eq(changelogEntries.workspaceId, changelogFeedback.workspaceId)))
    .where(and(eq(changelogFeedback.workspaceId, z.uuid().parse(workspaceId)), eq(changelogFeedback.feedbackId, z.uuid().parse(feedbackId)), eq(changelogEntries.status, 'published'), isNotNull(changelogEntries.publishedAt), lte(changelogEntries.publishedAt, new Date())))
    .orderBy(desc(changelogEntries.publishedAt));
  return rows.flatMap(row => row.publishedAt ? [{slug: row.slug, title: row.title, publishedAt: row.publishedAt.toISOString()}] : []);
}

export async function listChangelogEntries(workspaceId: string): Promise<ChangelogEntry[]> {
  const wid = z.uuid().parse(workspaceId);
  const actor = await requireAppUser();
  await requireWorkspaceRole(getDb(), {workspaceId: wid, userId: actor.id, minimumRole: 'member'});
  const rows = await withAuthor()
    .where(eq(changelogEntries.workspaceId, wid))
    .orderBy(desc(changelogEntries.publishedAt), desc(changelogEntries.createdAt));
  return attachLinks(wid, rows);
}

/** One entry for the write actions, joined the same way so the client gets a consistent shape. */
export async function readChangelogEntry(workspaceId: string, entryId: string): Promise<ChangelogEntry> {
  const wid = z.uuid().parse(workspaceId);
  const rows = await withAuthor()
    .where(and(eq(changelogEntries.workspaceId, wid), eq(changelogEntries.id, z.uuid().parse(entryId))))
    .limit(1);
  const [entry] = await attachLinks(wid, rows);
  if (!entry) throw new Error('Changelog entry not found.');
  return entry;
}

export async function changelogSlugTaken(workspaceId: string, slug: string, exceptId?: string): Promise<boolean> {
  const [row] = await getDb().select({id: changelogEntries.id}).from(changelogEntries)
    .where(and(eq(changelogEntries.workspaceId, workspaceId), eq(changelogEntries.slug, slug), exceptId ? sql`${changelogEntries.id} <> ${exceptId}` : undefined))
    .limit(1);
  return Boolean(row);
}

/** Called by the maintenance worker: scheduled entries go live once their time arrives. */
export async function publishDueChangelogEntries(limit = 20): Promise<number> {
  const due = await getDb().select({id: changelogEntries.id, workspaceId: changelogEntries.workspaceId, scheduledFor: changelogEntries.scheduledFor})
    .from(changelogEntries)
    .where(and(eq(changelogEntries.status, 'scheduled'), isNotNull(changelogEntries.scheduledFor), lte(changelogEntries.scheduledFor, new Date())))
    .orderBy(asc(changelogEntries.scheduledFor))
    .limit(Math.max(1, Math.min(limit, 100)));
  if (!due.length) return 0;
  let published = 0;
  for (const entry of due) {
    const [updated] = await getDb().update(changelogEntries).set({status: 'published', publishedAt: entry.scheduledFor, updatedAt: new Date()})
      .where(and(eq(changelogEntries.id, entry.id), eq(changelogEntries.status, 'scheduled')))
      .returning({id: changelogEntries.id});
    if (updated) published += 1;
  }
  return published;
}

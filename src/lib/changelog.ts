import {z} from 'zod';

export const changelogTitleMaxLength = 120;
export const changelogSummaryMaxLength = 300;
export const changelogBodyMaxLength = 20000;
export const changelogSlugMaxLength = 80;

export const changelogCategories = ['new-feature', 'improvement', 'bug-fix', 'performance', 'documentation', 'announcement'] as const;
export type ChangelogCategory = typeof changelogCategories[number];
export const changelogCategoryLabels: Record<ChangelogCategory, string> = {
  'new-feature': 'New feature',
  improvement: 'Improvement',
  'bug-fix': 'Bug fix',
  performance: 'Performance',
  documentation: 'Documentation',
  announcement: 'Announcement',
};

export const changelogStatuses = ['draft', 'scheduled', 'published'] as const;
export type ChangelogStatus = typeof changelogStatuses[number];
export const changelogStatusLabels: Record<ChangelogStatus, string> = {draft: 'Draft', scheduled: 'Scheduled', published: 'Published'};

export function slugifyChangelogTitle(title: string): string {
  const slug = title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, changelogSlugMaxLength).replace(/-+$/g, '');
  return slug || 'update';
}

export const changelogSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const changelogInputSchema = z.object({
  title: z.string().trim().min(1, 'Add a title.').max(changelogTitleMaxLength, `Keep the title under ${changelogTitleMaxLength} characters.`),
  slug: z.string().trim().max(changelogSlugMaxLength).optional(),
  coverImage: z.string().regex(/^\/api\/changelog\/images\/[0-9a-f-]{36}$/).nullable().optional(),
  summary: z.string().trim().max(changelogSummaryMaxLength, `Keep the summary under ${changelogSummaryMaxLength} characters.`).optional(),
  body: z.string().trim().min(1, 'Add some details.').max(changelogBodyMaxLength, `Keep the entry under ${changelogBodyMaxLength} characters.`),
  category: z.enum(changelogCategories).default('new-feature'),
  feedbackIds: z.array(z.string().uuid()).max(20).default([]),
});
export type ChangelogInput = z.input<typeof changelogInputSchema>;

export const changelogPublishSchema = z.object({
  at: z.string().datetime().nullable().optional(),
});
export type ChangelogPublishInput = z.input<typeof changelogPublishSchema>;

export type ChangelogFeedbackLink = {id: string; title: string; status: 'open' | 'planned' | 'in-progress' | 'shipped'; votes: number};

export type ChangelogEntry = {
  id: string;
  slug: string;
  title: string;
  coverImage?: string | null;
  summary: string | null;
  body: string;
  category: ChangelogCategory;
  status: ChangelogStatus;
  author: {name: string; avatarUrl: string | null} | null;
  feedback: ChangelogFeedbackLink[];
  publishedAt: string | null;
  scheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChangelogEntryRow = {
  id: string;
  slug: string;
  title: string;
  coverImage?: string | null;
  summary: string | null;
  body: string;
  category: ChangelogCategory;
  status: ChangelogStatus;
  authorName: string | null;
  authorAvatarUrl: string | null;
  feedback?: ChangelogFeedbackLink[];
  publishedAt: Date | null;
  scheduledFor: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toChangelogEntry(row: ChangelogEntryRow): ChangelogEntry {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    coverImage: row.coverImage??null,
    body: row.body,
    category: row.category,
    status: row.status,
    author: row.authorName ? {name: row.authorName, avatarUrl: row.authorAvatarUrl} : null,
    feedback: row.feedback ?? [],
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    scheduledFor: row.scheduledFor ? row.scheduledFor.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Plain-text bodies render as paragraphs; blank lines separate them and lines within one wrap. */
export function changelogParagraphs(body: string): string[] {
  return body.split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean);
}

export function formatChangelogDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'}).format(new Date(value));
}

export function changelogMonthKey(value: string): string {
  const date = new Date(value);
  return date.getUTCFullYear() + '-' + String(date.getUTCMonth() + 1).padStart(2, '0');
}

export function changelogMonthLabel(value: string): string {
  return new Intl.DateTimeFormat('en-US', {month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(value));
}

export function changelogDayLabel(value: string): string {
  return new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'}).format(new Date(value));
}

export type ChangelogMonth = {key: string; label: string; entries: ChangelogEntry[]};

/** Newest first, grouped by the month each entry was published in. */
export function groupChangelogByMonth(entries: ChangelogEntry[]): ChangelogMonth[] {
  const months: ChangelogMonth[] = [];
  for (const entry of entries) {
    if (!entry.publishedAt) continue;
    const key = changelogMonthKey(entry.publishedAt);
    const current = months.at(-1);
    if (current?.key === key) current.entries.push(entry);
    else months.push({key, label: changelogMonthLabel(entry.publishedAt), entries: [entry]});
  }
  return months;
}

export function changelogEntryVisibleAt(entry: Pick<ChangelogEntry, 'status' | 'publishedAt'>, now = new Date()): boolean {
  return entry.status === 'published' && Boolean(entry.publishedAt) && new Date(entry.publishedAt!) <= now;
}

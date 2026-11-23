import {z} from 'zod';

export const changelogTitleMaxLength = 120;
export const changelogBodyMaxLength = 5000;

export const changelogInputSchema = z.object({
  title: z.string().trim().min(1, 'Add a title.').max(changelogTitleMaxLength, `Keep the title under ${changelogTitleMaxLength} characters.`),
  body: z.string().trim().min(1, 'Add some details.').max(changelogBodyMaxLength, `Keep the entry under ${changelogBodyMaxLength} characters.`),
});
export type ChangelogInput = z.input<typeof changelogInputSchema>;

export type ChangelogEntry = {
  id: string;
  title: string;
  body: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChangelogEntryRow = {
  id: string;
  title: string;
  body: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toChangelogEntry(row: ChangelogEntryRow): ChangelogEntry {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
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

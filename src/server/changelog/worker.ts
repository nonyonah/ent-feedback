import 'server-only';
import {publishDueChangelogEntries} from '@/server/changelog/service';

/** Scheduled entries go public here; the cron bridge calls this on every tick. */
export async function processChangelogJobs(limit = 20): Promise<{published: number}> {
  const published = await publishDueChangelogEntries(limit);
  return {published};
}

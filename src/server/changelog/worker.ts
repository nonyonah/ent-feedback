import 'server-only';
import {publishDueChangelogEntries} from '@/server/changelog/service';
import {processShippedChangelogJob} from '@/server/changelog/ai-jobs';

/** Scheduled entries go public here; the cron bridge calls this on every tick. */
export async function processChangelogJobs(limit = 20) {
  const published = await publishDueChangelogEntries(limit);
  const ai=await processShippedChangelogJob();
  return {published,ai};
}

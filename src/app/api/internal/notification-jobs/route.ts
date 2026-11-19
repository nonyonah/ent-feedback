import {processIntegrationJobs} from '@/server/connected-apps/worker';
import {processRoadmapJobs} from '@/server/roadmap/emails';
import {cleanChatUploads} from '@/server/chat/uploads';
import {processChatJobs} from '@/server/chat/notifications';
import { timingSafeEqual } from "node:crypto";
import { processNotificationJobs } from "@/server/notification-worker";

import {enqueueLifecycleEmails,processLifecycleEmails} from "@/server/lifecycle-email-worker";
import {cleanExpiredAttachments} from "@/server/attachment-cleanup";
import {processTrialEmails,enqueuePrepaidReminders} from '@/server/billing/trial-emails';

export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const expected = secret && secret.length >= 32 ? Buffer.from(`Bearer ${secret}`) : null;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (!expected || expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers:{"Cache-Control":"no-store"} });
  }
  try {
    const started=Date.now();
    const lifecycleQueue=await enqueueLifecycleEmails(3);
    const prepaidQueue=await enqueuePrepaidReminders(3);
    const notifications=await processNotificationJobs(1);
    const chat=await processChatJobs(1);
    const lifecycle=await processLifecycleEmails(1);
    // A trial job may make two 15s provider calls. Leave room for cleanup on
    // the host's 60s request budget; deferred jobs stay pending for the next tick.
    const trial=Date.now()-started<20_000?await processTrialEmails(1):{configured:notifications.configured,skipped:true};
    const integrations=Date.now()-started<25_000?await processIntegrationJobs(1):{skipped:true};
    const roadmap=Date.now()-started<35_000?await processRoadmapJobs(1):{configured:notifications.configured,skipped:true};
    // Expired uploads and spent rate-limit windows are only reclaimed here.
    const cleanup=await cleanExpiredAttachments(3);if(Date.now()-started<45000)await cleanChatUploads();
    const ready=notifications.configured&&(!lifecycleQueue.enabled||lifecycle.configured);
    return Response.json({integrations,roadmap,chat,notifications,prepaidQueue,lifecycleQueue,lifecycle,trial,cleanup},{status:ready&&trial.configured?200:503,headers:{"Cache-Control":"no-store"}});
  } catch {
    return Response.json({error:"Notification maintenance could not complete."},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}

// Vercel Cron calls GET; the Cloudflare bridge/maintenance clients use POST.
// Both paths require the same bearer secret and never return cacheable results.
export async function GET(request:Request){return POST(request);}

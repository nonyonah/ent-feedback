import { timingSafeEqual } from "node:crypto";
import { processNotificationJobs } from "@/server/notification-worker";

import {enqueueLifecycleEmails,processLifecycleEmails} from "@/server/lifecycle-email-worker";
import {cleanExpiredAttachments} from "@/server/attachment-cleanup";
import {processTrialEmails} from '@/server/billing/trial-emails';

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
    const notifications=await processNotificationJobs(1);
    const lifecycle=await processLifecycleEmails(1);
    // A trial job may make two 15s provider calls. Leave room for cleanup on
    // the host's 60s request budget; deferred jobs stay pending for the next tick.
    const trial=Date.now()-started<20_000?await processTrialEmails(1):{configured:notifications.configured,skipped:true};
    // Expired uploads and spent rate-limit windows are only reclaimed here.
    const cleanup=await cleanExpiredAttachments(3);
    const ready=notifications.configured&&(!lifecycleQueue.enabled||lifecycle.configured);
    return Response.json({notifications,lifecycleQueue,lifecycle,trial,cleanup},{status:ready&&trial.configured?200:503,headers:{"Cache-Control":"no-store"}});
  } catch {
    return Response.json({error:"Notification maintenance could not complete."},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}

// Vercel Cron calls GET; the Cloudflare bridge/maintenance clients use POST.
// Both paths require the same bearer secret and never return cacheable results.
export async function GET(request:Request){return POST(request);}

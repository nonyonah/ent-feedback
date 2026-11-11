import { timingSafeEqual } from "node:crypto";
import { processNotificationJobs } from "@/server/notification-worker";

import {enqueueLifecycleEmails,processLifecycleEmails} from "@/server/lifecycle-email-worker";

export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const expected = secret && secret.length >= 32 ? Buffer.from(`Bearer ${secret}`) : null;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (!expected || expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const lifecycleQueue=await enqueueLifecycleEmails(3);
    const notifications=await processNotificationJobs(1);
    const lifecycle=await processLifecycleEmails(1);
    const ready=notifications.configured&&(!lifecycleQueue.enabled||lifecycle.configured);
    return Response.json({notifications,lifecycleQueue,lifecycle},{status:ready?200:503,headers:{"Cache-Control":"no-store"}});
  } catch {
    return Response.json({error:"Notification maintenance could not complete."},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}

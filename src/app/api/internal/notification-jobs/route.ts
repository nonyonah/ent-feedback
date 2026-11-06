import { timingSafeEqual } from "node:crypto";
import { processNotificationJobs } from "@/server/notification-worker";

export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const expected = secret && secret.length >= 32 ? Buffer.from(`Bearer ${secret}`) : null;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (!expected || expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json(await processNotificationJobs(1), { headers: { "Cache-Control": "no-store" } });
}

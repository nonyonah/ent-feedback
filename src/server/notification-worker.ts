import "server-only";
import {guestEmailVerified} from "@/server/guest-email";

import { and, asc, eq, isNull, lt, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { comments, feedback, follows, jobs, notifications, notificationPreferences, users } from "@/server/db/schema";
import { getServerEnv } from "@/server/env";
import { wantsActivity } from "@/server/activity";
import { sendActivityEmail } from "@/server/email";

const payloadSchema = z.object({
  notificationId: z.uuid(), to: z.email(), subject: z.string().min(1),
  title: z.string(), url: z.url(),
});

// A short batch keeps the route within host execution limits. Never hold a DB
// transaction open while waiting for the email provider.
export async function processNotificationJobs(limit = 3, destination?:{workspaceId:string;feedbackId:string}) {
  const env = getServerEnv();
  if (!env.SENDBYTE_API_KEY || !env.EMAIL_FROM) {
    return { configured: false, succeeded: 0, retried: 0, failed: 0 };
  }
  const db = getDb();
  const now = new Date();
  const claimed = await db.transaction(async (tx) => {
    const expired = and(eq(jobs.type, "notification_email"), eq(jobs.status, "running"), lt(jobs.lockedAt, new Date(now.getTime() - 10 * 60_000)));
    await tx.update(jobs).set({ status: "failed", lockedAt: null, lastError: "Worker lease expired after final attempt", updatedAt: now }).where(and(expired, sql`${jobs.attempts} >= ${jobs.maxAttempts}`));
    await tx.update(jobs).set({ status: "pending", lockedAt: null, updatedAt: now }).where(and(expired, sql`${jobs.attempts} < ${jobs.maxAttempts}`));
    const rows = await tx.select().from(jobs).where(and(eq(jobs.type, "notification_email"), eq(jobs.status, "pending"), lte(jobs.runAt, now), destination?sql`((${jobs.payload}->>'notificationId') in (select ${notifications.id}::text from ${notifications} where ${notifications.workspaceId}=${destination.workspaceId} and ${notifications.feedbackId}=${destination.feedbackId}) or (${jobs.payload}->>'guestFeedbackId'=${destination.feedbackId} and ${jobs.payload}->>'workspaceId'=${destination.workspaceId}))`:undefined, sql`${jobs.attempts} < ${jobs.maxAttempts}`)).orderBy(asc(jobs.runAt), asc(jobs.id)).limit(Math.min(3, Math.max(1, limit))).for("update", { skipLocked: true });
    const result: (typeof jobs.$inferSelect)[] = [];
    for (const row of rows) {
      const [locked] = await tx.update(jobs).set({ status: "running", attempts: row.attempts + 1, lockedAt: now, updatedAt: now }).where(eq(jobs.id, row.id)).returning();
      result.push(locked);
    }
    return result;
  });
  const result = { configured: true, succeeded: 0, retried: 0, failed: 0 };
  for (const job of claimed) {
    // Attempt + lease fencing prevents an expired worker overwriting a new claim.
    const ownLease = and(eq(jobs.id, job.id), eq(jobs.status, "running"), eq(jobs.attempts, job.attempts), eq(jobs.lockedAt, now));
    try {
      if('guestFeedbackId' in job.payload){
        const guest=z.object({guestFeedbackId:z.uuid(),event:z.enum(['feedback_comment','status_changed','type_changed']).default('feedback_comment'),commentId:z.uuid().optional(),workspaceId:z.uuid(),to:z.email(),subject:z.string(),title:z.string(),url:z.url()}).parse(job.payload);
        const [target]=await db.select({email:feedback.guestEmail,author:feedback.authorUserId}).from(feedback).where(and(eq(feedback.id,guest.guestFeedbackId),eq(feedback.workspaceId,guest.workspaceId),isNull(feedback.deletedAt))).limit(1);
        let permitted=Boolean(target&&!target.author&&target.email===guest.to);
        if(permitted&&guest.event==='feedback_comment'){
          const [reply]=guest.commentId?await db.select({author:comments.authorUserId}).from(comments).where(and(eq(comments.id,guest.commentId),eq(comments.feedbackId,guest.guestFeedbackId),eq(comments.workspaceId,guest.workspaceId),isNull(comments.deletedAt))).limit(1):[];
          permitted=Boolean(reply?.author);
        }
        if(permitted)permitted=await guestEmailVerified({workspaceId:guest.workspaceId,kind:'feedback',subjectId:guest.guestFeedbackId,email:guest.to});
        if(permitted)await sendActivityEmail({...guest,key:job.dedupeKey??job.id});
        await db.update(jobs).set({status:'succeeded',lockedAt:null,lastError:null,updatedAt:new Date()}).where(ownLease);result.succeeded++;continue;
      }
      const parsed = payloadSchema.safeParse(job.payload);
      if (!parsed.success) {
        await db.update(jobs).set({ status: "failed", lockedAt: null, lastError: "Invalid email job payload", updatedAt: new Date() }).where(ownLease);
        result.failed++;
        continue;
      }
      const payload = parsed.data;
      const [notice] = await db.select({ recipient: notifications.recipientUserId, event: notifications.eventType, postId: feedback.id, author:feedback.authorUserId, email: users.email, preferences: notificationPreferences }).from(notifications)
        .innerJoin(feedback, and(eq(feedback.id, notifications.feedbackId), eq(feedback.workspaceId, notifications.workspaceId), isNull(feedback.deletedAt)))
        .innerJoin(users, eq(users.id, notifications.recipientUserId))
        .leftJoin(notificationPreferences, eq(notificationPreferences.userId, users.id))
        .where(eq(notifications.id, payload.notificationId)).limit(1);
      let permitted = Boolean(notice && notice.email === payload.to && wantsActivity(notice.preferences ?? undefined, notice.event));
      if (permitted && (notice.event === "status_changed"||notice.event === "type_changed")&&notice.author!==notice.recipient) {
        const [follow] = await db.select({ id: follows.id }).from(follows).where(and(eq(follows.feedbackId, notice.postId), eq(follows.userId, notice.recipient))).limit(1);
        permitted = Boolean(follow);
      }
      if (permitted) await sendActivityEmail({ ...payload, key: "notification:" + payload.notificationId });
      await db.update(jobs).set({ status: "succeeded", lockedAt: null, lastError: null, updatedAt: new Date() }).where(ownLease);
      result.succeeded++;
    } catch {
      const exhausted = job.attempts >= job.maxAttempts;
      await db.update(jobs).set({ status: exhausted ? "failed" : "pending", lockedAt: null, lastError: "Email delivery not confirmed", runAt: new Date(Date.now() + Math.min(3600, 30 * 2 ** (job.attempts - 1)) * 1000), updatedAt: new Date() }).where(ownLease);
      result[exhausted ? "failed" : "retried"]++;
    }
  }
  return result;
}

import "server-only";
import { and, asc, eq, lt } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { attachments, rateLimits } from "@/server/db/schema";
import { deleteImage } from "@/server/storage";
import { getServerEnv } from "@/server/env";

export async function cleanExpiredAttachments(limit = 10) {
  const db = getDb();
  await db.delete(rateLimits).where(lt(rateLimits.expiresAt, new Date(Date.now() - 86_400_000)));
  const env = getServerEnv();
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET) return { configured: false, deleted: 0, failed: 0 };
  const counts = { configured: true, deleted: 0, failed: 0 };
  // Claim one expired row at a time. Linking the same row waits on this lock and
  // then rejects the missing record, so an upload cannot be attached as it expires.
  // The storage delete runs outside the transaction: holding a pooled
  // connection across a network call can exhaust the pool.
  for (let i = 0; i < Math.min(10, Math.max(1, limit)); i++) {
    const claimed = await db.transaction(async tx => {
      const [row] = await tx.select().from(attachments).where(and(eq(attachments.status, "pending"), lt(attachments.expiresAt, new Date())))
        .orderBy(asc(attachments.expiresAt), asc(attachments.id)).limit(1).for("update", { skipLocked: true });
      if (!row) return null;
      // Mark the row as expired while the lock is held so a concurrent link
      // cannot attach it, then delete the object and the row outside the lock.
      await tx.update(attachments).set({ status: "expired", updatedAt: new Date() }).where(eq(attachments.id, row.id));
      return { id: row.id, storageKey: row.storageKey };
    });
    if (!claimed) break;
    try {
      await deleteImage(claimed.storageKey);
      await db.delete(attachments).where(eq(attachments.id, claimed.id));
      counts.deleted++;
    } catch {
      // Keep the row for the next cleanup run; never lose its storage key.
      // Restore it to pending so the next run retries the same expired row.
      await db.update(attachments).set({ status: "pending", updatedAt: new Date() }).where(eq(attachments.id, claimed.id)).catch(() => {});
      counts.failed++;
    }
    if (counts.failed) break;
  }
  return counts;
}

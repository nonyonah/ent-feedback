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
  for (let i = 0; i < Math.min(10, Math.max(1, limit)); i++) {
    const found = await db.transaction(async tx => {
      const [row] = await tx.select().from(attachments).where(and(eq(attachments.status, "pending"), lt(attachments.expiresAt, new Date())))
        .orderBy(asc(attachments.expiresAt), asc(attachments.id)).limit(1).for("update", { skipLocked: true });
      if (!row) return false;
      try {
        await deleteImage(row.storageKey);
        await tx.delete(attachments).where(eq(attachments.id, row.id));
        counts.deleted++;
      } catch {
        // Keep the row for the next cleanup run; never lose its storage key.
        counts.failed++;
      }
      return true;
    });
    if (!found || counts.failed) break;
  }
  return counts;
}

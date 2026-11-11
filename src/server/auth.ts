import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { cache } from "react";

import { getDb } from "@/server/db/client";
import { isUniqueViolation } from "@/server/db/errors";
import { users, lifecycleEmailState } from "@/server/db/schema";
import { ServiceError } from "@/server/result";

export type AppUser = typeof users.$inferSelect;

function normalizeEmail(value: string | null | undefined): string | null {
  const email = value?.trim().toLowerCase();
  return email ? email : null;
}

async function upsertAppUser(clerkUserId: string): Promise<AppUser> {
  const db = getDb();
  const clerkUser = await currentUser();

  if (!clerkUser || clerkUser.id !== clerkUserId) {
    throw new ServiceError("unauthenticated", "Sign in again to continue.");
  }

  const primaryEmail = clerkUser.primaryEmailAddress;
  const email =
    primaryEmail?.verification?.status === "verified"
      ? normalizeEmail(primaryEmail.emailAddress)
      : null;
  const name = clerkUser.fullName ?? clerkUser.firstName ?? clerkUser.username ?? null;
  const avatarUrl = clerkUser.hasImage ? clerkUser.imageUrl : null;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  let safeEmail = email;

  if (email) {
    const [emailOwner] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (emailOwner && emailOwner.id !== existing?.id) {
      safeEmail = null;
    }
  }

  if (existing) {
    const [updated] = await db
      .update(users)
      .set({ email: safeEmail, name, avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, existing.id))
      .returning();

    return updated;
  }

  try {
    const [created] = await db
      .insert(users)
      .values({ clerkUserId, email: safeEmail, name, avatarUrl })
      .returning();

    return created;
  } catch (error) {
    if (isUniqueViolation(error)) {
      const [retried] = await db
        .select()
        .from(users)
        .where(eq(users.clerkUserId, clerkUserId))
        .limit(1);

      if (retried) {
        return retried;
      }

      const [withoutEmail] = await db
        .insert(users)
        .values({ clerkUserId, email: null, name, avatarUrl })
        .returning();

      return withoutEmail;
    }

    throw error;
  }
}

export const getOptionalAppUser = cache(async (): Promise<AppUser | null> => {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await upsertAppUser(userId);
  // A public-board participant receives no workspace setup reminders unless they start setup.
  // Existing accounts enroll on their next visit; this does not backfill a welcome campaign.
  const now = new Date();
  await getDb().insert(lifecycleEmailState).values({userId:user.id,lastActiveAt:now,welcomeEligible:now.getTime()-user.createdAt.getTime()<60_000})
    .onConflictDoUpdate({target:lifecycleEmailState.userId,set:{lastActiveAt:now}});
  return user;
});

export const requireAppUser = cache(async (): Promise<AppUser> => {
  const user = await getOptionalAppUser();

  if (!user) {
    throw new ServiceError("unauthenticated", "Sign in to continue.");
  }

  return user;
});

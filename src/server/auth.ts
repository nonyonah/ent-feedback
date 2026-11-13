import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq, lt, or } from "drizzle-orm";
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

  // One round trip resolves this account and the current owner of the email.
  const matches = await db
    .select()
    .from(users)
    .where(
      email
        ? or(eq(users.clerkUserId, clerkUserId), eq(users.email, email))
        : eq(users.clerkUserId, clerkUserId),
    )
    .limit(2);
  const existing = matches.find((row) => row.clerkUserId === clerkUserId);
  const emailOwner = email
    ? matches.find((row) => row.email === email && row.id !== existing?.id)
    : undefined;

  const safeEmail = emailOwner ? null : email;

  if (existing) {
    // Most requests carry no profile change. Skip the write rather than
    // touching the row on every authenticated request.
    if (
      existing.email === safeEmail &&
      existing.name === name &&
      existing.avatarUrl === avatarUrl
    ) {
      return existing;
    }

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
      // A concurrent request for this account may have inserted it already.
      const [retried] = await db
        .select()
        .from(users)
        .where(eq(users.clerkUserId, clerkUserId))
        .limit(1);

      if (retried) {
        return retried;
      }

      // The email belongs to a different account. Store this account without an
      // email, and tolerate another concurrent request creating it first.
      await db
        .insert(users)
        .values({ clerkUserId, email: null, name, avatarUrl })
        .onConflictDoNothing();
      const [withoutEmail] = await db
        .select()
        .from(users)
        .where(eq(users.clerkUserId, clerkUserId))
        .limit(1);

      if (withoutEmail) {
        return withoutEmail;
      }
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
  // Activity is only recorded when it moved, so a busy client does not write on every request.
  const now = new Date();
  const stale = new Date(now.getTime() - 5 * 60_000);
  await getDb().insert(lifecycleEmailState).values({userId:user.id,lastActiveAt:now,welcomeEligible:now.getTime()-user.createdAt.getTime()<60_000})
    .onConflictDoUpdate({target:lifecycleEmailState.userId,set:{lastActiveAt:now},setWhere:lt(lifecycleEmailState.lastActiveAt,stale)});
  return user;
});

export const requireAppUser = cache(async (): Promise<AppUser> => {
  const user = await getOptionalAppUser();

  if (!user) {
    throw new ServiceError("unauthenticated", "Sign in to continue.");
  }

  return user;
});

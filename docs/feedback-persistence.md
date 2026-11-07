# Feedback persistence

Updated 6 November 2026. Feedback persistence was initially implemented against the existing schema; later migrations add request counters, merge-target storage and status notification events. See [current backend verification](backend-readiness.md).

## Connected behavior

- Public boards, dashboard requests and the widget read the same persisted board records. The provider no longer initializes production views from sample feedback.
- Posts, comments, votes, comment likes, status changes and soft deletion use validated server actions in `src/server/actions/feedback.ts`.
- Signed-in author identity comes from Clerk's application user. Submitted names, emails or roles cannot impersonate that account. Signed-in anonymous posting hides the display name while retaining the server-side author association.
- Anonymous visitors receive a random 256-bit bearer token scoped to a workspace. Only its SHA-256 hash is stored in `guest_actors`. The client retains the token in browser storage when available, or memory otherwise. This supports embedded visitors without relying on third-party Clerk cookies. The token identifies a browser visitor, not a verified person, and grants no workspace management privileges.
- Guest names/emails remain unverified attribution. Email is stored privately when supplied and is excluded from public response shapes. Comment author team labels are derived from active server membership.
- Votes and comment likes set an explicit desired state with unique database constraints. Retrying `active: true` cannot increment a count twice; removing a vote affects only the caller's vote.
- Create/comment requests have actor- and workspace-scoped request keys. The provider retains a key when saving fails. A retry after a committed save with a lost response resolves the same database ID, rather than creating a duplicate. This retry cache lasts for the current provider session; it is not a durable offline outbox.
- Every mutation resolves its board/workspace, and existing targets must belong to both. Post locks serialize comments, votes and moderation against status/deletion changes. Status changes require owner/admin access and write status history in the same transaction. Deleted posts disappear from public lists and reject subsequent activity.
- Forms wait for the server before showing success or clearing drafts. Comments disable editing during saving. Load errors offer Retry. A board/account change discards obsolete response updates.
- Post permalinks resolve their actual workspace and board. The application-origin home goes to the dashboard instead of showing the former sample board; workspace subdomain roots continue through the existing tenant rewrite.

## Verification

- `npm run typecheck` — passed.
- Focused ESLint on the action, provider, changed feedback screens/routes and integration-check script — passed.
- `node --import tsx --test tests/auth-flow.test.ts tests/workspace-domain.test.ts` — all 12 passed.
- `node scripts/check-feedback-db.mjs` — passed against PostgreSQL. Tests real tables and constraints, duplicate post/comment request keys, server-author attribution, vote/like deduplication, guest token hashing/reuse, email privacy, cross-workspace rejection, admin status history and soft deletion. The Clerk actor is mocked. **All fixture rows are rolled back**, including when an assertion fails.
- Browser fixture using actual provider/form/thread components — passed: lost post response followed by retry produces one record; post/comment failures retain drafts; success clears the composer; persisted fixture data reloads; load failure/retry works; no page errors. Server responses/storage are mocked in this browser check, so it is separate from the real database check.

The browser harness was temporary under `/tmp/ent-audit`; the PostgreSQL integration check is retained in scripts. No live signup, real anonymous browser-to-server session, OAuth, email or production DNS end-to-end journey was exercised by these checks. No production build or concurrency load test was run.

## Current follow-up status

R2 uploads, image validation/association, persisted follows, transactional notification events, the inbox, Sendbyte delivery jobs and request rate limits are now implemented. Tests and deployment limits are recorded in [backend readiness](backend-readiness.md).

The notification inbox has cursor pagination. The main feedback dataset still loads as a complete list. Parent-comment IDs are accepted server-side, while the conversation UI remains flat. Merge is explicitly unavailable. Full live Clerk onboarding and third-party embedded-browser verification remain deployment checks. Anonymous tokens identify a visitor browser rather than a verified person; signing in does not merge previous anonymous votes automatically.

## Conversation replies and status timeline

The public board, dashboard and widget now share `CommentThread`: a dashboard-style composer, inline per-comment reply composers, nested replies, image/emoji tools and solid primary heart reactions. Replies send the existing `parentCommentId` command field; the server verifies the parent belongs to the same workspace and request. Drafts remain after failed submissions.

Feedback DTOs now include comment creation timestamps and workspace-scoped status history (actor name, previous/new status, time). The conversation places its composer first, then root comments and status changes chronologically, with replies nested under their parents and status changes shown against a timeline rule. Existing status-history records appear without a migration. No email addresses are exposed by the added history query.

Verification: TypeScript and targeted ESLint passed. Browser fixture checked nested reply submission (including parent ID), primary-filled heart likes, status history entries, and mobile width. Real embedded details loaded the shared composer without browser errors or posting to the live board. PostgreSQL integration checks passed for persisted parent replies, cross-request parent rejection and public status-history reads; fixture transaction rolled back.

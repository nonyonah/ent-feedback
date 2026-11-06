# Board persistence

Implemented 6 November 2026. Uses the existing PostgreSQL/Drizzle `boards` table; no migration required.

## Behavior

- Create requires a Clerk application user and owner/admin workspace membership. The server validates name, color and optional emoji, allocates the UUID and generates a workspace-unique handle. Repeated names receive `-2`, `-3`, etc. One-character and non-Latin names still produce valid handles. The new board is appended to the workspace order.
- Rename requires owner/admin access and a board belonging to that workspace. Only name and update timestamp change; the public handle remains stable.
- Reorder requires an exact, duplicate-free list of the workspace's board IDs. Missing, foreign or stale IDs fail without saving an incomplete order. Creation and reorder lock the workspace row inside their transactions to serialize changes to the board set/order. A failed position update rolls back the whole reorder.
- Existing workspace and public-board loaders already read persisted board positions. Refreshing reads the saved records rather than generating client-only board IDs.
- Client create/rename wait for the server, retain drafts on failure and display a retryable error. A pending mutation disables duplicate operations. Drag order is optimistic and restores the prior order on failure, with an error toast. Mutations capture their workspace so a late response does not select a board in a different workspace.
- Member users can browse boards but cannot create, rename or reorder them. Server checks remain authoritative regardless of the UI.

## Files

- `src/server/actions/boards.ts`: authenticated, validated mutations and transactions.
- `src/components/feedback/project-provider.tsx`: async server-backed operations and optimistic reorder rollback.
- `create-board-dialog.tsx`, `rename-board-dialog.tsx`, `dashboard-boards.tsx` under the same component directory: pending, error and permission behavior.

## Verification

- `npm run typecheck` and focused ESLint: passed.
- `node scripts/check-board-actions.mjs`: passed. In-memory database boundary exercises validation, actor-bound admin requirements, scoped unique handles, stable rename URL, cross-workspace rejection, exact reorder membership and rollback after a simulated partial write failure.
- `node scripts/check-board-db.mjs`: passed against the configured PostgreSQL database. Real schema and membership checks, create/read/rename/reorder round trip, duplicate handle suffix, foreign workspace denial, member denial and stale list rejection. **All fixture rows were rolled back.** The Clerk actor is mocked; this does not test live session resolution. This script is opt-in and requires DATABASE_URL from the local environment.
- Browser check passed using real provider/dialog/card components and mocked mutation responses: create/rename failure retention and retries, plus keyboard reorder rollback and an error toast. The first test attempt queried an underlying heading through the accessibility tree while a modal intentionally made it inert; the locator was corrected to inspect its DOM text.

## Remaining backend scope

Feedback posts, votes, comments/replies, reactions, follows, status changes/history, attachments and the notification activity feed still need their persisted flows. No email, OAuth or production DNS changes were made. This milestone does not certify concurrent requests from multiple database connections or a full live Clerk browser journey.

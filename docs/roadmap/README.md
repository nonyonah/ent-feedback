# Roadmap implementation

The roadmap is a view of Ent’s existing `feedback` records. It is available at `/p/:workspace/roadmap`, the workspace subdomain’s `/roadmap`, `/dashboard/roadmap` (owner editing; invited members have the public read-only view), and the widget’s fourth tab, after Feedback.

The owner dashboard has an additional Open column. Public and widget roadmaps never include Open items. Compact draggable cards follow the latest Paper export; clicking a title opens a coss dialog for status, visibility and note editing. Roadmap is grouped under Product updates in the sidebar; Changelog is deferred.

## Data and rollout

- Applied to the configured Neon database on November 19, 2026. Deployments using another database must apply Drizzle migrations `0022_slippery_thunderball` and `0023_cooing_scream` before deploying these routes. No production migration is run by the test scripts.
- Migration 0022 adds visibility, fractional ordering, public notes and shipment timestamps; existing roadmap statuses are ordered by votes within workspace/status. Historical shipped records use their existing updated timestamp. A database trigger maintains shipment timestamps for every status writer, including ordinary feedback updates.
- Migration 0024 backfills Open positions by votes and extends the central ordering trigger to Open items, including items moved back from other columns.
- Migration 0023 enables RLS on `feedback`; `voter_email_optouts` also has RLS. The application uses its existing server database role, with authorization enforced in server routes and services. Do not grant a browser role direct table access or use FORCE RLS on the server table-owner role without defining corresponding policies.
- Confirm `EMAIL_UNSUBSCRIBE_SECRET` is at least 32 characters and the existing Sendbyte configuration is live. Keep the secret stable so earlier unsubscribe links remain valid. The existing Netlify maintenance schedule processes roadmap jobs; no new scheduler is needed.
- No new items table, auth provider or email provider is introduced.

## Behavior

- Public reads validate the workspace handle (`projectKey`), omit Open, hidden, deleted and merged items, and return only public summaries. Responses use no-store so refreshed visibility, counts and vote states are current. Results are paginated in bounded pages; clients load subsequent pages. Shipped is newest first and defaults to the last 30 days. The public page offers See all shipped. The widget uses the five most recent Shipped cards.
- Every admin GET/PATCH requires active owner membership in the supplied workspace. The patch also checks the item’s workspace, limits notes to 140 characters and accepts only the three roadmap statuses. Reorder operations serialize per workspace and validate current neighbors before calculating one fractional value. No column is reindexed. Exhausted numeric precision produces a retryable positioning error instead of changing other records.
- Status, visibility, ordering and notes use optimistic rendering, server confirmation and rollback with an error toast. Phones use coss Tabs and per-card coss status dropdowns; mouse and keyboard drag and drop use the existing dnd-kit packages on desktop.
- Moving into Shipped opens the coss confirmation dialog. Cancelling does not save the move. Confirming saves the optional note and email choice. Existing in-app notifications and Slack status delivery are preserved; roadmap status changes suppress automatic activity emails so the dialog’s checkbox controls the shipped email.
- Hiding a roadmap card does not make its existing feedback post private. It removes only the roadmap listing.

## Shipped emails

Shipment notification requests and their fanout job are recorded in the same transaction as the update. `shipped_notified_at` is a once-only request marker; delivery itself is asynchronous and retryable. Fanout processes 50 votes at a time. Recipient jobs deduplicate by item and normalized email, and the same durable key is sent to Sendbyte for idempotency after ambiguous failures.

Registered voters use their current email and status-notification preference. Guest voters need a previously verified address belonging to their guest identity. Delivery rechecks that the vote still exists, the email still belongs to the recipient, the item is shipped/visible, and the address has not opted out for this workspace. Unsubscribe tokens are authenticated and encrypted: no plain email or voter ID appears in the URL. One click or a one-click POST records the workspace/email opt-out. Failures are retained in the jobs table with bounded retries and logged without email addresses.

## Attachment conflicts resolved

1. The two Paper exports are identical dashboard designs; no separate public-page export was supplied. Public layout follows the written three-column/mobile-tab requirements.
2. Paper shows Pending, Reviewing, Planned, In Progress and Completed. The feature specifies only Planned, In Progress and Shipped, so those are the only roadmap columns; no custom statuses were introduced.
3. The samples name Supabase, `feedback_items`, `projects`, `project_id` and Resend. Ent actually uses Neon/PostgreSQL, `feedback`, `workspaces`, `workspace_id`, Clerk and Sendbyte. The implementation extends those real systems.
4. The API column key is `in_progress`; actual item status remains Ent’s existing `in-progress` enum value.
5. Paper’s fixed desktop dimensions, Inter font, literal dark colors and decorative header actions are adapted to responsive Ent layout, Allo font, semantic tokens and the requested functional controls. Column radius (18px), card radius (13px), compact type and spacing follow the export.

## Verification

- `node --require /tmp/ent-neon-test-dns.cjs scripts/check-chat-db.mjs --roadmap` creates and removes an isolated schema and mocks external delivery. The optional process-local DNS fallback is only needed on networks where Neon DNS fails; normally run `node scripts/check-chat-db.mjs --roadmap`.
- `PLAYWRIGHT_MODULE=/path/to/playwright node scripts/check-chat-ui.mjs --roadmap` tests public filtering/voting, mobile tabs, owner controls, keyboard and mouse drag, rollback, add sheet, shipped dialog, notes and widget navigation.
- `node --conditions=react-server --import tsx --test tests/*.test.ts`, `npx tsc --noEmit`, scoped ESLint and production webpack build.

## Latest revision verification — November 19, 2026

The compact Paper card revision, admin-only Open column, title edit dialog and Product updates sidebar group passed the roadmap Playwright suite, TypeScript, scoped ESLint, unit tests and documentation checks. The 0024 migration application and isolated database rerun could not finish because Neon connections timed out or terminated. Apply/check 0024 when connectivity returns before release. Connection failures also prevented cleanup of temporary test schemas `ent_chat_test_47b032d1a3c44bfe8f040b98ba562d59` and `ent_chat_test_9b19e4afa7ab40a0b7b66e59e43a7e32`; remove these test-only schemas when the database is reachable.

### Public roadmap card refinement

Public cards use the compact Paper proportions with a larger H2 page title, softer column surfaces and stacked coss voter avatars. The supplied export includes only a draggable card, so column styling and avatar placement adapt its spacing to the public page. The server returns at most three recent voter display names and avatar URLs per item, including anonymous gradient fallbacks for guest voters. No voter IDs or emails are included. Guest email identities are not used as avatar names.

## Interaction audit — Emil design engineering

| Before | After | Why |
| --- | --- | --- |
| Sortable card moved inside an overflow container | Body-portal DragOverlay with a matching card face | Keeps the card above columns and out of clipping contexts |
| Default transition and possible scale distortion | Direct pointer tracking, translation-only siblings and a 160ms custom ease-out | Prevents lag and stretched text while crossing columns |
| Keyboard/reduced-motion moves animated | Immediate positioning and tab indicators | Keeps frequent keyboard actions fast and respects motion preferences |
| Polling could replace data mid-drag | Drag-time polling guard and revision invalidation | Maintains a stable board under the pointer |
| Ambiguous correlated SQL for totals and own vote state | Explicit qualified per-item/workspace correlations | Counts and vote state reflect the correct record |
| Public snapshots cached for a minute | No-store responses and feedback-change refresh | Hiding and activity counts do not wait for a CDN cache to expire |
| Metadata could shrink beside a long category | Fixed-size counters and a bounded type label | Keeps vote and comment totals readable in narrow columns |

Coss dialogs, dropdowns, focus states, empty/error/loading states, mobile status controls, public avatar stacks, token-based light/dark colors and the shipped confirmation flow remain in use. Drag previews have no decorative bounce or drop-back animation; a cancelled Shipped confirmation leaves the original item unchanged.

### Audit verification

The November 19 interaction fixes passed the isolated Neon roadmap suite, including exact vote/comment counts for both admin and public responses, excluding deleted comments, per-workspace isolation and personal vote state. The Playwright suite passed normal-motion pointer dragging, preview topmost hit testing above destination columns, source placeholder opacity, keyboard moves with zero transition, mobile dropdowns, rollback, shipped confirmation, widget navigation, light/dark rendering and responsive public layouts. TypeScript and scoped ESLint pass. The pending 0024 Open-ordering migration was successfully applied to the configured Neon database.

## Public navigation and state refinement

| Before | After | Why |
| --- | --- | --- |
| Inconsistent Feedback/Roadmap active styles | Shared coss route control with symmetric active, hover and focus surfaces | Makes current location clear without an animated page switch |
| Status chips occupied the heading area | Visible 24px Feedback H2 with a status dropdown directly beside Submit feedback | Groups filters with actions while preserving narrow-screen alignment |
| Feedback had an illustrated error card while Roadmap showed a different alert | Shared ErrorNotice, concise recovery text and Try again | Persistent load failures use the app’s established recovery format |
| An empty Shipped column always included an archive button | Equal empty column body heights; history action appears in the header only when older visible shipments exist | Avoids a taller empty column without losing shipped history |
| Loading heading occupied a different toolbar layout | Matching header and control skeleton geometry | Reduces layout movement after loading |

The public API exposes only a boolean indicating older visible shipments; hidden, deleted, merged and other-workspace items are excluded from that check. Failed background roadmap refreshes preserve existing content and show a refresh-specific alert.

## Final hierarchy, widget and failure polish

| Before | After | Why |
| --- | --- | --- |
| A stretched status selector | Content-sized selector capped at 124px | Keeps the action row compact for All and longer statuses |
| Public H2 titles with no summary | A single public H1, 48px top separation and a short subtitle | Provides an introduction and consistent page hierarchy; widget keeps H2 |
| Always-expanded roadmap columns | Coss Collapsible headings with counts and chevrons | Lets visitors reduce clutter, especially in the widget, without changing item state |
| Red load banners with Try again | Deduplicated error toast with Retry, plus a quiet Reload state when content is unavailable | Background failures preserve content; there is still a recovery path after dismissal |
| Global widget notifications could be blocked by dialog focus scope | A scoped toast portal at the widget top | Makes retry actions accessible and keeps the composer clear |

Widget cards still use the exact public RoadmapCard component and bounded voter name/avatar data. Opening a card preserves the existing feedback detail flow. Collapsing a column changes only presentation; it never hides or updates items on the server. Column content toggles immediately; chevrons use a short transform transition that is removed for keyboard and reduced-motion interactions.

Load-failure toasts are emitted only for active widget tabs, use stable IDs, close on recovery/unmount, and defer initial emission until the provider is subscribed. Message-send failure keeps the draft and composer retry state. Field validation remains inline beside inputs. The shared recovery pattern covers public pages, feedback details, dashboard requests, widget feedback/live chat, Conversations and the app error boundary.

Verification for this final pass: production webpack build, TypeScript, scoped ESLint, all 91 unit tests and documentation checks passed. Browser fixtures verified H1 hierarchy/subtitles/top spacing, compact status control at 320–1280px, column mouse/keyboard collapse and reopening, widget avatar stacks, direct card opening, active-tab-only error emission, initial-load retry toasts, retained background content, widget toast focus scope, failed chat draft retention/retry and Conversations load recovery.

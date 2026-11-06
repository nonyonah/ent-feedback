# Ent Feedback — backend handoff for DeepSeek

**V1 scope update:** integrations, custom domains and team/role management are temporarily disabled in UI and server entry points. Automatic workspace subdomains and internal ownership checks remain. See [v1 feature exclusions](v1-scope-gates.md). These features are not part of the next backend milestone.

## Current feedback persistence milestone

Posts, votes, comments, comment likes and admin status changes now use persisted server actions. See [feedback-persistence.md](feedback-persistence.md) for exact scope, test coverage and remaining work. Image-bearing submissions are explicitly rejected until R2 uploads are connected.

## Current board persistence milestone

Board creation, renaming and ordering now use `src/server/actions/boards.ts` and the existing PostgreSQL schema. See [board-persistence.md](board-persistence.md) for contracts, verification and remaining work. Older frontend limitations below are historical where superseded by later milestone notes.

## Objective and boundaries

Connect the existing frontend to a persistent backend. Preserve the current screens, compact public submission dialog, Hugeicons, supplied notification bell, custom status icons, purple primary color (#6247aa), direct invitation dialog, remembered settings section, and floating embedded widget. Avatar fallbacks are stable gradients with no letters; keep real profile/workspace image support. The public feedback composer intentionally has no field/selector outline rings or hover color changes. Do not redesign the frontend or reintroduce removed design-preview routes, Roadmap, or Updates.

**Authentication is Clerk.** This is a confirmed user decision, not a provider-selection task. No Clerk credentials or production services are configured by this handoff. Do not claim authentication is connected until it works against a configured Clerk instance.

Read `AGENTS.md`, `package.json`, and the relevant installed Next.js guides in `node_modules/next/dist/docs/` before implementation. This repository uses Next.js 16.4.4 App Router, React 19.3, cache components, coss UI/Base UI, and Tailwind v4. Check the installed routing/proxy and caching conventions rather than copying older Next.js middleware examples. The working tree contains uncommitted frontend work; preserve it.

## Current behavior and source map

| Area | Source | Required replacement |
| --- | --- | --- |
| Workspace/board/settings state and preview identity | `src/components/feedback/project-provider.tsx` | Server-backed workspace records and Clerk identity |
| Posts, voting, comments, reactions | `src/components/feedback/feedback-provider.tsx` | Scoped queries and authenticated/guest mutations |
| Demo email/verification flow | `src/components/feedback/auth-view.tsx`, `src/app/auth/*` | Clerk sign-in/sign-up/verification and return flow |
| Public header and account state | `src/components/feedback/site-header.tsx` | Clerk-loaded identity and role-aware actions |
| Public guest/signed-in composer | `src/components/feedback/feedback-form.tsx`, `submit-dialog.tsx` | Create post with authoritative server identity |
| Replies, images, emojis | `comment-thread.tsx`, `composer-tools.tsx` | Persist comments/replies and attachment references; emojis remain plain text |
| Workspace/board creation | `onboarding-view.tsx`, `create-board-dialog.tsx` | Authorized creation, unique handles, stable IDs |
| Board rename/reorder | `dashboard-boards.tsx`, `rename-board-dialog.tsx` | Persist name and order; renaming preserves public handle |
| Team invitation | `invite-team-dialog.tsx`, `team-settings.tsx` | Real pending/sent/accepted/cancelled lifecycle |
| Branding/widget/preferences | `dashboard-settings.tsx`, `widget-settings-view.tsx`, `notifications-panel.tsx` | Persist settings and user notification preferences |
| Share/install | `share-view.tsx`, `public/widget.js` | Real public URLs and workspace/board embed configuration |
| Widget | `widget.tsx`, `embedded-board.tsx`, `src/app/embed/page.tsx` | Same persisted posts, votes and comments as the board |
| Public handle resolver | `board-route.tsx`, `src/lib/project-links.ts` | Server lookup and explicit missing/inaccessible result |
| Integrations | `integrations-settings.tsx` | Replace setup previews with actual authorized connections in a later milestone |

Paths without an explicit directory above are under `src/components/feedback/`. Feedback domain types and status labels live in `src/lib/feedback-data.ts`.

### Important frontend limits to remove

- State resets on refresh. Browser session state and seed data are not a database.
- `publicUser` is a workspace-scoped **design preview**, populated only by the explicit successful-verification preview action. Never accept it as authentication evidence.
- The current signed-in public header has a dashboard shortcut without a real membership check. Only render or enable administration actions for authorized workspace members.
- Follow state uses browser local storage. Migrate it deliberately to per-user records without trusting arbitrary local values as ownership.
- Images are currently data URLs, up to three PNG/JPEG/WebP/GIF images of 2 MB each per composer. Preserve the UI limit and enforce it on the server, including actual file contents.
- `/embed?project=...&board=...` must resolve the supplied workspace and board. The preview currently initializes sample provider state; do not silently fall back to the Ent sample board in production.
- Feedback in the widget stays in its panel. Posting, voting, viewing a post and commenting must not navigate the parent app away.
- The guest form allows anonymous posting. Treat guest attribution as unverified; never grant permissions from a visitor-supplied email/name.

## Clerk implementation contract

1. Use the current supported `@clerk/nextjs` SDK with `ClerkProvider` and server-side session helpers. Verify compatibility with the repository's Next.js version and installed local guides before choosing `proxy.ts`/middleware placement.
2. Configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` through environment variables. Add placeholders to `.env.example`; never commit real keys. If webhooks are used, configure their separate signing secret.
3. Replace `/auth`, verification previews, header identity, and logout with real Clerk flows. Keep the current user-facing design where custom flows are supported. Explicitly handle loading, verification requirements, expired links, cancellation, and session expiry.
4. Preserve the originating workspace/board and a validated same-origin return path through sign-in/sign-up. A public visitor can sign in without becoming a workspace administrator. Sign-out must invalidate the Clerk session and clear local identity/query caches.
5. Require a valid server session for dashboard/settings/team/integration management. Resolve the caller using Clerk on every protected server mutation and read. Never trust client `userId`, `publicUser`, role, active workspace, or an email field.
6. Keep public boards, permitted guest actions, widget loading, and verified webhook ingress available without forcing dashboard login. Clerk middleware does not protect routes automatically; explicitly define the protected boundaries and check authorization inside server handlers too.
7. Map the Clerk subject to an application user via a unique `clerk_user_id`. Keep credentials and sessions in Clerk, not in a parallel application password/session system.
8. Use application workspace membership as the authorization source for this handoff. Clerk Organizations are optional and are **not automatically required** by the choice of Clerk Auth. Do not create competing membership sources. If Organizations are chosen later, document the mapping and source of truth before implementation.
9. If synchronizing Clerk user events, verify webhook signatures, deduplicate events, and handle retries/order and deletion policy. Authorization must not depend on a webhook arriving before the user's first request; use a safe idempotent user upsert where needed. Do not treat webhook payloads as live sessions.
10. Third-party embedding can restrict authentication cookies. Keep anonymous widget use functional and design any authenticated widget flow explicitly. A host's arbitrary `postMessage` or `data-user` value is never proof of a Clerk identity. Do not expose secret keys in the loader or iframe.

## Data model and invariants

Use a relational database unless a different choice is explicitly approved. Database/ORM, storage, email, and hosting providers are still open decisions; Clerk does not replace these services.

| Entity | Key fields / invariant |
| --- | --- |
| users | Stable app ID, unique Clerk subject, display profile, timestamps |
| workspaces | ID, unique public handle, name, website, branding; “project” and “workspace” currently describe this same container |
| workspace_members | Workspace + user unique, role, membership status; users can join multiple workspaces |
| invitations | Workspace, normalized email, role, inviter, expiring hashed acceptance token, state; acceptance email must match verified Clerk identity |
| boards | Workspace foreign key, unique `(workspace_id, handle)`, name, color/emoji, description, persisted order |
| feedback | Board + workspace foreign keys, title, body, optional author ID/guest identity, status, timestamps; default status `open` |
| comments | Feedback foreign key, optional author ID/guest identity, body, optional parent comment ID, timestamps; parent must belong to the same feedback |
| votes / reactions | Target + actor unique, authenticated user or server-issued guest actor; prevent double increments and invalid cross-tenant targets |
| follows | User + feedback unique; workspace must be accessible to that user |
| attachments | Parent post/comment, storage key, validated MIME/size, ownership, lifecycle; no base64 blobs in normal post records |
| status_history | Feedback, previous/new status, authorized actor, timestamp |
| widget_settings | Workspace/board scope, enabled, visitor-details mode, name/email switches, greeting, reply-time mode |
| notification_preferences | User scope; new feedback, feedback comments, comment replies, comment reactions, feedback reactions |
| notifications | Recipient, workspace/target, event type, read timestamp, deduplication key |
| integration_connections | Workspace, provider, authorization state, encrypted secret reference, allowed channels; later milestone |

Statuses remain exactly `open`, `planned`, `in-progress`, `shipped`. Never grant access by guessing IDs/handles. Require workspace constraints on every query and relationship. Use transactions and unique constraints for creation, counts, votes/reactions, invitations, and reordering. Guest actor IDs are rate-limiting/deduplication aids, not verified human identities.

Roles: owner manages the workspace and ownership; admin manages boards, feedback moderation/status and workspace settings; member reviews/responds to feedback. Final role capabilities (especially invitations, deletions and integration management) must be recorded and tested before release. Public visitors get only explicitly public reads and enabled guest actions. Never automatically invite someone because they submit feedback.

## API and server action boundaries

Implement these operations as typed Next.js Route Handlers and/or Server Actions; the exact file organization can follow the chosen backend stack. Keep a single service layer so the widget and dashboard do not implement different authorization logic.

- **Public resolve/read:** resolve workspace and board handles; get board identity and permitted settings; cursor-paginated feedback with `top`, `trending`, `newest`, search and status filters; get post/comments. Define the trending formula explicitly.
- **Workspace management:** list/create accessible workspaces; list/create boards; rename board without changing handle; atomically reorder boards; get/update branding and widget settings.
- **Feedback mutation:** create feedback, edit/moderate according to role, change status, set/unset own vote, add comment/reply, set/unset own reaction, follow/unfollow. Reactions and votes use desired state rather than blindly incrementing counters.
- **Team:** list members/invitations, create/cancel invitations, accept token, change roles/remove members with owner safeguards.
- **Uploads:** request a limited upload grant, upload directly or through a validated endpoint, finalize attachment ownership, link attachments to the post/comment transaction; expire abandoned uploads and forbid attaching another actor's files.
- **Notifications:** get/update exactly the five preferences, paginate inbox, mark read. Notification events are server-generated and recipient-scoped.
- **Widget configuration:** resolve `data-project` and `data-board`; publish only safe appearance/availability/visitor-detail settings, no private user/team/integration fields. Validate enabled state again when submitting.
- **Clerk webhook:** signature-verified endpoint with event deduplication, separated from ordinary user-session authorization.

Return consistent typed success/error results. Distinguish validation, unauthenticated, forbidden, missing, conflict, rate-limited, and retryable server errors. Use stable IDs/cursors and authoritative counts. Support request idempotency for post/comment creation and invitation delivery retries. Preserve frontend drafts on validation, upload, network, and authentication failures.

## Embedded widget requirements

- Keep the existing loader install contract: `<script src="APP_ORIGIN/widget.js" data-project="WORKSPACE_HANDLE" data-board="BOARD_HANDLE" defer></script>`.
- Load the same `WidgetPanel` design/data as the preview. Validate configuration; show a useful unavailable/disabled state instead of another workspace's content.
- Preserve floating launcher, keyboard closing, panel focus, constrained mobile dimensions, and host-page scroll/interaction behavior.
- Validate both `event.origin` and iframe `event.source` for messages; use a specific target origin. Configure allowed embedding origins/frame policy intentionally rather than disabling protections globally.
- Visitor details follow workspace settings (`none`, `optional`, `required`). Anonymous names/emails stay clearly unverified. Real session identity takes precedence over supplied visitor details.
- Do not put Clerk secrets, integration credentials, or administrative tokens into HTML, URLs, data attributes, or browser storage.

## Delivery order and acceptance gates

1. **Bootstrap:** choose the remaining infrastructure, environment schema, local migrations, typed service layer, and error conventions. No production deployment implied.
2. **Clerk + workspaces:** real sign-up/sign-in/sign-out, protected admin routes, user mapping, workspace membership, creation, and invitations. Test public users do not inherit admin access.
3. **Boards + settings:** persistent creation/rename/reorder, public resolution, appearance and widget settings. Refresh and multiple sessions must preserve correct data.
4. **Feedback + media:** guest/authenticated posting, image upload, votes, comments/replies/reactions/follows, status changes, pagination/search/sorting. Public board and dashboard must agree immediately after mutation.
5. **Widget:** configured external host with anonymous and supported authenticated flows, mobile sizing, disabled submissions, image upload, and close messaging. No parent navigation.
6. **Notifications + integrations:** inbox/preferences/event delivery, then actual integration authorization. Do not label integrations “connected” or invitations “sent” before provider success.
7. **Release validation:** meaningful permission/tenant-isolation, concurrency/idempotency, malformed input/upload, webhook/retry, session expiry, and end-to-end journey tests; documented rollback/migrations and known limitations.

For each milestone: implement, run relevant checks, report files changed and verification, and list any real missing provider configuration. Do not rewrite completed frontend work to make implementation easier.

## Start prompt for DeepSeek

> Read `AGENTS.md`, `docs/backend-handoff-deepseek.md`, `docs/product-flow.md`, and the current providers and route structure. Clerk is fixed for authentication. First inventory the frontend-to-backend boundaries and identify the still-unselected database/storage/email/hosting choices. Preserve the UI and uncommitted work. Implement the first milestone once the remaining provider configuration is agreed; do not add another authentication system or assume public signed-in visitors are workspace members. Replace preview state incrementally and verify tenant isolation at each milestone.

## Official references

- [Clerk Next.js SDK](https://clerk.com/docs/reference/nextjs/overview)
- [Clerk middleware and route protection](https://clerk.com/docs/reference/nextjs/clerk-middleware)
- [Clerk webhook verification and synchronization](https://clerk.com/docs/guides/development/webhooks/syncing)
- Installed Next.js documentation under `node_modules/next/dist/docs/`, especially proxy, App Router server operations, and caching guides.

## Implemented registration and OAuth update

Authentication pages now contain a centered Clerk widget; public header authentication opens Clerk modals. `/auth/continue` routes authenticated users appropriately. `/registration` provides profile/photo, workspace, optional app connections, and optional real team invitations. Clerk private metadata records onboarding progress, while database membership remains the source of workspace authorization. Finishing enables a styled Driver.js dashboard tour with a replay control. Clerk establishes the session before profile setup, so the wizard can securely update the user and workspace.

Slack/Discord OAuth authorization is implemented for workspace channels, with encrypted credentials, admin checks, state validation, callback recovery and disconnect. See [OAuth setup and limitations](./oauth-integrations.md) for environment variables, callback URLs, storage and remaining notification-delivery work. Provider credentials are intentionally not populated by this change.

## Workspace domains update

Both workspace creation flows check global normalized-name and subdomain availability. Migration `0002_smooth_pestilence.sql` enforces case/whitespace-insensitive name uniqueness; the existing handle constraint enforces unique workspace subdomains. Public workspace routes now load persisted workspace/board metadata. See [workspace domain setup](./workspace-domains.md) for the proposed `feedback.riftlabs.xyz` namespace, wildcard DNS/TLS, Clerk setup and deployment configuration. The base-domain environment variable remains unset until infrastructure is ready; existing path-based links continue to work.


## Authentication journey correction

Public board authentication now uses `/auth/continue?intent=public&next=...` and returns immediately to the public screen without workspace onboarding or membership creation. Main-app authentication uses `intent=workspace` and reaches the dashboard or first-workspace registration. Registration completion is restricted to dashboard paths. Existing public users reuse their Clerk account when selecting My dashboard/Create a workspace; joining an existing team requires accepting a server-validated invitation. See `docs/product-flow.md` → Authentication journeys and `tests/auth-flow.test.ts`. Do not reintroduce unconditional onboarding after every Clerk signup.

## Account settings update

Settings → Account now uses the supplied Profile/Appearance/Settings/Danger zone layout with 13–14px variable Inter text. `saveAccountProfileAction` updates the authenticated Clerk user and matching application profile without modifying onboarding metadata. Photo uploads use Clerk's profile-image API. Email verification and available sign-in methods come from Clerk, not sample values. Personal theme is stored per browser and overrides public-board branding on dashboard screens; public board theme behavior remains workspace-controlled. The danger-zone action opens Clerk's secure account management. The mockup's 30-day deferred-deletion/anonymization promise is not shown because that backend policy is not implemented.

## Settings persistence added during the UI audit (6 November 2026)

`src/server/actions/settings.ts` now reads/writes workspace branding, workspace-level widget configuration, and the authenticated user's notification preferences using the existing tables. Branding and widget writes require admin/owner membership; preferences are bound to `requireAppUser()` and accept no caller-selected user ID. Branding name conflicts use the normalized-name check and the database uniqueness guard. Workspace image data URLs are limited to 500 KB in the UI (700,000 encoded characters server-side); an R2 upload path remains separate work.

`ProjectProvider` now waits for successful writes before committing settings, preserves editable state after a failed save, and offers retry/loading state. Notification saving has independent pending/error state. `getPublicWorkspace` passes saved widget configuration through the public layout/boundary. Portalled controls inherit the active workspace's color tokens; accent text has a separate readable dark-theme treatment.

The UI audit does **not** complete the remaining board/feedback persistence: creation, rename, reorder, feedback, comments, and voting still have client-state paths. Notification preference persistence also does not implement event delivery or a real notification feed. Verify these separately before production. Audit evidence and limits: `docs/ui-audit/README.md`.

The `/embed` server page now resolves `project`/`board` installation parameters against the public workspace rather than rendering the provider’s default workspace. The external loader has interruptible entry/exit, instant keyboard handling, reduced motion, and origin/source-checked accent/close messages. These changes do not replace the remaining feedback persistence work.

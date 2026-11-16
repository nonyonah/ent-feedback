# Chat and Conversations

Chat is an opt-in widget feature. Visitors can ask questions, reach the team,
receive replies, and review a suggested feature request before posting it.
The team inbox is `/dashboard/conversations`; administration is at
`/dashboard/settings/chat` (**Chat & knowledge**).

## Setup

1. Apply migrations through `0014_graceful_barracuda.sql` with `npm run db:migrate` before
   deploying this code. They add chat tables and settings without deleting existing content.
2. Set server-only `CHAT_ENABLED=true` to permit chat. Its default is `false`.
3. For AI replies, configure `CHAT_AI_BASE_URL`, `CHAT_AI_API_KEY`, and
   `CHAT_AI_MODEL`. The base must be HTTPS and OpenAI-compatible, ending at the
   API version (for example `https://your-provider.example/v1`), **not** at
   `/chat/completions`. The provider must support JSON-object responses and
   the `model`, `max_tokens`, and `temperature` chat-completions parameters.
   No model credentials enter a browser bundle. Missing configuration hands
   conversations to the team rather than inventing an answer.
4. Enable **Enable chat** and press **Save changes** in the workspace settings.
   The global flag and workspace setting must both be enabled. This also works
   in **Preview widget**. Reload an already-open embedded widget after enabling.
5. Under **Website knowledge**, enter a public HTTPS product or documentation URL and
   select **Sync website**. The assistant uses the stored public pages, current board
   feedback/comments, and optional answer overrides (up to 30). Re-sync after website
   changes. Set working hours, timezone and existing-member operators, then save.
6. Existing Sendbyte configuration (`SENDBYTE_API_KEY`, `EMAIL_FROM`) handles
   team handoff emails and visitor reply emails. The reply content uses the
   existing email layout. Inbound email replies are not implemented.
7. Keep the existing Netlify notification schedule enabled. It runs the
   authenticated `/api/internal/notification-jobs` maintenance endpoint every
   five minutes; manual invocation is `npm run jobs:run`. Chat delivery is an
   independent durable queue, so provider failures do not roll back messages.

No new dependency or external service is required for human-only chat.

### Slack

Use the existing `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, and
`INTEGRATION_ENCRYPTION_KEY` (32 random bytes encoded as base64). Enable incoming
webhooks in your Slack app and register the exact callback:

`https://<your-app-host>/api/integrations/slack/callback`

**Connect** opens Slack's own workspace/channel picker using only the
`incoming-webhook` scope. **Change channel** repeats that authorized selection;
there is no fabricated local channel list. See [Slack's incoming-webhook OAuth
instructions](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/).
A connected label appears only after a successful callback and decrypted,
validated connection. Other previously deferred integrations remain disabled.

Enable the event categories you want and save: human handoffs, visitor
follow-ups, new feedback, and status changes. Follow-ups are grouped into
five-minute buckets per conversation. No assistant-message or vote spam.
Disconnecting/reconnecting suppresses jobs for an old connection version.
Secrets are encrypted using workspace/provider-bound AES-GCM context.

## Data and access controls

- A server mints a separate 256-bit conversation bearer token and stores only
  its SHA-256 digest. Public workspace IDs and existing board visitor tokens
  do not authorize chat reads, writes, contact changes, search, or linking.
- Browser storage uses `ent-chat:<workspaceId>`, with try/catch and a memory
  fallback. Clearing storage loses that capability; there is no email-based
  conversation recovery in this release. Email contains no bearer token.
- Every public route checks workspace, conversation, token, and enabled flags.
  Every team action checks active workspace membership; FAQ, settings, and
  Slack administration require owner/admin permissions.
- The six chat tables enable RLS, with no permissive policies (default deny).
  The current Neon server role bypasses RLS; explicit service checks remain
  mandatory. Do not grant browser clients database credentials. Composite
  foreign keys prevent cross-workspace messages and request links.
- Contact email has its own PATCH endpoint. Saving it creates no message and
  does not trigger an AI generation. Team email delivery looks up current
  membership; visitor replies look up the current contact.
- No full messages, emails, or bearer tokens are logged. Job errors contain a
  generic delivery failure; payloads carry IDs rather than transcripts.
- Chat HTTP traffic has atomic IP/global budgets; visitor sends additionally
  have per-conversation, per-workspace, and global model budgets. IP identity
  trusts Netlify's injected header only when `NETLIFY=true`; other hosts use a
  shared fallback budget until their trusted address source is configured.

### AI boundaries

Sources are selected within one workspace, excluding deleted/merged feedback
and deleted comments. The current schema has **no private boards, hidden posts,
or internal comments**. All live boards/comments are public. If those visibility
models are added, update `approvedSources` and `similarRequests` predicates
before enabling them; do not assume the current predicates cover future fields.

Selection ranks query matches first, then public votes/recency, with bounded
candidate counts and ten final sources. Only title/body/status, imported public website text and FAQ content
are passed; authors, contact columns, attachments and other workspace data are
not selected. Email addresses, phone-like numbers and common credential formats
are scrubbed from free text. This is defensive redaction, not a guarantee of
recognizing every form of personal information in user-written text.

The adapter treats sources/history as untrusted JSON data. Runtime validation
requires bounded plain-text output, confidence, human-handoff decision and exact
supplied source IDs. Missing/forged IDs, invalid JSON, low confidence, unavailable
knowledge, provider errors, or the 15-second total deadline cause a fixed handoff.
A valid idea suggestion survives that handoff for explicit review. There are no
model-controlled tools or live browsing during replies, cross-workspace memory, automatic feature promises, or
AI-created requests/votes. As with any model, valid citations alone cannot prove
semantic correctness; evaluate the chosen model on your real FAQs before launch.

A database-locked generation lease allows one active reply per conversation.
A team reply/takeover/resolve clears the lease. Mode and lease ID are rechecked
before the model response is saved, so a stale response cannot overwrite a human.
An expired lease recovers to a persisted handoff on the next read/retry.

### Requests, polling and notifications

Suggestion review searches live feature requests across the workspace before
opening the existing editable creation form. Visible requests can be opened,
voted on through existing board permissions, or explicitly linked. A new request
and its conversation link are inserted in the same existing feedback transaction.
Existing feedback actor checks, attachment validation and submission behavior
(including the existing initial author vote) are preserved.

Messages use a server-generated sequence cursor, not browser timestamps. Clients
merge by message ID, fetch additional pages, and poll about every three seconds
only while open/visible, without overlapping requests. Errors back off to thirty
seconds and preserve the current messages/draft. Retrying a send reuses its
request ID. Closing an embedded widget sends a validated visibility message.

Jobs have event-level dedupe keys, fenced worker leases and capped retries with
backoff. Email provider idempotency keys persist across retries. Slack incoming
webhooks do not promise exactly-once transport: a lost provider acknowledgement
can cause a duplicate on retry, although duplicate application events cannot
create multiple jobs. Failed delivery does not affect conversation state.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run db:check`
- `npm run check:chat`: applies all migrations in a random temporary PostgreSQL
  schema and removes it in `finally`; real Clerk, model, Sendbyte and Slack
  transports are mocked. It uses a direct Neon connection and explicitly isolated table definitions; it never changes pooled session state. Public schema and real customer rows are not used.
- `npm run check:chat-ui`: real React/coss components with mocked backend data,
  mobile/desktop screenshots, light/dark modes, draft-preserving retries,
  reviewed creation, contact capture, team replies, storage restoration and
  polling shutdown. Requires a local Playwright installation; set
  `PLAYWRIGHT_MODULE` if it is outside the project. It downloads nothing.

Live provider/model evaluation and a real Slack OAuth round trip require your
credentials and are deliberately separate from these automated checks.

## Interface review

| Before | After | Why |
| --- | --- | --- |
| Feedback-only widget | Feedback and Live chat bottom navigation | Keeps both destinations easy to reach |
| No conversation inbox | Request-pane-style list and responsive detail | Reuses familiar grouping and mobile back behavior |
| Failed send could lose context | Inline error, retained draft and stable retry ID | Makes recovery local and prevents duplicate messages |
| Uncontrolled assistant handoff | Visible AI/team mode and explicit takeover/return | Keeps responsibility clear |
| Generic new-request action | Similar requests, editable existing composer, confirmation | Prevents automatic or duplicate request creation |

### Account connection regression

Application tables now explicitly name the `public` schema, so a transaction
pooler’s session `search_path` cannot send account reads to an absent temporary
schema. Drizzle Kit retains its existing default-schema snapshot representation;
no existing table is moved or recreated. CLI migrations use a direct Neon
connection (`DATABASE_MIGRATION_URL` can override it).

`node --import tsx scripts/check-db-qualification.mjs` reads account/workspace/chat
tables with `search_path=pg_catalog` and confirms the explicit qualification.
The auth continuation has a retry screen and sanitizes driver errors before SSR,
so SQL parameters containing addresses/account IDs are not logged by the error
boundary. Restart an existing dev server to refresh its cached connection pool.

TLS aliases `require`, `prefer` and `verify-ca` are normalized to `verify-full`,
preserving the installed pg driver’s existing certificate verification behavior.
Transient DNS failures are still network failures; they now have a safe recovery
state rather than a raw database error.

## Verification results — 16 November 2026

Passed: TypeScript, ESLint, migration consistency/no drift, the isolated chat
integration suite (including a never-responding model deadline), account schema
qualification, and the browser interaction/layout matrix. Visual evidence is in
[evidence](./evidence/results.json).

The additive migration was applied to the configured database. The production
build passed with `npm run build -- --webpack`; Turbopack encountered an internal
port-permission error in this execution environment, rather than an application
compile error.

No live AI or Slack calls were made. Current local configuration has Sendbyte
configured, but no chat model credentials, Slack client credentials, or integration
encryption key. `CHAT_ENABLED` remains off. Real-model grounding evaluation and
real Slack OAuth/delivery are pending those credentials. No GitHub push or app
deployment was performed.

### Workspace Slack settings

Connect Slack from **Settings → Integrations**. One workspace connection handles new feedback and status changes across all boards, plus live chat handoffs and visitor follow-ups. Each event has its own switch and preferences require Save changes. Disconnecting stops delivery for both boards and chat. Chat & knowledge only manages chat and approved answers; its saves preserve integration preferences, and integration saves preserve the chat toggle.

### Availability, operators and website knowledge

Team availability supports always available, away, or a same-day weekly schedule
in an IANA timezone (including daylight saving). It is a working-hours indicator,
not live presence or a guaranteed response time. AI remains available outside hours;
visitors can leave messages and contact details. Operators are existing active
workspace members selected for handoff/follow-up emails; current membership and
selection are rechecked at delivery. Slack remains a shared workspace channel.

Website sync imports at most 8 HTML pages from one HTTPS origin within 20 seconds,
with per-page size caps and a workspace rate limit. It honors robots.txt, excludes
login/account paths and query strings, rejects non-public IP destinations, and pins
the validated IPv4 address to each TLS request (including redirects). No cookies,
credentials or model-selected URLs are fetched. IPv6-only sites, JavaScript-only
content, private sites and separate documentation domains require a different public
source URL. Failed syncs leave the previous snapshot intact; Remove website removes
it from future answer retrieval. No automatic periodic re-crawl is configured.

`node scripts/check-chat-knowledge.mjs` checks schedule/DST edges, invalid operators,
public-address/URL validation, robots rules, sanitization and bounded same-origin
crawling without network requests. Database/browser suites also cover availability,
member selection and imported-source isolation. Live AI credentials remain required
for generated answers; website sync itself does not use a model or paid crawl service.

### Documentation and topics

Website and documentation have independent URL inputs, saved snapshots, refresh
and removal actions. Each imports up to 8 public HTML pages. Documentation can
be on another origin and crawling stays beneath the entered path; connect the
root URL for a documentation subdomain. A failed refresh preserves that source’s
previous content, and removing one source preserves the other.

Topics are detected from synced page titles/content and optional answers using a
bounded support vocabulary: Pricing, Account, Billing, How-to, Feature request,
Troubleshooting, Integrations, Security, Installation, and Data & exports. The UI
only shows topics evidenced by current sources. No extra model call is required.
New visitor messages automatically add matching topic tags to their conversation;
labels are visible in the team list/details and searchable through command search.
Existing conversations acquire tags on their next visitor message; no transcript
backfill is performed. Tags describe intent, not a product capability or commitment.

The assistant prompt asks for warm, patient, concise replies and actionable steps,
with no unsupported promises. Documented public pricing/policies may be explained;
personal billing/account changes, refund decisions and uncertainty go to the team.
Simple standalone greetings and thanks have friendly deterministic replies; factual
answers still require approved source IDs. Real-model tone/quality evaluation needs
the AI credentials and remains separate from mocked integration checks.

### Coss chat and widget navigation

Both widget and team conversation views compose the official coss chat registry
sources: ChatConversation, ChatMessage, message bubbles/layout/text, date pills,
typing indicator and useChatScroll. Plain-text input uses the existing coss
Composer, adapted once through ChatComposer so draft retention, server mutations,
idempotency, contact capture and handoffs stay application-owned. `motion@14.0.0`
is the registry’s runtime dependency. Icons remain Hugeicons. No demo messages,
reaction controls, synthetic receipts or moderation permissions were installed.

The widget has bottom navigation with Feedback and Live chat: persistent text
labels, 56px minimum destination targets, a selected icon pill, semantic Base UI
tabs within a navigation landmark, keyboard focus and safe-area padding. Panels
stay mounted to retain drafts; chat polling and scroll tracking pause when inactive.
Navigation uses color transitions only and honors reduced motion. Bubble history
is not replay-animated; typing motion respects the system’s reduced-motion setting.

Sources: [coss Chat UI](https://coss.com/ui/docs/chat),
[chat registry](https://coss.com/ui/r/chat.json),
[Material 3 navigation bar](https://m3.material.io/components/navigation-bar/overview).

| Before | After | Why |
| --- | --- | --- |
| Separate hand-built widget and dashboard messages | Shared coss chat composition with Ent tokens | Consistent layout, timestamps and scrolling |
| Top Feedback/Chat segmented control | Icon-and-label bottom navigation | Keeps destinations easy to reach within the widget |
| Different message inputs | Shared coss Composer with draft-preserving retries | Consistent sending and recovery behavior |

## Human support release: images, emoji and Slack threads

- AI replies remain disabled by `CHAT_AI_REPLIES_ENABLED` on the server.
- Chat composers share the existing feedback `ComposerTools`: emoji search, up to three PNG/JPEG/WebP/GIF images (2 MB each), image previews and removal. Drafts and uploaded IDs survive send retries. The widget has a one-row compact composer.
- Images are re-encoded to WebP and stored privately in R2. Chat snapshots return seven-day signed image links. Possession of a link grants access until expiry; links must not be placed in analytics or logs. `CRON_SECRET` signs these links; rotating it invalidates old links. Unsent uploads expire after 24 hours and are reclaimed by maintenance.
- Available teammate avatars come from active workspace members selected as operators in Chat settings, within the configured availability schedule. This is scheduled availability, not device-online presence. Away teams show “Leave us a message”.
- Slack uses one thread per conversation or feedback post. Board alerts include Feedback, Bug or Feature request. Emoji and image attachments appear in the thread. Replies by active Ent workspace members (matched to their Slack profile email) import as team messages/comments; outsiders, bots, disconnected integrations and unrelated threads cannot reply into Ent. Standard Slack emoji shortcodes convert to Unicode. Custom Slack emoji are not mirrored as arbitrary remote images.
- Signed Slack events are durably deduplicated by event ID and queued before acknowledgement. An `after` callback attempts delivery immediately; scheduled maintenance retries failed jobs. Slack chat replies notify the visitor without echoing a second bot message into the same thread.

### Slack app configuration required

1. Add bot scopes: `incoming-webhook`, `chat:write`, `channels:history`, `groups:history`, `users:read`, `users:read.email`, `files:read`.
2. Under **Event Subscriptions**, enable events and set Request URL to `https://ent.riftlabs.xyz/api/integrations/slack/events` after deploying this route. Subscribe to bot events `message.channels` and `message.groups`.
3. Add the Slack app **Signing Secret** as `SLACK_SIGNING_SECRET` to local and hosting environment variables. Never paste it in chat or commit it.
4. Reinstall/reconnect Slack from Ent → Settings → Integrations to grant the new scopes and save the Slack team ID. Invite the bot into the selected channel, including private channels. Enable the board and chat delivery switches that you need.
5. Use the same email address in Ent and Slack for teammates who will reply. Only active Ent members can send replies through Slack. Files currently support up to three images under 2 MB each.
6. In Slack → **Interactivity & Shortcuts**, turn on Interactivity and set its Request URL to **https://ent.riftlabs.xyz/api/integrations/slack/events** (the same endpoint as Event Subscriptions). Save. No additional OAuth scopes are needed for these buttons.
7. Test one board post and one live chat, then reply in each Slack thread with text, an emoji and an image. Verify the replies appear in the corresponding board/widget and dashboard.

Reference: [Slack Events API](https://docs.slack.dev/apis/events-api/), [request verification](https://docs.slack.dev/authentication/verifying-requests-from-slack/), [chat.postMessage](https://docs.slack.dev/reference/methods/chat.postMessage/).

### Verification

`node scripts/check-chat-db.mjs --support` runs the human-support/Slack integration checks in an isolated temporary database schema, with provider transports mocked. The earlier AI test file is retained for the later AI release; it is not the human-support release test.

## Widget design follow-up

The widget shell and its feedback/chat screens were reviewed with better-interface, better-layout and emil-design-eng. See [the scoped interface review](../widget-interface-audit/README.md) for findings, implemented corrections, verification and boundaries. The public workspace response now includes chat availability so bottom navigation does not wait for a second client request.

### Conversation continuity and recovery

- Inbox timestamps show Now, minutes, hours, then days; their full date is available on the time element. Labels refresh every 30 seconds.
- The widget restores its workspace-specific conversation capability from local storage and reloads message history after a page refresh. A loading skeleton keeps the composer anchored during restoration. New chat explicitly starts a separate conversation. Browser storage must be available; clearing it or using a different browser does not restore the anonymous session.
- Persistent errors use the shared themed ErrorNotice with an icon and nearby recovery actions. Existing action-result toasts remain in place; polling failures do not repeatedly trigger toasts.
- Browser regression checks cover reopening and full page reload, history restoration, continuing without creating a second session, relative timestamps, retained drafts after send failure, and both widget themes at 320–1440px. Providers remain mocked in this suite.

### Live chat status controls in Slack

Live-chat notifications include **In progress**, **Queue**, and **Resolve** actions, excluding the status already shown on that message. Resolving can be reversed with In progress; Queue returns the conversation to the queue. These actions update the same conversation record read by the dashboard and widget. Status commands are never inserted as visitor-facing chat messages.

The signed interactivity payload is queued before acknowledgement. The handler checks the Slack team, mapped conversation thread, allowed channel, active connection and the clicking user’s active Ent membership. Apply receipts and notification jobs commit together, so duplicate delivery cannot replay an old status over a newer action. Inactive members and outsiders cannot change the conversation.

Direct Slack actions post confirmation in the thread even if passive **Status changes** notifications are disabled. That settings switch controls unsolicited status notifications from Ent. A new visitor or team reply reopens a resolved conversation as usual. Earlier Slack messages do not acquire new buttons retroactively; start or follow up on a conversation after deployment to get the controls.

Setup reference: [Slack interactivity](https://docs.slack.dev/interactivity/handling-user-interaction/) and [block actions](https://docs.slack.dev/reference/interaction-payloads/block_actions-payload/). The live Slack app configuration and end-to-end click test remain required after deployment.

### Ent’s own support widget

`SupportWidget` is mounted once in the root app layout. It uses the standard `/widget.js` loader and sends feedback and chats to **elf-workspace → Product feedback (`product`)**, independently of the dashboard’s currently selected workspace. It appears on the landing page, pricing and all dashboard routes, for both signed-out visitors and signed-in customers. Auth, onboarding, public boards and embeds are excluded to avoid duplicate or nested widgets.

Optional build-time overrides: `NEXT_PUBLIC_SUPPORT_WORKSPACE_SLUG` and `NEXT_PUBLIC_SUPPORT_BOARD_SLUG`. Their defaults are elf-workspace/product, so the deployment works without adding environment variables. Public slugs only; never supply private tokens here. Enable chat in the support workspace’s settings if you want the Live chat destination.

The widget’s host-visibility event closes it without stealing focus when navigating to an excluded route. Returning to the dashboard reuses the existing iframe and conversation instead of creating another loader. The root integration is not conditioned on Clerk’s signed-in state. It does not automatically pass the host account’s name, email or authentication tokens into the anonymous chat session.

Public Mintlify guides now cover live chat, availability/operators, conversation restoration and Slack status buttons. The existing Conversations and votes guide remains focused on feedback discussions.

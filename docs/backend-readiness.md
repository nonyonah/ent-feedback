# Backend verification — 6 November 2026

## Completed in this pass

- Public board, comment/reply and embedded-widget image submissions upload binary multipart data to R2 before saving. Drafts retain local previews if upload or save fails. Cached attachment IDs survive a lost mutation response, so a retry does not upload the same file again.
- The server decodes and re-encodes accepted PNG/JPEG/WebP/GIF files as WebP, limits bytes and pixels, and associates attachments with the authenticated uploader or workspace-scoped guest actor. Only attached images with a visible parent are served. Pending uploads expire after 24 hours.
- Expired pending uploads are deleted by maintenance; their rows remain retryable if R2 deletion fails. This cleanup does not remove attached images.
- Follows, the inbox, notification preferences and retryable Sendbyte jobs are connected. The worker checks preferences and recipient details again immediately before delivery.
- `npm run jobs:check` reports configuration presence and job counts without changing records or sending email. `npm run jobs:run` processes a small notification batch and expired-upload cleanup. The latter can send real notification emails.
- A random local `CRON_SECRET` was generated without displaying it. It is ignored by Git along with `.env.local`.

## Evidence

Passed:

- `node scripts/check-upload-client.mjs`: multipart upload, account-scoped cache, rejected URL inputs and retry after upload failure.
- `node scripts/check-upload-db.mjs`: real PostgreSQL, mocked storage and Clerk; ownership, origin checks, pending privacy, idempotent attachment association, expiry cleanup and visibility after parent deletion. Fixture transaction rolled back.
- `node scripts/check-notification-db.mjs`: real PostgreSQL with mocked email; events, retries, deduplication, preferences and unfollowing before delivery. Fixture transaction rolled back.
- `node scripts/check-email.mjs` and `node scripts/check-notification-route.mjs`: mocked email transport and scheduler authorization.
- Actual browser components/provider with mocked server boundaries: image failure retains the draft, lost save response creates one post on retry, attachment upload is reused, follows survive reload, the following list loads and notifications can be marked read. Temporary harness: `/tmp/ent-audit/backend-ui.cjs`.
- Live guest end-to-end test against the local production app, real PostgreSQL and R2: public feedback with an image, persisted reload, browser image decoding and a saved comment. The temporary workspace, guest actor, post, comment and R2 object were removed afterward. No Clerk account or notification recipient was created. Retained opt-in test: `scripts/check-live-public.mjs`. It requires Playwright (or `PLAYWRIGHT_MODULE` pointing to an installed module), a running local production server and configured database/R2 credentials.
- Live R2: unique one-pixel image written, read, deleted, then confirmed unavailable. `node scripts/check-r2.mjs` is opt-in and touches object storage.
- One user-authorized test email: Sendbyte confirmed acceptance. Recipient inbox confirmation is separate; provider acceptance is not an inbox-delivery guarantee. Automated tests send no email.
- TypeScript and targeted lint.
- Optimized production build: `npm run build -- --webpack`. Turbopack's CSS worker hit an environment permission error when binding a local port; webpack completed compilation, types, all 37 static pages and traces. Incompatible `runtime` route exports were removed to follow this installation's Cache Components rules.

## Deployment and manual checks still required

Hosting is undecided, so no persistent scheduler or deployment has been created. After choosing a host:

1. Set the production environment variables and apply the checked-in migrations.
2. Schedule `npm run jobs:run` once per minute from the project directory on a Node server with dependencies installed. Alternatively, an HTTP scheduler may POST to `/api/internal/notification-jobs` with the configured Bearer secret for notification delivery; expired-upload cleanup still needs the maintenance command. Never expose the secret in client code or put it directly in crontab history.
3. Verify production Clerk return URLs, tenant DNS/TLS if enabling workspace subdomains, and one complete signed-out → public feedback → sign-in → dashboard onboarding journey.
4. Exercise the widget in an actual third-party app with restrictive storage settings.

The guest flow has a live browser-to-server check. Authenticated UI checks still use mocked Clerk/server boundaries and do not establish a complete live Clerk sign-up/onboarding journey.

## Remaining product/backend limitations

Board lists are currently loaded as a complete dataset and sorted/filtered in the client. Cursor pagination is implemented for the notification inbox, not the main feedback dataset. Comments accept a validated parent ID server-side; the conversation UI remains flat. Merge is rejected explicitly rather than returning a false success. Automatic live refresh, anonymous-to-account vote reconciliation and a general data-retention/account-deletion policy remain separate work.

Integrations, custom domains, and team/role management remain disabled for v1. Internal owner authorization and platform workspace subdomains remain intact.

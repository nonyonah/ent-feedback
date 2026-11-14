# Trial billing emails

Trial-started confirmation and one reminder three days before expiry use the existing `emailLayout`: plain background, logo-only header, 10px charcoal button, existing typography, dark-mode styles and text alternative. These are transactional billing notices to current active workspace owners, separate from optional lifecycle campaigns and feedback preferences.

Verified subscription webhooks enqueue jobs in the same transaction as billing reconciliation. Deduplication is per subscription/recipient/kind; ending reminders also include the trial end date. A trial extension gets a new reminder date without a second start confirmation. Cancellation does not produce a misleading charge warning: delivery checks the fresh Bachs snapshot and uses cancellation-specific copy. Ended/paid trials, changed subscriptions, former owners and obsolete reminder dates are suppressed. No raw email address is stored in the job payload.

The worker uses existing database leases, bounded batches, retry/backoff and stable Sendbyte idempotency keys. Delivery does not hold a database transaction open. Errors retain sanitized summaries only. The existing maintenance endpoint and CLI now process trial emails; HTTP processing leaves execution time for cleanup and defers trial jobs when the request budget is nearly exhausted.

## Netlify schedule

- `notification-schedule` runs every five minutes on the published deploy.
- It authenticates a background-function invocation, avoiding Netlify's 30-second scheduled-function limit.
- `notification-maintenance` verifies the bearer secret before calling the existing protected Next maintenance endpoint. That bounded request has a 55-second caller timeout.
- Set `CRON_SECRET` in Netlify's **Functions runtime** scope, matching the Next route. `URL` supplies the deployed origin; `NEXT_PUBLIC_APP_URL` is the fallback. Sendbyte credentials and sender must also be available to the Next runtime.
- Keep the older Cloudflare scheduler disabled to avoid duplicate scheduling.
- After deployment, check **Functions → notification-schedule** for its Scheduled badge and run it once. Inspect background and maintenance logs for accepted/suppressed/retried counts. No paid plan was activated by this change.

References: [Netlify scheduled functions](https://docs.netlify.com/build/functions/scheduled-functions/), [background functions](https://docs.netlify.com/build/functions/background-functions/).

## Verification

Passed: six email/lifecycle template unit cases; six scheduler/trial-template cases; mocked Sendbyte transport checks including retry-key reuse, HTML escaping and safe failures; TypeScript and targeted ESLint. Eight local email previews are in `/tmp/ent-email-previews/index.html`.

**Blocked:** the new rollback-only trial-email PostgreSQL tests and the final billing regression could not connect to Neon because its hostname returned `ENOTFOUND`, including retries outside the sandbox. These tests have not passed for the email-queue addition. Earlier trial-claim/billing/prepaid database tests passed before email enqueueing was added. No live trial email or deployed schedule invocation was sent/tested in this change. Real inbox verification and the database regression remain release checks.

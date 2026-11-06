# Sendbyte email delivery

Sendbyte replaces Resend for application email. Clerk continues to manage authentication email independently.

Set these values in `.env.local` and your hosting provider's environment:

```dotenv
SENDBYTE_API_KEY=
EMAIL_FROM="Ent <notifications@your-verified-domain>"
```

Never expose the API key with a `NEXT_PUBLIC_` prefix or commit it. Restart the development server after adding environment variables. A live key requires a verified sending domain; a sandbox key simulates delivery. See the [official Sendbyte quickstart](https://docs.sendbyte.africa/).

`src/server/email.ts` sends through `POST https://api.sendbyte.africa/v1/emails`, with a 15-second timeout and a stable `idempotency_key` for retries. A successful response must contain an email ID. Acceptance confirms that Sendbyte accepted the request; it does not prove inbox delivery. Provider response bodies and credentials are excluded from application errors.

Run `node scripts/check-email.mjs` for mocked transport checks. This test sends no email. Live delivery still needs credentials, a verified sender, and a separate delivery check. Notification job processing is not established by switching providers. Team invitations remain disabled for v1.

## Notification worker

Feedback creation, comments, votes, comment reactions and status changes create recipient-specific inbox entries and email jobs transactionally. Retried submissions do not create another inbox entry. The worker rechecks current preferences, current email and post visibility; status updates also require an active follow.

Schedule a server-side `POST /api/internal/notification-jobs` once per minute with `Authorization: Bearer <CRON_SECRET>`. Set `CRON_SECRET` to a random value of at least 32 characters in the application and scheduler. Scheduling depends on the chosen host and is not configured automatically. Never call the endpoint from browser code. The route rejects requests when its secret is absent.

Each run claims up to three jobs using database row locks and `SKIP LOCKED`. A ten-minute lease allows recovery after interruption. Attempts are capped at five, with exponential retry delays. The stable Sendbyte idempotency key prevents an ambiguous provider response from producing duplicate email. Missing email configuration leaves jobs unclaimed. Failed jobs remain available for inspection; they are not silently deleted.

`node scripts/check-notification-db.mjs` tests the worker against PostgreSQL with a mocked email transport and rolls back all fixture rows. It sends no email and does not process real queued jobs.

## Host-independent maintenance

`npm run jobs:check` is read-only. `npm run jobs:run` processes notification email and expired pending attachments, and prunes expired request counters. Run it from the project directory with production environment variables and dependencies installed. Schedule it once per minute after selecting a host. Overlapping workers use database locks and leases; they do not claim the same pending email job.

A local scheduler secret has been generated in `.env.local`; set it separately in the deployed app and HTTP scheduler. No persistent scheduler is installed while hosting is undecided. The notification HTTP route handles one job per call within its execution budget; storage cleanup is available through the maintenance command.

The opt-in `node scripts/send-test-email.mjs --to recipient@example.com` sends a real email. It is not part of the test suite. A single authorized smoke test was accepted by Sendbyte on 6 November 2026; inbox delivery still requires recipient confirmation.

# Lifecycle email and delivery verification

Implemented 11 November 2026. The public documentation is drafted and pushed separately; this file records internal email operations.

## Templates and approved schedule

| Email | Eligibility | Timing | Frequency |
| --- | --- | --- | --- |
| Welcome | Newly registered application account with a verified email | Next scheduler tick after registration | Once per account; expires after 24 hours if not processed |
| Finish setup | Workspace onboarding started but not completed | After 24 hours | Once per account |
| Create a board | Owns a workspace and has no board in any owned workspace | After 3 days from enrollment/workspace creation, whichever is later | Once per account |
| Return to Ent | Owns a workspace; no authenticated app activity for 30 days | After 30 days | Once per account, not every month |
| Get more from your board | Existing-user tips draft | Not automatically scheduled | Draft only |
| Reply / activity | Existing recipient and notification preference rules | Next scheduler tick | Per deduplicated event |

The schedule was approved by the user. “Existing users” does not trigger a retroactive bulk welcome campaign. Existing accounts enroll on their next authenticated app visit, with welcome disabled. Public-board-only participants are excluded from workspace setup, board and inactivity reminders unless they start creating their own workspace. Clerk still sends authentication email.

Templates are in `src/server/emails/templates.ts`: charcoal buttons, neutral surfaces, system-safe font stack, responsive table layout and plain text alternatives. No tracking pixels or open/click tracking are added by the application. Activity emails now use the same layout. The provider account's own tracking configuration should be reviewed separately.

Generate credential-free previews:

```sh
node --import tsx scripts/preview-emails.mjs
```

Open `/tmp/ent-email-previews/index.html`. Six previews cover the five lifecycle drafts and a reply notification. Browser checks at 320px and 600px passed for all six. This does not certify Outlook, Gmail or Apple Mail rendering.

## State and sending

Migration `0009_luxuriant_morg.sql` creates `lifecycle_email_state` and was applied to the configured development database. Apply it on other environments before deploying the auth changes.

Authenticated requests update activity timestamps. Workspace setup and completion update separate lifecycle markers. Email jobs contain a user ID and message kind, not a copied address. The worker resolves the current verified address and rechecks opt-out, ownership, board creation and setup completion immediately before sending. Retry keys remain stable across attempts. Database claims use row locks, a ten-minute lease and attempt fencing. Jobs are bounded to five attempts. Provider acceptance is not proof of inbox delivery.

Configure on the application server:

```dotenv
LIFECYCLE_EMAILS_ENABLED=false
EMAIL_UNSUBSCRIBE_SECRET=
```

Use a separate random secret of at least 32 characters for unsubscribe signatures. Set `LIFECYCLE_EMAILS_ENABLED=true` only when sender configuration, the migration and the scheduler are ready. Defaults remain disabled; this implementation does not start a background campaign merely by deploying code.

Every lifecycle message has a signed opt-out link. GET shows confirmation without changing state, preventing mail-scanner visits from unsubscribing someone. POST records the opt-out. It is separate from feedback notification preferences. Tokens and email links must not be logged. Rotating the unsubscribe secret invalidates old links, so rotate only deliberately.

## Cloudflare scheduler

`tools/notification-scheduler` is an isolated Worker that calls the existing application maintenance endpoint every minute. This schedules the current Next.js backend without pretending its business services have already migrated to Workers. It holds only the scheduler secret, never database or Sendbyte credentials.

The Worker is disabled by default and has no public HTTP endpoint. It permits only an HTTPS origin, refuses redirects to prevent leaking the bearer secret, has a 55-second timeout and logs only success/status or a generic failure. Its Cloudflare-generated types and TypeScript project are isolated from the application's DOM types.

```sh
cd tools/notification-scheduler
npm ci
npm run types
../../node_modules/.bin/tsc --noEmit -p tsconfig.json
npm run check
npx wrangler secret put CRON_SECRET
```

Use the same strong `CRON_SECRET` as the deployed app. Confirm `APP_ORIGIN` is the deployed app's origin, then set `ENABLED` to `true` in `wrangler.jsonc` and run `npm run deploy`. Do not enable against a missing or protected preview endpoint. No Worker has been deployed by this implementation.

The app endpoint discovers at most three due lifecycle recipients and processes one activity job and one lifecycle job per request. This is deliberately bounded for the current execution budget. Monitor pending age; higher-volume delivery needs a queue/worker capacity increase. HTTP 503 signals missing provider configuration or maintenance failure; Cloudflare cron does not replace each email job's own retry mechanism.

## Verification

- 56 Node tests passed, including schedule boundaries, public-only exclusions, signed unsubscribe and Cloudflare dispatch validation.
- Sendbyte mocked transport checks passed: stable idempotency keys, HTML escaping, bounded timeout, acceptance receipt validation and safe provider errors.
- Unsubscribe route checks passed: scanner-safe GET, signed POST, invalid tokens, cache/referrer headers and safe failure response.
- Maintenance route checks passed: missing, weak and incorrect secrets rejected before worker access.
- PostgreSQL lifecycle fixture tests passed: discovery/deduplication, retries, setup completed before delivery, board created before delivery, inactive discovery and opt-out before delivery. Fixture rows rolled back; email transport mocked.
- Cloudflare deployment dry run passed; no Worker was deployed.
- Twenty-four browser HTML-preview checks passed across light/dark at 320px and 600px; no horizontal overflow, broken logo images or unnamed links.
- One real Sendbyte **sandbox** request returned HTTP 201, message ID `456b68dd-1b71-4ed5-a2f7-51f99be25e37`. It simulated a reply notification; no real inbox delivery occurred.

Commands:

```sh
node --conditions=react-server --import tsx --test tests/*.test.ts
node scripts/check-email.mjs
node scripts/check-email-unsubscribe.mjs
node scripts/check-notification-route.mjs
node scripts/check-lifecycle-email-db.mjs
```

The database check requires development database access and rolls its fixtures back. It must never be used as a live email delivery check.

## Real inbox acceptance — confirmed 11 November

The configured sender `team@ent.riftlabs.xyz` was rejected with HTTP 403. The live provider account had verified `riftlabs.xyz`, but had not registered the `ent.riftlabs.xyz` sender subdomain.

One retry used `Ent <team@riftlabs.xyz>` as a temporary process-level override, leaving the saved sender unchanged. Sendbyte accepted it with HTTP 201, message ID `41a42ac4-b296-4119-a727-ab2b1c282136`, the provider subsequently reported `status: delivered`, `sandbox: false`, with `email.sent` and `email.delivered` events, and the authorized recipient explicitly confirmed **Arrived in inbox**. This proves one live test reached the mailbox; it does not yet prove recurring scheduling, every preference or every email-client rendering.

A subsequent read-only readiness check found the saved sender updated to `riftlabs.xyz`, verified by the live provider account. Sender readiness now passes. Scheduled delivery remains disabled until deployment and scheduler activation. Run `node scripts/check-email-readiness.mjs` to check the configured sender without sending mail. Parent-domain verification does not automatically register the sender subdomain.

### Remaining acceptance checks

1. Verify the sender domain in Sendbyte (SPF, DKIM and any required return-path records); review DMARC alignment.
2. Put the live key and verified sender in `.env.local`; keep credentials out of chat and Git.
3. After confirmation, send one reply test with `scripts/send-test-email.mjs --to <confirmed-recipient> --reply`. The `--sandbox-only` flag deliberately refuses live keys and is only for sandbox checks.
4. Record the provider message ID and actual delivery/bounce result. Provider API acceptance or a sandbox “delivered” event is insufficient.
5. Confirm arrival in the recipient's mailbox, including spam/promotions. Inspect SPF/DKIM/DMARC results and rendering in the received message.
6. Exercise a real preference-aware reply fixture, opt out of lifecycle mail, and confirm future lifecycle jobs are suppressed while permitted reply notifications continue. Use dedicated test accounts.

References: [Sendbyte sandbox](https://docs.sendbyte.africa/sandbox), [Sendbyte signed delivery events](https://docs.sendbyte.africa/guides/webhooks), [Cloudflare cron triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/).

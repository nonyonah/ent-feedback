# Release follow-up — 10 November 2026

Data export is **deferred by request**. Its Coming soon presentation and entitlement remain; it is not counted as an active implementation task.

## Completed locally

- Read-only configuration audit: `npm run production:check`. Prints check names and verdicts only; never secret values. A nonzero exit is expected with local/test credentials. Provider account identity, product settings and actual delivery still require verification.
- Expanded rollback-only PostgreSQL billing fixtures for payment failure/recovery, scheduled cancellation and resuming, stale events resolved against current provider state, and organization mismatch rejection. Existing trial, renewal, owner scope, deduplication, board limits and no-repeat-trial checks remain.
- PostgreSQL notification fixtures passed: transactional events, deduplication, preference checks, delivery retries, unfollow-before-send and duplicate-processing protection. Transport is mocked; all fixture rows roll back.
- Sendbyte mocked transport checks passed. Worker HTTP route rejects missing/weak/incorrect authorization before invoking the worker.
- Read-only queue check: email configuration and scheduler secret present, zero queued jobs at the time of inspection. No real notification jobs were processed.
- 42 Node tests passed, targeted lint passed, TypeScript passed and schema consistency passed.
- Responsive application fixtures: 24 visits (dashboard, public board and Billing Free/trial at 320/768/1440 in light/dark), no horizontal overflow, browser exceptions or sampled contrast failures.
- Added `/privacy` and `/terms` for Rift Labs, Nigeria, with `nonyonah@gmail.com` as the public contact. Marketing footers and Clerk appearance link to them. Added footer wrapping so the extra links fit on mobile.

## Decisions and external checks still required

1. **Host:** Cloudflare selected for the backend. Brimble supports Next.js web-service and static deployments; see [the compatibility assessment](../deployment/cloudflare-brimble.md). Cloudflare Workers can host backend code and Cron Triggers can schedule notification processing. Hosting the whole Next.js app requires an adapter compatibility/build check; alternatively a separate scheduler Worker can call the existing authenticated notification endpoint while Next.js runs elsewhere. No Cloudflare resources, deployments or schedules have been created.
2. **Production configuration:** local origins and Clerk/Bachs test keys correctly fail `production:check`. Use a permanent HTTPS origin and live provider accounts/products for release. Presence checks for email/storage do not verify ownership, isolation or delivery.
3. **Real billing acceptance:** repeat portal cancellation, renewal and payment recovery against provider sandbox sessions. The lifecycle database checks use a mocked provider and do not establish the hosted portal’s behavior. Do not cancel an existing user subscription as a test.
4. **Email scheduling/delivery:** deploy the worker schedule and confirm a message in the intended inbox. Sendbyte acceptance is not inbox delivery. The user’s preference remains sandbox testing; no live sender migration was made.
5. **Legal review:** policy copy reflects inspected application flows and the supplied operator identity. Confirm the operator’s full contact/business details, provider processing locations and safeguards, retention/deletion handling, taxes and refund practices before release. Do not describe this as legal compliance certification.
6. **Accessibility depth:** native mobile browsers and actual screen-reader reading/focus behavior require manual acceptance. Borderless public composer focus treatment remains as explicitly requested; the public-board audit added focused-label cues while keeping those fields outline-free. Validate that treatment with assistive technology.
7. **Operations:** deployment-host production build, backups/restore, failed-job monitoring and billing reconciliation remain operational checks.

Privacy notice reference: [NDPC guidance on the Nigeria Data Protection Act](https://ndpc.gov.ng/wp-content/uploads/2025/03/NDP-ACT-GAID-2025-MARCH-20TH.pdf), especially information provided to data subjects and rights. Product-specific descriptions come from this repository; the copy does not invent fixed deletion timelines, certifications or additional tracking.

Additional browser verification passed: landing, pricing, Privacy and Terms at 320/768/1440 in both themes (24 visits, no overflow or runtime errors). Keyboard billing-tab selection, composer autofocus, Escape/focus restoration and persistent error-toast dismissal also passed. Native screen-reader testing remains distinct from these browser checks.

Next session: [11 November task list](../production-review/README.md#tomorrow--11-november-2026), including Mintlify documentation and PostHog/Mixpanel selection. The latest public-board fixture matrix passed 48 scenarios plus 11 interaction checks; the Node suite now has 43 passing tests.

## Latest gate

See [11 November production gate](2026-11-11.md) for billing lifecycle tests, the expanded mobile/WCAG matrix, runtime headers, storage and the remaining release blockers. This supersedes older test counts and email-delivery status above. Production rollout is still on hold.

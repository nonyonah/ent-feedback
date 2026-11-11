# PostHog — 11 November 2026

Ent uses the browser `posthog-js` SDK with explicit events. PostHog is optional: missing configuration, blocked storage, SDK loading failure or rejected consent must not interrupt product actions.

## Configuration

Add the **project token**, not a personal API key, to `.env.local` and the hosting provider:

```dotenv
NEXT_PUBLIC_POSTHOG_KEY=your_project_token
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_POSTHOG_ENABLE_IN_DEVELOPMENT=false
```

Use `https://eu.i.posthog.com` for an EU project. Public variables are bundled at build time: restart development after changes and rebuild deployed assets. Enable the development flag explicitly for local testing; events include `environment=development` or `environment=production`. This flag does not bypass consent. Use separate PostHog projects for isolated test/production data when available, or filter every dashboard by environment.

The local configuration has development collection enabled for testing. `.env.local` remains ignored by Git.

## Collection and privacy

- The SDK is dynamically imported only after opt-in. Default and rejected consent produce no PostHog requests.
- Visitors can change their choice in the marketing footer, Privacy page or Account → Privacy. Consent is browser/origin-specific and synchronized across same-origin tabs. Do Not Track and Global Privacy Control keep analytics off by default. The card still appears and an explicit Allow analytics choice acknowledges the signals currently present. A newly enabled, unacknowledged signal blocks collection again. Declining clears that acknowledgement.
- Autocapture, automatic pageview/pageleave events, session recording, surveys, exceptions, performance capture, feature flags/remote configuration and external extensions are disabled.
- Custom page names are bounded categories, not raw paths. A final `before_send` allowlist removes SDK-added URLs, queries, referrers, page titles and person-profile fields as well as unknown properties/events. Essential SDK token, browser/session IDs, the hashed account identifier after sign-in, identity-linking metadata and library version remain. Person-property payloads are removed.
- After consent and Clerk authentication finish loading, a namespaced SHA-256 hash of the Clerk account ID is passed to `identify`, without names, emails or the raw Clerk ID. Identified-only person profiles let the same consenting account be recognized across devices. The consenting guest session can be linked on sign-in. Sign-out and account switching reset the browser identity before further events; auth-loading events are dropped. Customer workspace IDs are not sent.
- Feedback content, names, emails, attachments, board/workspace names and payment details are not event properties. Attachment presence is a boolean only.
- `/embed` and `/widget-preview` routes do not collect or prompt, even when consent exists. The loader does not instrument the host website. Embedded widget adoption therefore remains a separate future measurement decision.
- Configure PostHog's **Discard IP data** project setting and review retention, access and region in the PostHog dashboard. An outbound property allowlist does not prevent the receiving service from seeing network metadata. The privacy notice describes this optional service; legal review remains part of release acceptance.

## Events

| Event | Successful trigger | Properties |
| --- | --- | --- |
| `page_viewed` | Consented initial page / client navigation | `page`, `environment` |
| `workspace_created` | Workspace creation succeeds in either setup flow | `environment` |
| `onboarding_completed` | Server confirms registration completion | `environment` |
| `board_created` | Additional board creation succeeds | `surface`, `environment` |
| `feedback_submitted` | Feedback mutation succeeds | `surface`, `feedback_type`, `has_attachment`, `environment` |
| `comment_submitted` | Comment/reply mutation succeeds | `surface`, `is_reply`, `has_attachment`, `environment` |
| `vote_changed` | Vote mutation succeeds | `surface`, `active`, `environment` |
| `checkout_opened` | Overlay opens successfully | `interval`, `environment` |
| `checkout_returned` | Overlay emits checkout completion | `interval`, `environment` |

`checkout_returned` is **not** a confirmed subscription or revenue event. Bachs webhooks and database entitlements remain authoritative. Server-confirmed billing analytics would need a separate consent/identity design. Every event includes `auth_state=guest` or `auth_state=signed_in`. Events blocked before consent or while authentication is loading are not queued or replayed later. Analytics is best effort and never an audit log or billing ledger.

Suggested initial dashboards: landing → pricing → auth → onboarding completion, workspace → first feedback, board creation usage, comments/replies/votes, and checkout opening → return. User counts cover consenting accounts/browsers only, and checkout returns must not be labeled paid conversions.

## Verification

```sh
PLAYWRIGHT_MODULE=/path/to/playwright node docs/analytics/evidence/check.cjs
node --conditions=react-server --import tsx --test tests/*.test.ts
npm run typecheck
```

The browser fixture uses the **real SDK**, a fake token, and intercepted transport. It checks no collection before consent or after rejection/withdrawal, successful explicit-event transport with token intact, removal of content and URL fields, mobile consent layout, excluded embeds and Global Privacy Control. It bypasses the SDK bot filter for the automated browser and disables request batching/compression only in the fixture to make payload assertions deterministic. It never sends to a real PostHog project. See `evidence/results.json` for the observed results.

For account-side verification: restart `npm run dev`, visit Ent, allow analytics, create a board or submit feedback, then find the corresponding development event in PostHog's live events view. Decline analytics and repeat: no further event should arrive. Real project ingestion and dashboard configuration require this acceptance step; the fixture does not establish account-side ingestion.

References: [PostHog Next.js integration](https://posthog.com/docs/libraries/next-js), [browser SDK](https://posthog.com/docs/libraries/js), [data collection controls](https://posthog.com/docs/privacy/data-collection). Installed SDK types/source were checked for consent, final event filtering and remote-configuration settings.

Observed local checks: Real-SDK browser assertions passed with intercepted transport and no browser errors; 45 Node tests passed; TypeScript, targeted ESLint and whitespace checks passed. The production dependency audit reported zero advisories. Live PostHog account ingestion has not been confirmed by these intercepted tests.

Consent UI follow-up: the card now appears automatically for an undecided visitor even when browser privacy signals are present. Allow analytics stays enabled when the project is configured. Explicit consent acknowledges only the privacy signals present at that moment; a newly enabled signal blocks collection again. Verified automatic prompting, successful opt-in under a privacy signal, and acknowledgement removal when declining.

Account identity follow-up: identification and auth-state context are now enabled after consent. The SDK permits only the necessary `$identify` event in addition to the explicit product event list, strips person properties, and restores the existing consent choice after resetting identities. The AnalyticsProvider is mounted inside ClerkProvider. Footer preferences use the same CSS rules and hit area as the other Company links.

Latest verification: 15 browser assertions passed, including hashed sign-in identity, guest-session linking, account-switch isolation, sign-out reset, auth-loading suppression and matching footer-link styles. Targeted ESLint, TypeScript and analytics schema tests passed. Transport remains intercepted in this fixture; live account ingestion is a separate acceptance check.

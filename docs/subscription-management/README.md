# In-app subscription management

14 November 2026. Scope: Settings → Billing → Manage subscription, server actions, Bachs requests and subscription synchronization. Uses the existing Next 16/React 19, Tailwind, coss/Base UI, Hugeicons and semantic theme tokens. Reviewed with better-interface, its six domain owners, better-layout and emil-design-eng. Conventions: AGENTS.md and docs/feedback-board-design-system.md; newer charcoal/squircle product decisions retained.

## Coverage

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Named dialog/select/actions, confirmation, disabled/pending/error states, keyboard dismissal and focus restoration | Passed inspected browser flow; physical screen reader not verified |
| Layout | 320/375/768/1280px, LTR/RTL, short 320×380 viewport and 200% CSS zoom | Passed local fixture |
| Writing | Current/trial/scheduled/cancellation terminology, recovery instructions | Current and scheduled plans distinguished; errors provide refresh/support paths |
| Typography | Existing 13px controls and 14px heading, wrapping at mobile widths | Visual screenshots inspected; Arial fallback used offline |
| Colors | Existing light/dark tokens and distinct destructive action | Both themes inspected; no new palette; contrast measurements not verified |
| UI polish | Existing dialog/select transitions, matching control heights, rounded corners, pending behavior | Screenshots inspected; reduced-motion skeleton stops animation |

## Findings and implementation

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| High | UI | `src/components/feedback/billing-settings.tsx:79` | Manage/cancel depended on a failing external portal handoff. | In-app dialog calls authenticated subscription APIs directly. | Removes the portal dependency for the requested management actions. |
| High | Writing | `src/components/feedback/manage-subscription-dialog.tsx:48` | No distinction between selecting another interval and actually changing billing. | Current plan, free trial and next-renewal scheduled changes are separate states. | Prevents implying a subscription was paid or changed before provider confirmation. |
| High | Accessibility | `src/components/feedback/manage-subscription-dialog.tsx:58` | Cancellation had no in-app confirmation flow. | Explicit cancellation review, Keep subscription and Confirm cancellation actions. | Protects against accidental loss of renewal and states the access end date. |
| Medium | Layout | `src/components/feedback/manage-subscription-dialog.tsx:44` | External page had no app-controlled responsive layout. | Existing 440px dialog, full-width period dropdown, wrapping footer, 36px desktop /44px mobile controls and scroll access on short screens. | Aligns controls and preserves reachability. |

## Backend behavior

- Only the signed-in workspace owner can read or change management state. Client inputs never select a customer, subscription or arbitrary product ID.
- Every management read and mutation validates Bachs subscription identity, customer, USD price, quantity, product and cadence using the same snapshot validation as webhooks. Existing subscriptions on retired trial products are accepted only against their matching completed checkout, workspace metadata and original cadence. New subscriptions and interval changes still use the configured catalog.
- SDK 2.0 lacks subscription PATCH. A small server-only transport calls the documented endpoint with the configured environment, a timeout, no redirects, no caching and an idempotency key. Price/product choices are server controlled.
- Monthly/yearly changes use `product_id` and `proration_behavior: next_cycle`. Bachs stages cadence changes until renewal in `pending_update`. Unknown pending shapes remain visibly pending and block another plan change; unconfirmed requests never produce a success message.
- Cancellation always sends `cancel_at_period_end: true`; it never cancels immediately. Trial access is retained through its existing end date. Duplicate already-applied requests do not issue another mutation.
- A fenced, expiring lease in the existing rate-limit table serializes management writes across instances/tabs. No schema migration is needed. Network calls run outside database row locks.
- After a mutation, a fresh provider GET confirms the state; the verified state is reconciled to PostgreSQL with stale-snapshot protection. Existing authenticated webhook handling continues to process renewal/cancellation and interval changes. Browser state/cache update only after confirmation; older polling responses cannot overwrite that local update.
- Only numeric provider HTTP status is logged. Customer data, API keys and session URLs are not exposed in errors.

## Verification

Passed:

- `node scripts/check-billing-db.mjs`: real PostgreSQL, mocked Bachs transport, all fixtures rolled back. Covers existing lifecycle tests plus management authorization, customer mismatch, write-lease conflicts, staged yearly changes, duplicate change/cancel calls, period-end cancellation retaining access and webhook renewal application.
- `node --import tsx --test tests/billing-snapshot.test.ts tests/subscription-api.test.ts tests/billing-redirect.test.ts tests/billing-portal-error.test.ts`: four suites passed. Checks API method/environment/body/idempotency and sanitized failures, snapshot price/product validation, current vs scheduled interval and redirect restrictions.
- Offline actual-component Chromium fixture: 23 checks, zero browser errors. Both themes/directions at 320/375/768/1280; dropdown selection, scheduled indicator, cancellation review/back/confirm, inline load/save failures with refresh, trial copy, short screens, 200% CSS zoom, reduced-motion preference, Escape and restored trigger focus. Mobile screenshots inspected.
- Clean TypeScript, targeted ESLint and diff whitespace checks.

Not verified: an actual Bachs subscription mutation or charge, deployed application, physical Safari/iOS, VoiceOver, exact production Inter rendering, measured contrast, translated long labels, frame-by-frame motion. The browser fixture mocks server actions; database tests mock Bachs. No real subscription was altered during verification. Test the sandbox-backed local app before deployment. API key/account subscription permissions are still required; provider 401/403/404 errors provide a support path instead of being treated as success.

References: [Change or cancel subscriptions](https://docs.bachs.io/guides/subscriptions/manage), [Update API](https://docs.bachs.io/api-reference/subscriptions/update-subscription), [Cancel API](https://docs.bachs.io/api-reference/subscriptions/cancel-subscription).

**Verdict: Approve the inspected local UI and mocked-provider flow. Real-provider and deployed end-to-end verification remain outstanding. No GitHub push requested for this iteration.**

# Prepaid billing

14 November 2026. Local implementation; not pushed or deployed.

Settings → Billing retains the compact monthly/yearly tabs. The primary action opens Bachs directly: eligible accounts start the existing USD-card 14-day trial; accounts that have used their trial can pay once for $7/month or $70/year. Existing prepaid plans can extend their access. The additional Ent checkout-choice dialog was removed. Bachs owns payment-method and currency selection; one-time checkout supports eligible local methods and adaptive pricing, while trial checkout requires a USD card.

| Before | After | Why |
| --- | --- | --- |
| Recurring USD card checkout only | Separate one-time checkout with no pinned billing currency or payment method | Allows Bachs to offer local cards, bank transfer and crypto where supported |
| Subscription status alone grants access | Independently verified prepaid expiry also grants access | Preserves card subscription records and permits manual prepaid extensions |
| A client completion event could appear successful before confirmation | Access and success state follow verified server confirmation | Redirects and overlay events cannot grant paid access |

## Fulfillment

The additive `0010_kind_william_stryker.sql` migration was applied locally. Signed, organization-verified webhooks fetch the checkout and payment from Bachs, validate the workspace, reference, USD base price and non-recurring mode, then grant access transactionally. Duplicate events cannot extend access twice. Underpaid payments do not grant access. Refund payment states remove the associated grant; other valid prepaid grants are recomputed. Currency conversion amounts are not compared against the USD base price.

Active card subscriptions cannot simultaneously start prepaid checkout. Active prepaid customers can extend prepaid access; starting auto-renew is blocked until prepaid access ends. Manual extensions retain remaining time. Monthly calendar arithmetic clamps month-end and leap-year dates.

## Local testing

1. For an account with its trial already used, open Settings → Billing, choose a monthly/yearly tab and pay the displayed price. For an existing prepaid plan, select Extend Essentials.
2. Use a sandbox account. A public tunnel forwarding to localhost:3000 is needed for a sandbox webhook endpoint at `/api/webhooks/bachs`; use its corresponding signing secret locally. Do not replace the production endpoint. No tunnel was running when this review finished.
3. Subscribe that endpoint to `checkout.completed`, `collection.succeeded`, `collection.underpaid` and refund events in addition to existing subscription/invoice events. Set the allowed checkout return origin to the temporary public origin if required by the checkout flow.
4. Complete a sandbox payment and confirm the verified expiry appears. Check duplicate delivery, manual extension and underpayment before publishing.

## Verification and limits

- Six unit suites passed, including prepaid calendar and forged checkout validation.
- PostgreSQL prepaid lifecycle fixtures passed with mocked Bachs; all fixtures rolled back. Coverage includes local-currency payment confirmation, duplicate delivery, extension, refund, late replay, underpayment and organization rejection.
- Actual-component offline browser fixture: 19 checks passed at 320/375/768/1280px, light/dark, LTR/RTL, 200% CSS zoom and reduced motion. Mobile screenshot inspected. Offline font/image loading does not represent deployed assets.
- Read-only sandbox account settings confirmed adaptive pricing and card, bank-transfer and crypto methods are enabled. One unpaid sandbox checkout confirmed raw USD pricing and `recurring: null`; no charge was made.

Actual hosted currency selection, completed provider payments, physical Safari/VoiceOver and deployed end-to-end delivery remain unverified. Refund routing depends on provider checkout/payment identifiers being present in the event; the full refund/dispute event contract was not independently verified.

References: [Payment method support](https://docs.bachs.io/guides/payments/payment-method-support), [any-currency checkout](https://docs.bachs.io/guides/checkout/any-currency-checkout), [checkout sessions](https://docs.bachs.io/guides/checkout/checkout-sessions).

## Direct checkout and trial eligibility

The temporary Ent checkout-choice dialog has been removed. Eligible users go directly to Bachs card-trial checkout. Users with a used trial go directly to one-time checkout, with Bachs currency and payment-method selection. Bachs does not support combining both checkout modes inside a single hosted session.

See `docs/trial-abuse/README.md` for server-enforced eligibility and verification.

# Bachs billing

Essentials is $7 USD per month or $70 USD per year, per workspace. Annual billing saves $14 (16.7%) compared with twelve monthly payments. Eligible workspaces receive a 14-day trial; Bachs captures a card at checkout and charges after the trial. Returning subscriptions use separate products without trials.

## Configuration

Set these server-only values in `.env.local` or the deployment secret manager:

- `BACHS_API_KEY`: sandbox key during testing.
- `BACHS_RETURN_ORIGIN`: optional public HTTPS origin for checkout return URLs when the app runs on localhost (for example your active ngrok tunnel). Bachs rejects localhost return URLs. Update this value when your tunnel address changes.
- `BACHS_WEBHOOK_SECRET`: signing secret from the configured Bachs webhook endpoint.
- `BACHS_ORGANIZATION_ID`: organization that owns the products.
- `BACHS_MONTHLY_TRIAL_PRODUCT_ID`, `BACHS_YEARLY_TRIAL_PRODUCT_ID`: fixed USD products with one-month / one-year billing and a 14-day trial.
- `BACHS_MONTHLY_PRODUCT_ID`, `BACHS_YEARLY_PRODUCT_ID`: matching products without trials.
- Plan entitlements are always enforced. Free includes 2 boards, unlimited posts and voters, and a small Powered by badge. Essentials and its active trial include 5 boards and no badge. Data export is reserved for Essentials and is not implemented yet.

Run `npm run db:migrate` before using billing. The migration adds workspace subscriptions, checkout attempts, and deduplicated webhook receipts. Use separate databases and credentials for sandbox and production; sandbox subscription records must never authorize production access.

The local sandbox trial products supplied by the owner were verified as $7/month and $70/year with 14-day trials. Matching non-trial sandbox products were created and configured locally. No checkout or charge was created during setup.

## Webhook setup

Configure a publicly reachable HTTPS endpoint at `<app-origin>/api/webhooks/bachs`. Localhost needs a trusted forwarding tunnel; a hosted provider cannot reach localhost directly. Subscribe to:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Copy the endpoint signing secret into `BACHS_WEBHOOK_SECRET`. The handler validates the V2 signature and timestamp, verifies the organization, and fetches the current subscription from Bachs. Checkout metadata binds it to the workspace and recorded checkout attempt. Returning from checkout never grants access by itself. Event receipts are committed atomically with subscription updates, so failed processing can be retried safely.

`past_due` retains access while Bachs retries collection. `unpaid`, `paused`, canceled subscriptions, and expired confirmed periods fall back to Free. Existing boards and feedback remain readable and usable; creating boards is blocked at the current plan limit. The customer portal handles payment methods and cancellation. Only the workspace owner can open checkout or the portal.

## Verification

- `node --conditions=react-server --import tsx --test tests/billing.test.ts tests/auth-flow.test.ts tests/notifications.test.ts`
- `node scripts/check-billing-db.mjs`: real PostgreSQL transactions with mocked provider transport; fixtures are rolled back. Tests owner isolation, checkout reuse, webhook-only activation, duplicate events, renewals, failed-payment revocation, portal ownership, and repeat-trial prevention.
- `node scripts/billing-catalog.mjs`: read-only inspection of configured trial products. Never prints API keys.
- `node scripts/billing-catalog.mjs --create-returning`: sandbox-only idempotent setup of matching non-trial products.

For end-to-end testing, complete overlay sandbox checkout, observe a signed subscription webhook, verify the Billing screen changes to Free trial, and test renewal, failed payment, and cancellation through Bachs. Confirm event redelivery repairs a temporarily unavailable endpoint. Sandbox overlay checkout and signed trial webhook delivery have been verified; renewals, cancellation, and the customer portal still need end-to-end testing.

Monitor failed webhook deliveries in Bachs and replay failures after recovery. There is no scheduled provider reconciliation worker yet; confirmed period expiry falls back to Free. Monitor webhook delivery failures to avoid incorrectly downgrading paid workspaces.

References: [Bachs Node SDK](https://docs.bachs.io/sdks/node), [trials](https://docs.bachs.io/guides/subscriptions/trials), [webhooks](https://docs.bachs.io/guides/webhooks/overview).

## Overlay checkout

Billing opens checkout using the official `@bachs/js` overlay, selecting the sandbox/live script origin from the validated server checkout URL. Closing the overlay restores the button. Completion prompts a server refresh and waits for signed webhook confirmation; browser events never activate access. Customer portal management remains hosted. Checkout return URLs still require a public HTTPS origin during local testing.

## Plan boundaries

| Capability | Free | Essentials / trial |
| --- | --- | --- |
| Boards per workspace | 2 | 5 |
| Posts and voters | Unlimited | Unlimited |
| Powered by badge | Required | Hidden |
| Data export | Unavailable | Reserved; coming next |

The widget, comments, replies, votes, statuses, tags, branding, and notification workflows remain available on both plans. Roles and integrations remain outside v1. Board creation locks the workspace row before checking the current count. Existing over-limit boards are preserved on downgrade; additional board creation is blocked. Public board and widget attribution is derived from server-side subscription status rather than a client-controlled branding preference.

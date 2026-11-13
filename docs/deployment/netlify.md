# Netlify launch

Ent uses one Next.js deployment for the marketing site, dashboard, public boards,
widget, server actions and API routes. Neon and R2 remain external services.

## Build

Connect `nonyonah/ent-feedback`, branch `main`, repository root. The checked-in
`netlify.toml` sets Node 22, `npm run build -- --webpack`, `.next` output and skew
protection. Let Netlify install its maintained Next.js adapter automatically;
do not add an SPA catch-all redirect or export the application as static HTML.

Start with a deploy preview. Verify the account is on Free and do not enable
paid upgrades or automatic recharge. Monitor the account's usage dashboard:
Free has a hard credit allowance, and production deployments consume credits.
Do not repeatedly publish production builds while reviewing visual changes.

## Environment

Add values through Netlify's environment settings, never Git. `.env.example`
is the variable inventory. Do not copy local origins or temporary tunnel URLs.

- Set `NEXT_PUBLIC_APP_URL` to the preview/site HTTPS origin before building.
- Set `BACHS_RETURN_ORIGIN` to the same origin for sandbox checkout tests.
- Use the Neon pooled URL. Start `DATABASE_POOL_MAX` at 2 per function instance;
  observe connection usage before increasing it. Serverless instances multiply
  this pool size.
- Configure Clerk keys and the allowed application origin. Development Clerk
  and Bachs sandbox credentials are for preview verification, not public launch.
- Configure R2 credentials and bucket. An optional public R2 URL is not required
  when the app serves attachments through its authenticated routes.
- Configure the verified Sendbyte sender only when ready for delivery tests.
  Keep `LIFECYCLE_EMAILS_ENABLED=false` during preview deployment.
- Set the PostHog project token/region and `MINTLIFY_ORIGIN` as needed.
- Leave `NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN` unset until wildcard hosting, DNS
  and TLS are verified. Public boards support `/p/<workspace>/boards` paths.
  Review displayed workspace-domain copy before inviting production users.

Values prefixed `NEXT_PUBLIC_` are embedded during build; rebuild after changes.
Secrets must be available to server functions as well as builds where required.
Do not share production databases or credentials with untrusted pull-request
previews. Rotate credentials exposed outside their secret store before launch.

## Maintenance scheduling

The authenticated `/api/internal/notification-jobs` route accepts GET and POST,
requires `Authorization: Bearer <CRON_SECRET>`, and never caches responses.
The secret must contain at least 32 characters.

Scheduling is **not enabled by this configuration**. Netlify scheduled functions
have a 30-second execution limit; regular synchronous functions have 60 seconds.
Do not move the existing 60-second maintenance workload into a scheduled
function without measuring and bounding it. Configure and verify the selected
scheduler separately, including retry behavior and overlap protection, before
enabling lifecycle emails. Never place the bearer secret in a URL or browser.

## Hosted verification before production

1. Build with the Netlify adapter and check function/edge bundles, especially
   Clerk middleware, database access and Sharp image validation.
2. Open landing, pricing, authentication, onboarding, dashboard and billing.
   Confirm auth redirects use the hosted origin and unauthorized API calls fail.
3. Submit feedback through a public board, verify it in the dashboard, then test
   votes, replies, attachments and workspace isolation with separate users.
4. Install `/widget.js` on a separate HTTPS site; verify embedding, theme,
   launcher toggle and submission. Keep `/embed` embeddable while regular pages
   retain their frame restrictions.
5. Verify `/docs` serves Ent documentation, not the Mintlify starter project.
6. Register the hosted Bachs webhook URL, test signed sandbox events and checkout
   return, then subscription management and cancellation. Do not use live charges.
7. Test the maintenance endpoint's unauthorized response without dispatching mail;
   authorize a specific recipient before a live delivery test.
8. Run `npm run production:check` with the final environment. Resolve development
   auth/payment keys, local origins, scheduler, backups and monitoring findings.

Only after these checks, attach `ent.riftlabs.xyz` using Netlify's exact DNS
instructions. Change only this product's records, not other Rift Labs products.

## References

- [Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- [Function limits](https://docs.netlify.com/build/functions/configuration/)
- [Scheduled functions](https://docs.netlify.com/build/functions/scheduled-functions/)
- [Pricing and current credit allowance](https://www.netlify.com/pricing/)

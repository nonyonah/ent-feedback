# Vercel deployment preparation

Prepared 11 November 2026. Historical alternative: the user subsequently selected Netlify Free. See [Netlify launch setup](netlify.md). Vercel is not the current launch target. Keep the existing Next.js backend and frontend together; Cloudflare backend migration is deferred. Neon, R2, Clerk, Bachs, Sendbyte and Mintlify remain their existing services. No Vercel project, paid upgrade or public deployment has been created by this preparation.

## Account and cost decision

Vercel's published Hobby policy restricts it to personal, non-commercial use, regardless of traffic. Pro trial/credit eligibility must be confirmed in the user's account before a commercial launch. The user has a strict current budget; do not activate a paid plan or paid add-on automatically. Preparation/build checks can proceed while the account decision is pending.

Sources: [Hobby policy](https://vercel.com/docs/plans/hobby), [Pro trial](https://vercel.com/docs/plans/pro-plan/trials), [pricing](https://vercel.com/pricing).

## Repository preparation

- `vercel.json`: Next.js framework with `npm run build -- --webpack`, matching the production build that passed locally. No manual function routing, static export or separate backend build is needed.
- `.vercelignore`: local env files, internal audits, skills, separate Mintlify source and Cloudflare tooling excluded from CLI uploads. `.env.local` remains Git-ignored. Project environment variables must be configured on Vercel; never commit or upload the local secret file.
- `/api/internal/notification-jobs`: authenticated GET for Vercel Cron and POST for existing maintenance callers. Both use the same timing-safe strong-secret check and no-store responses. Existing attachment cleanup is preserved.
- No schedule in `vercel.json` yet. Activate a supported cadence after account/environment verification; do not silently substitute once-daily notification delivery for the intended minute-level worker.

## Connect a preview

1. In Vercel, import `nonyonah/ent-feedback` with repository root `.` and framework Next.js. Use Node.js 22.x initially to match local verification. Verify the needed source changes have been committed/pushed before using Git deployment.
2. Configure **Preview** environment variables explicitly. Use a separate development/staging database branch, Clerk development instance and Bachs sandbox products/secrets. Keep preview emails sandbox-only so preview visits cannot start live lifecycle campaigns.
3. Deploy a preview and verify SSR, auth redirects, forms/Server Actions, tenant scope, widget embedding, image sanitization, payment overlay, `/docs` proxy and cache freshness. A GitHub build succeeding alone does not prove these work on the deployed platform.
4. Run migrations through a controlled release command against the intended database before deploying auth code that uses the new lifecycle table. Do not run database migrations automatically on every preview build.

## Environment checklist

Use `.env.example` for the full names, not copied local values. Exclude disabled OAuth/integration variables unless a retained code path explicitly needs them.

| Group | Variables / deployment detail |
| --- | --- |
| Application | `NEXT_PUBLIC_APP_URL` = the permanent HTTPS app origin; `BACHS_RETURN_ORIGIN` = matching intended billing return origin |
| Database | `DATABASE_URL` for the correct environment; `DATABASE_POOL_MAX` sized against database connection capacity and serverless instance concurrency |
| Clerk | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, optional configured webhook signing secret; ensure issuer, allowed origins and redirects match this environment |
| R2 | Account/access/secret/bucket values; staging bucket in Preview; production private object behavior verified separately |
| Email | `SENDBYTE_API_KEY`, verified `EMAIL_FROM` (`Ent <team@riftlabs.xyz>` confirmed for live mail); sandbox in Preview |
| Lifecycle | `LIFECYCLE_EMAILS_ENABLED=false` initially; separate `EMAIL_UNSUBSCRIBE_SECRET` before enabling |
| Worker | `CRON_SECRET`, at least 32 random characters; set separately in each environment |
| Billing | Bachs key, webhook secret, organization and two monthly/yearly product IDs with included trials; never mix sandbox/live records |
| Documentation | `MINTLIFY_ORIGIN=https://ent-docs.mintlify.site`; Mintlify source directory `/documentation`, public base path `/docs` |
| Analytics | PostHog project key/host, with development collection off by default; consent gate remains in place |

Keep all server secrets unprefixed by NEXT_PUBLIC_. Changing public variables requires rebuilding. Configure matching Production values separately after preview acceptance; do not bulk-promote local test credentials.

## Notification schedule

Vercel Cron calls GET and supplies `Authorization: Bearer <CRON_SECRET>` when configured. The route now supports that contract. GET is reserved for this authenticated maintenance endpoint; ordinary user actions keep their existing methods.

After a Pro/trial plan and a deployed endpoint are verified, add this property to `vercel.json`:

```json
"crons": [
  {"path": "/api/internal/notification-jobs", "schedule": "* * * * *"}
]
```

Hobby cron is limited to daily frequency; Pro supports minute-level scheduling. Cron schedules execute against production. Verify logs and a dedicated preference-aware queued message before enabling lifecycle campaigns. The existing Cloudflare scheduler must stay disabled if Vercel Cron becomes authoritative. The database claim leases/dedupe keys protect overlap, but running duplicate schedules is unnecessary.

The endpoint sends bounded batches and performs attachment/rate-limit cleanup. Monitor execution time, oldest pending job, retries and failures; `maxDuration=60` does not promise every workload completes within 60 seconds. Review spend controls before increasing limits or cadence.

References: [cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [cron plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## Domain and provider cutover

- Add `ent.riftlabs.xyz` in Vercel and use its exact DNS instructions. Do not replace the nameservers of all `riftlabs.xyz` merely to deploy this product; other products use that zone.
- Workspace wildcard hosting requires separate DNS/TLS validation. Preserve the intended base domain; do not guess between `feedback.riftlabs.xyz` and `ent.riftlabs.xyz`. Do not enable `NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN` until wildcard hosting works. Shared `/p/<workspace>` routes remain available when that variable is unset, although displayed workspace-domain copy must also be checked.
- Keep Mintlify at `/docs` through the existing app proxy and retain the app domain's hosting records. Do not set the whole app domain's CNAME to Mintlify.
- Configure Bachs to deliver signed events to the deployed `/api/webhooks/bachs`; preview protection must not block intentionally public webhooks. Retest sandbox acceptance before live products.
- Configure Clerk production domains/redirects and verify sign-in, sign-up, public participation and owner onboarding separately.
- Test the widget on a different real origin using the deployed loader URL, including theme changes, votes, uploads and closing/reopening.

## Release gates

The existing production gate remains in force: hosted sandbox lifecycle, native VoiceOver/TalkBack, backup restore, alerting/reconciliation and environment isolation need evidence. Earlier successful local tests do not certify a Vercel deployment. Do not switch payment credentials to live just to make a configuration check green.

Validation for this preparation: protected GET and POST route tests pass with mocked notification/lifecycle/cleanup transports. Missing, weak and incorrect bearer secrets are rejected before maintenance; valid requests are no-store. No real jobs or provider mutations were performed by those checks.

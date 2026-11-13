# Cloudflare backend migration preparation

Prepared 11 November 2026. **Planning/static inventory only; backend traffic has not moved.** No paid plan, provider resource, DNS or production setting was changed. Existing uncommitted backend/connection fixes were preserved.

## Launch target update

Netlify Free was subsequently selected for the initial launch to avoid paid hosting. See [Netlify preparation](netlify.md). The Cloudflare migration below is deferred; it is not required to deploy the current app on Netlify.

## Initial scope

The working-tree inventory contains **40 server modules**, including **33 exported Server Action functions across 9 modules**. Reproduce with:

```sh
node scripts/prepare-cloudflare.mjs
```

The inventory at `cloudflare-inventory.json` lists imports, exported functions and coupling points. It is not a runtime compatibility certificate and does not collect environment values.

Retain the PostgreSQL schema, migrations and Neon database. Retain the R2 bucket. Move execution and authoritative business services to Workers behind an explicit API. Next.js remains the frontend/server-rendering layer initially; Brimble is still a frontend candidate, not a completed deployment. Existing browser imports of Server Actions cannot call a separately deployed Worker automatically.

## Cost envelope

Prices checked against official Cloudflare documentation on 11 November 2026, in USD before applicable taxes. Account usage and separate providers affect the final bill.

| Service | Testing | Launch planning |
| --- | --- | --- |
| Workers | Free: 100,000 requests/day and 10ms CPU per invocation | Paid baseline $5/month; includes 10 million requests and 30 million CPU-ms/month, then metered overages |
| Hyperdrive | Included; Free limit 100,000 database queries/day | Included with Workers Paid; database queries unlimited on that plan |
| R2 Standard | Monthly allowance: 10 GB-month storage, 1 million Class A and 10 million Class B operations | Usage beyond allowances charged separately; Internet egress free |
| Neon | Existing database plan | Separate from Cloudflare; do not assume Hyperdrive pays for PostgreSQL |
| Frontend, Clerk, Sendbyte, Bachs | Existing accounts/plans | Separate hosting, auth, email and payment costs |

The $5 figure is a Cloudflare compute baseline, not the app's total operating cost or a monthly spending ceiling. It is account-level Workers pricing, not a separate $5 subscription for every Worker. One application action may perform multiple database queries. The query allowance is not an allowance of the same number of user actions. The free CPU budget makes it inappropriate to promise that the whole backend will run free without measurement.

Start the isolated compatibility work on Free. Budget for Paid for production, then measure request/CPU/storage/log usage. Set explicit CPU limits and billing alerts before cutover; alerts are not a hard spending cap. No paid upgrade is part of this preparation.

Sources: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Hyperdrive pricing](https://developers.cloudflare.com/hyperdrive/platform/pricing/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

## Boundaries to extract

| Area | Current coupling | Migration boundary / acceptance |
| --- | --- | --- |
| Identity | `@clerk/nextjs/server`, `auth`, `currentUser`, metadata updates | Workers-compatible Clerk verification; explicit verified actor passed to services; retain verified-email policy |
| Database | Process-global Node pool, `getDb()`, transaction helpers | Request-scoped database adapter using Hyperdrive and existing Drizzle schema; close/release per runtime rules; explicit transaction handle throughout |
| Configuration | `process.env` + cached server configuration | Validated Worker bindings passed explicitly; never assign request bindings to global process.env |
| Cache invalidation | `next/cache` and `revalidatePath` | Frontend action/BFF invalidates Next cache only after a successful Worker mutation |
| Uploads | `sharp` native image decode/re-encode; S3 SDK | Keep sanitation on Node temporarily; prove a replacement before full upload cutover. Never replace decoding with client MIME validation |
| Storage | S3 credentials in server config | Native R2 binding in Worker; preserve private-object and tenant access checks |
| Billing | Next route + Bachs SDK + database snapshots | Raw-body signature verification, organization checks, dedupe and provider readback in Worker; retain entitlement rules |
| Activity/lifecycle mail | Next internal route and global DB access | Inject database/config/email transport; preserve claims, fencing, retry keys, opt-out and current preference rechecks |
| HTTP response/errors | Existing service result union | Versioned JSON contracts, stable error codes, bounded payloads, private/no-store on personalized responses |

`nodejs_compat` is necessary for the initial Node-oriented libraries, but it does not prove support for native addons or Next request-context APIs. [Workers Node compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/).

## First compatibility slice — next implementation

Create an isolated staging Worker, separate from the live app and the existing disabled notification scheduler. No customer-facing mutation endpoint should ship until these pass:

1. **Database:** Hyperdrive → Neon staging branch, pg/Drizzle select, transaction rollback, uniqueness errors, concurrent claims with SKIP LOCKED, lease fencing and connection cleanup. Do not reuse the Node global pool in the Worker. Use a separate least-privilege database role.
2. **Freshness:** disable Hyperdrive query caching initially. Test submit → read, vote → read and webhook → entitlement read immediately. Caching is enabled by default and must not recreate stale vote/board/billing behavior. Add selective caching only after freshness contracts are explicit. [Query caching](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/).
3. **Auth:** valid/expired/wrong-issuer tokens; verify the Clerk issuer and intended authorized origins/audiences as applicable; unauthenticated, cross-workspace and forged actor/role requests rejected. Do not authorize a caller merely because it knows a workspace ID or sends a user-ID header.
4. **Guest access:** retain hashed, workspace-scoped visitor credentials and protections for anonymous widget activity. No wildcard credentialed CORS; prefer browser requests through the existing same-origin frontend layer initially.
5. **Billing:** compile/run the actual Bachs signature verifier in workerd; tampered/stale signatures and replay/organization mismatch checks; provider timeout/retry behavior; no paid access from a redirect.
6. **R2:** private-object get/head and one unique write/read/delete fixture in a staging bucket; authorization before access. Do not bind a production bucket for the first probe.
7. **Email:** mock transport first; then one explicitly authorized recipient. No bulk queue draining during compatibility tests.
8. **Limits:** measure CPU/connection/subrequest usage and bundle size in workerd. Exercise cold starts, SQL errors, provider timeouts and aborts. A Node test or Wrangler dry run alone is not a deployed runtime proof.

Use current pg/Hyperdrive guidance for connection creation and lifetime: [node-postgres example](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/node-postgres/).

## Incremental migration order

1. Compatibility slice and typed API/error contract.
2. Workspace reads and authorization, then boards/settings mutations with rate limits and idempotency.
3. Public feedback reads, create/reply/vote/follow/type/tags, retaining immediate synchronization and guest scope.
4. Notifications/lifecycle processing on a scheduled Worker. The existing scheduler calling Next is an interim bridge, not proof that job services already run on Workers.
5. Bachs webhook and billing services; coordinate the old/new webhook route so receipt deduplication and reconciliation remain reliable.
6. Upload/image sanitation replacement and native R2 binding. Preserve the 2MB/16-megapixel/animation limits and metadata stripping.
7. Replace remaining Node authoritative operations, then remove their direct database/provider credentials from the frontend runtime where no longer needed.

Each slice must pass existing unit and rollback-only database suites plus Workers runtime tests. Frontend Server Actions become thin authenticated API adapters; they still perform frontend cache refresh/invalidation. Integrations, admin roles and custom domains remain outside v1; data export remains deferred.

## Staging configuration to provision later

- Worker app/API origin, preview origin and exact allowed frontend origins.
- Staging Neon branch/role and Hyperdrive binding, with query caching disabled initially.
- Dedicated staging R2 bucket binding.
- Clerk development/test identity configuration and sandbox Bachs credentials/webhook secret/organization/products.
- Sendbyte test credentials initially; dedicated unsubscribe signing secret; scheduler secret only for the interim HTTP scheduler.
- Structured redacted logs, failed-job and webhook alerts, CPU caps, billing alerts, deployment/rollback commands.

Provisioning and paid upgrades are deliberately not performed by the inventory script. Do not put credential values in this document, Worker config or browser bundles.

## Cutover gates

Keep one authoritative write path per slice. Use a server-side route flag so the frontend can return to the old path without changing browser clients. Run expand/contract-compatible migrations; do not drop legacy columns during initial cutover. Do not independently run the old and new email schedulers against different dedupe stores.

Before DNS/traffic changes, demonstrate: production-compatible build, SSR/auth/tenant routes, wildcard TLS, widget embedding, signed billing delivery/replay and reconciliation, notification scheduling/inbox delivery, same-account/cross-device theme and voting behavior, backup restore, monitoring and native mobile acceptance. Compare counts/IDs and entitlement state without logging customer content.

Rollback must retain consistent database state and stable dedupe keys, stop the new scheduler if it is replaced, and restore frontend routing and webhook destinations safely. A successful static inventory does not satisfy these release gates.

# Ent Feedback

A feedback workspace for product teams: public boards, an embeddable widget, a roadmap, and threaded conversations with the people who use your product — all backed by one PostgreSQL database.

Visitors submit ideas and bugs, vote on what matters, and follow progress. Your team triages requests through statuses, plans them on a roadmap, and replies in the same thread the feedback arrived in.

## What's in here

- **Public boards** per workspace, reachable at `/<handle>.feedback.example.com` when a workspace base domain is configured, or at `/p/<handle>/…` on the app origin.
- **Embeddable widget** (`/embed`, `/widget-preview`) for collecting feedback and showing trending requests inside a customer's own site.
- **Dashboard** (`/dashboard`) with requests, boards, roadmap, conversations, sharing/embedding, and settings.
- **Conversations**: nested comment replies, likes, image attachments, and an optional AI-assisted chat surface enabled by `CHAT_ENABLED`.
- **Request lifecycle**: statuses with a public timeline, follows, tags, soft delete, merge targets, and a cursor-paginated notification inbox.
- **Accounts and billing**: Clerk sign-in, workspace roles, invitations, and subscription plans through Bachs.
- **Transactional email** through SendByte, including verification, lifecycle, and unread-conversation notifications.

## Stack

Next.js 16 (App Router, `cacheComponents`) with React 19 and TypeScript, Tailwind CSS v4 with Base UI primitives, Drizzle ORM over PostgreSQL, Clerk for auth, Cloudflare R2 for uploads, Bachs for billing, SendByte for email, and optional PostHog analytics.

## Running it locally

Requires Node 22 or newer (Netlify builds on 22) and a PostgreSQL database.

```sh
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

`DATABASE_URL` is the only variable the server refuses to start without. Clerk keys are required for sign-in and the dashboard; R2 keys for attachments; Bachs keys for billing; SendByte keys for email. Everything else degrades quietly when unset, which is why the app boots with `.env.example` values unfilled. Never commit `.env.local`.

Set `NEXT_PUBLIC_APP_URL` to the origin you develop on. Public boards under `/p/<handle>` work without any wildcard DNS; workspace subdomains need `NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN` plus wildcard DNS and TLS.

### Weekly summaries and AI

In-app AI features are paused. Admins can see a weekly summary of new requests, votes cast, and requests marked shipped, calculated directly from workspace data without a model. The maintenance scheduler prepares the previous Monday-to-Monday period after Monday 00:00 UTC; delivery depends on the scheduler running and its backlog. Admins can also calculate a rolling seven-day summary on demand.

### MCP

The MCP endpoint is disabled until `MCP_RESOURCE_URL` is set to its exact HTTPS URL, such as `https://ent.riftlabs.xyz/mcp` (localhost HTTP is permitted for development). In Clerk, add that same URL under **Agents → MCP servers**, enable the required OAuth client onboarding and audience settings, and require PKCE. The server requests the `profile` scope and validates Clerk OAuth access tokens for the exact resource URL. See [Clerk's MCP setup guide](https://clerk.com/docs/nextjs/guides/ai/mcp/build-mcp-server).

An authenticated coding agent can list its user's workspaces and read feedback in workspaces where the user is an active member. It can use its own repository and GitHub tools to implement a change and write a changelog, then an admin can submit that text with `propose_changelog_draft`. Proposals are reviewed under **Changelog → MCP proposals**; approval creates a private draft, and publication remains a separate action. MCP cannot publish, notify voters, or modify the repository. The app checks workspace roles on each call. Verify Clerk authorization with a test client and test data before enabling this endpoint for customers.

GitHub also creates changelog drafts from merged pull requests; see [GitHub integration](documentation/integrations/github.mdx) for the recommended pull request format. Linear and Discord integrations require their respective credentials and launch flags in `.env.example` before users can connect them.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` / `npm run typecheck` | ESLint and `tsc --noEmit` |
| `npm run db:generate` / `db:migrate` / `db:check` / `db:studio` | Drizzle migrations and Studio |
| `npm run jobs:run` / `jobs:check` | Chat, notification, lifecycle-email and trial-email jobs, plus attachment cleanup (`--check` is read-only) |
| `npm run production:check` | Configuration and readiness checks for a deployment |
| `npm run check:concurrency` | Concurrency behaviour checks |
| `npm run widget:test` | Local harness for the embeddable widget |
| `npm run docs:dev` / `docs:validate` / `docs:check` | Mintlify docs site in `documentation/` |

Tests live in `tests/` and run with the Node test runner, for example `node --conditions=react-server --import tsx --test tests/*.test.ts`. Database-backed scripts under `scripts/` (such as `check-feedback-db.mjs`) exercise real constraints against a live PostgreSQL instance and roll their fixtures back.

## Layout

```
src/app          Routes: marketing, auth, onboarding, dashboard, public boards (/p)
src/components   UI by area — marketing, feedback, boards, chat, messages, ui primitives
src/server       Actions, services, Drizzle schema and client, auth, billing, email, analytics
drizzle          SQL migrations and Drizzle metadata
scripts          Maintenance jobs and integration checks
tests            Node test-runner suites
docs             Implementation notes, audits and verification records
documentation    Mintlify docs site served at /docs
```

All database writes go through validated server actions in `src/server/actions/`, which resolve the workspace, apply role checks, and serialize conflicting writes with row locks inside a transaction.

## Analytics

PostHog is optional and opt-in. It stays off until a visitor allows analytics, and it never loads on `/embed`, `/widget-preview`, or public board routes. Browser events go to `/ingest/*`, which `next.config.ts` rewrites to `NEXT_PUBLIC_POSTHOG_HOST`; set the host matching your project's region (`eu.i.posthog.com` for EU). Public variables are inlined at build time, so restart development or rebuild after changing them. See [docs/analytics](docs/analytics/README.md).

## Deployment

Netlify is the configured target (`netlify.toml`, `docs/deployment/netlify.md`); Vercel and Cloudflare notes are in `docs/deployment/`. Set the environment variables in the hosting dashboard rather than the repository, run migrations from a machine with direct database access, and protect the internal cron endpoints with `CRON_SECRET`.

## Further reading

- [Product flow](docs/product-flow.md) and [project direction](docs/project-direction.md)
- [Feedback persistence](docs/feedback-persistence.md) and [backend readiness](docs/backend-readiness.md)
- [Chat](docs/chat/README.md), [roadmap](docs/roadmap/README.md), [billing](docs/billing/), [integrations](docs/integrations/README.md)
- [Production review](docs/production-review/README.md) and [release checks](docs/release-checks/)

`AGENTS.md` records the working agreements for automated contributors.

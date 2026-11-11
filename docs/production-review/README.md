# Production review — 9 November 2026

Follow-up: [10 November release checks](../release-checks/README.md). Data export is deferred; legal routes and additional lifecycle coverage have now been added.

Status: **Hold production rollout until the open deployment and billing checks below are completed.** This is a code and sampled-browser review, not a penetration test or a blanket security certification.

## Scope and evidence

Reviewed the authenticated workspace → request inbox → Billing flow, public board and submission source, widget loader, uploads, authentication/authorization boundaries, subscription/webhook handling, notification worker, and deployment configuration. Marketing and pricing received live browser sampling. Billing (Free and trial), public board, and request inbox used actual app components and generated app CSS with fixture identity/actions, not live payment operations.

References: AGENTS.md, `docs/feedback-board-design-system.md`, previous interface/color audits, installed Next.js 16.4.4 guides, `vibe-security`, `better-interface`, and its six accessibility/layout/writing/typography/colors/UI owners. Current user instructions supersede the old blue/Lucide design document: Hugeicons, Inter, charcoal marketing buttons, configurable workspace accents, compact controls, and Free/Essentials board limits.

- 39 Node tests cover auth returns, billing signatures/entitlements, notifications, search/sorting, mutation queue, integrations and domains.
- PostgreSQL fixture tests cover tenant isolation, authorship, guest-token hashing, email privacy, votes/replies/status history, soft deletion, and billing ownership/deduplication/plan limits. They roll back fixtures and mock Clerk/Bachs transport.
- Mock-boundary checks cover settings authorization/validation, board mutation isolation, and disabled v1 capabilities.
- Browser samples: landing/pricing at 320/768/1440 in both themes (12 visits), plus Billing Free/trial, requests and public board at those widths/themes (24 visits).
- After fixes: no sampled horizontal page overflow, browser exceptions, broken marketing images, or unnamed visible buttons. Sampled visible text in the application fixtures passed 4.5:1 after theme transitions settled. This is sampling, not every possible accent/color or state.
- Production dependency audit: **0 advisories** after moving the shadcn CLI to development dependencies. The full development toolchain still has low/moderate advisories; no forced/downgrade update was applied.
- Secret-pattern scan found no real credentials in tracked files. Only `.env.example` is tracked; no `.env.local` file appeared in inspected Git file history. The scan included tracked and untracked review files (excluding ignored local secrets). A dedicated full-history secret scanner was unavailable, so full secret archaeology is not certified.

## Fixed findings

| Severity | Area / location | Before → after | Evidence / impact |
| --- | --- | --- | --- |
| High | Layout — `src/components/feedback/board-feedback-row.tsx:46` | Fixed unwrapped author/status/comment/type row → wraps on narrow screens | Public board measured 348px document width at 320px before; 320px after in both themes. Wider layouts retain the inline metadata row. |
| High | Colors — `src/components/ui/tabs.tsx:51` | Inactive text used muted foreground at 72% opacity → solid muted foreground | Inactive Billing tab measured 2.96:1 in light and 4.11:1 in settled dark before; remeasurement has no failing sampled pairs. |
| Medium | Accessibility / UI — `src/components/ui/toast.tsx:267` | Errors/actions could expire without an explicit close button → persistent errors/action toasts with a labeled close control | Base UI timeout 0 preserves recovery messages; regular success/info toasts still dismiss normally. |
| Medium | Security — `next.config.ts:5` | No application anti-framing policy → CSP `frame-ancestors 'self'`, with `/embed` intentionally allowed | Added nosniff, referrer policy, device-permission restrictions, and production-only HSTS. No blanket iframe denial that breaks the widget. This is a targeted framing policy, not a full script-source CSP. |
| Medium | Security / privacy — `src/server/result.ts:121` | Raw ORM/provider exceptions logged → only error type and restricted error code logged | Avoids SQL parameters and customer/provider data in routine server logs. API results explicitly use private/no-store. |
| Medium | Abuse controls — `src/server/services/workspaces.ts:176`, `src/server/actions/workspaces.ts:149` | Unlimited authenticated creation/availability requests → user-scoped database rate limits | Workspace creation 10/hour; availability 60/minute. Existing feedback/upload/payment limits remain. Edge bot filtering is a deployment concern. |
| Low | Dependencies — `package.json:60` | shadcn CLI in runtime dependencies → development dependency | All six previously reported production package advisories belonged to this CLI dependency tree; final production audit is clean. |
| Low | UI — `src/components/feedback/dashboard-settings.tsx:26`, `src/components/icons/index.tsx:140` | Billing used code icon → Hugeicons invoice icon | Matches Billing’s purpose and the app’s existing icon library/stroke weight. |
| Low | Verification tooling — `eslint.config.mjs:9` | Historical CommonJS audit scripts failed an ESM-only require rule → scoped CommonJS allowance | Application lint rules remain active. Removed an unused audit import and named the PostCSS config export. |

## Open items before release

| Priority | Item | Current evidence / required next step |
| --- | --- | --- |
| High | Production services and domain | Local configuration uses Clerk test keys, Bachs sandbox products, Sendbyte sandbox, localhost and an ngrok return origin. Configure a real HTTPS app origin, live products/keys, signed live webhook, email sender and production database/storage. Keep sandbox records separate from production entitlements. |
| High | Email scheduler and delivery | Worker config/secret exist and the read-only readiness check found no queued jobs. No deployment host or recurring scheduler is configured in this repo. Schedule maintenance and verify a real inbox delivery after deliberately switching from sandbox. |
| High | Subscription lifecycle | Real sandbox checkout and trial webhook were verified. Renewal, payment failure/recovery, cancel-at-period-end and portal cancellation still need end-to-end provider tests. Automated lifecycle tests use provider fixtures. Do not cancel a user’s trial merely to perform this review. |
| Medium / environment caveat | Production build | Default Turbopack build failed because the environment denied its CSS worker binding a port. The supported Webpack fallback completed successfully, including TypeScript and all 42 static pages. The normal Turbopack command still needs verification on the deployment host. Validate the normal build on the deployment host. |
| Deferred | Data export | Deferred by the user on 10 November. Paid entitlement remains defined; UI says Coming soon. Export is not an active release task and must not be advertised as available. |
| Review pending | Legal / trust pages | Privacy and Terms routes added on 10 November, using Rift Labs, Nigeria and the supplied support email. Marketing and Clerk links are configured. Operator/legal review of policy details remains before release. |
| Medium | Keyboard and assistive technology depth | Borderless public-composer inputs intentionally suppress outlines per the requested design. Complete a keyboard/screen-reader pass, with an agreed visible focus treatment that preserves that design. Full screen-reader, zoom/RTL and payment-overlay keyboard certification were not performed in this final sample. |
| Medium | Scale and operations | Feedback reads currently fetch the full workspace/board and its replies/history. Add pagination/virtualization before large-scale usage; unlimited stored posts does not imply bounded query cost. Verify backups/restores, alerting, webhook replay and scheduled reconciliation operationally. |

Do not treat unreviewed surfaces as approved: full registration, all error/empty variants, all user-selected accents, native mobile browsers and real provider cancellation UI were not exhaustively retested here.

## Validation notes

Test artifacts are local `/tmp/ent-final-*.log`, `/tmp/ent-*-review.json`, and browser screenshots. No customer payloads or credentials were copied into this report. `npm run build -- --webpack` completed successfully: compiled, production TypeScript passed, 42/42 static pages generated, optimization/traces completed. Default Turbopack failed on an environment port-binding permission; this was not an application compile error.

Runtime headers were verified on the live local app: pricing returns `frame-ancestors 'self'`; `/embed` returns `frame-ancestors *`. Both return nosniff, referrer and device-permission headers. HSTS is production-only and was source-reviewed.

Keyboard sampling verified feedback-dialog title autofocus, Escape dismissal and return of focus to its trigger. Billing tabs passed manual keyboard activation (ArrowRight then Enter).

Final interaction checks passed: annual tab keyboard selection, composer autofocus, Escape/focus restoration, persistent error toast visible after 5.5 seconds, and explicit toast dismissal. No browser exceptions were observed in those checks. Final targeted lint, full lint and TypeScript checks passed. Database schema consistency and whitespace checks passed.

## Tomorrow — 11 November 2026

1. **Mintlify documentation:** 16 public help pages and local preview prepared on 11 November; validation/build/link checks passed. See [setup and publication steps](../documentation-setup.md). Mintlify login, GitHub connection and ent.riftlabs.xyz/docs publication remain. Content covers getting started, workspaces/boards, feedback types and statuses, widget installation, notifications, and Free/Essentials billing. Keep data export, integrations and admin roles clearly marked as unavailable or coming soon.
2. **Product analytics:** PostHog selected and implemented on 11 November; see [setup and verification](../analytics/README.md). Complete account-side ingestion verification and initial dashboards. The implementation uses a small event plan for registration/onboarding, workspace and board creation, feedback submission, widget usage and trial/checkout conversion. Exclude feedback text, attachments, email addresses and payment details from event payloads; review consent, privacy notice and environment separation before enabling production collection.
3. **Deployment:** continue the Cloudflare backend and Brimble frontend plan, verify Next.js compatibility and production builds, then configure permanent domains and production services. See [deployment assessment](../deployment/cloudflare-brimble.md).
4. **Notifications:** deploy the recurring worker and verify preference-aware delivery in a real inbox using the agreed sandbox setup first.
5. **Billing acceptance:** test hosted management/cancellation, renewal and payment failure/recovery with dedicated sandbox subscriptions; confirm webhook recovery and reconciliation.
6. **Final acceptance:** manually test native mobile and screen-reader behavior, review legal pages, and verify backups/restores, monitoring and release configuration. Public-board keyboard, RTL, enlarged-text and reduced-motion fixture checks are now recorded in [the public-board audit](../public-board-audit/README.md).

**Still deferred:** data export. Integrations, custom domains, and team roles/permissions remain outside v1; the analytics integration above is internal product instrumentation, not a customer-facing integration feature.

## 11 November: email follow-up

Lifecycle email templates, approved schedule, a separate opt-out, database-backed eligibility/retries and an isolated Cloudflare cron scheduler have been added. See [email lifecycle and delivery verification](../email-lifecycle.md). Development migration and rollback-only worker tests passed. The scheduler remains disabled/undeployed, and lifecycle sending defaults off. A Sendbyte sandbox reply was accepted; live inbox delivery remains pending the user's sender configuration. Documentation is drafted and pushed; Mintlify accepted the `/docs` base path, while app deployment and domain verification remain operational tasks.

Live reply-email acceptance was subsequently verified on 11 November: the provider reported non-sandbox delivery and the recipient confirmed inbox arrival. This used a temporary sender override on the verified `riftlabs.xyz` domain. A subsequent readiness check found the saved sender updated to the verified `riftlabs.xyz` domain. Scheduled application mail still awaits worker deployment and activation. See the lifecycle acceptance record for the message ID and remaining checks.

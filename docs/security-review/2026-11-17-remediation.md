# Security remediation — 17 November 2026

Working branch: `feature/chat-conversations`. Not pushed as part of this task.

## Findings addressed

| Finding | Resolution |
| --- | --- |
| Previously disclosed credentials | Owner confirms rotation. No secret values were printed or copied into source. Provider-side revocation was not independently audited. |
| Unbounded feedback reads | Post requests return at most 25 records. Clients traverse stable cursor pages to retain complete filtering, counts, search and direct-link behavior. Comments and status history return 20 entries per post with a Load earlier activity control. Related activity uses indexed lateral queries with a fixed limit rather than materializing every comment. Mutations return only their changed post/deleted ID. |
| Missing read budgets | Feedback reads/mutations enforce a trusted hosting-IP and global request budget, with additional actor-scoped read limits. Public chat configuration GET now uses the shared chat request limiter before database queries. |
| Unverified guest email notifications | Anonymous feedback/chat require mailbox confirmation before email notifications. Both enqueue and delivery recheck verification against the current resource/email. Existing unverified guest addresses are not grandfathered in. Registered account emails continue to use Clerk's existing verified-primary-email checks. |
| Next.js advisory | Updated Next.js and eslint-config-next to 16.4.6 with lockfile changes. Production dependency audit reports zero known vulnerabilities. This does not assert that development tooling or the application is vulnerability-free. |
| Repeated profile step | User chose Ent-owned profile collection and confirmed disabling both name fields in Clerk Production. Ent's profile action keeps authenticated Clerk/app writes and validation regression coverage. |

## Verification flow

- A resource-scoped record binds workspace, resource kind, feedback/conversation ID, current email and anonymous requester hash. A confirmation for one resource does not authorize another resource or workspace.
- Verification tokens use 32 cryptographically random bytes. Only SHA-256 hashes are stored; links expire in 30 minutes and are consumed atomically once.
- GET renders confirmation only; mail scanners cannot confirm ownership by following links. POST requires matching origin and a streamed form body capped at 1 KB. Responses prevent caching and referrer leakage; user input is escaped.
- Contact address changes invalidate the chat verification record. Confirmation locks the resource and rechecks the current email; stale, expired, changed and already-consumed tokens fail closed.
- Verification emails contain no transcript or visitor-supplied content and use Ent's existing plain-background email layout. Per-mailbox, requester, resource, workspace and global budgets limit verification sends. The original guest owner can retry after a provider/budget failure.
- Chat and anonymous feedback remain usable without verifying email. The widget explains confirmation and provides Resend link. Conversation rows and Slack messages identify unverified guest email claims. Mailbox confirmation is not proof of the visitor's name or an Ent login.
- Older activity stays loaded through refreshes and individual updates. Server totals, not partial comment arrays, drive comment badges and engagement ordering. Cursors preserve PostgreSQL microseconds and ID ties to avoid dropping nearly simultaneous records.

## Database and deployment

Migration `0021_damp_lyja.sql` creates only `guest_email_verifications`, its indexes/constraints and row-level-security flag. Applied successfully to the configured Neon database before deployment; existing customer records were not changed. Apply it to any other deployment database before deploying the code.

No new environment variables are required. All externally visible changes still need a feature-branch push and approved deployment/merge before the live app uses them. Anonymous addresses saved before this release must request a verification link in chat; old feedback guest addresses remain suppressed until an owner-bound confirmation exists. The change deliberately does not send an unsolicited mass verification campaign.

## Verification evidence

- All 87 standalone tests passed, including cursor validation/activity merging, auth flow, profile writes, notification preferences, billing bindings, token isolation and error redaction.
- Isolated Neon security checks passed for bounded post/comment/history pages; no skipped microsecond/tied-date records; cross-workspace rejection; single-post mutation responses; hashed/expiring/single-use links; mail-scanner GET behavior; forged origins; chat notification suppression before verification and after address changes; guest-feedback enqueue/delivery checks; resend budgets.
- Typecheck, scoped ESLint, migration consistency check, documentation link/content checks, production dependency audit and production Webpack build passed. The existing isolated human-chat/Slack regression also passed, including replies, images, signed status actions, tenant/member authorization, retry deduplication and disconnect enforcement.
- Provider traffic in database tests was mocked: no real emails, Slack messages, charges or customer-content mutations were performed. Test schemas are removed afterward. A temporary process-only DNS fallback was used for local Neon DNS resolution; TLS verification remained enabled and no machine-wide DNS changes were made.

This addresses the recorded findings; it is not a penetration-test certification. Production hosting/provider permissions, actual credential revocation and a live new-user verification-email smoke test remain operational checks.

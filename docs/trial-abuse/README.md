# Trial reuse protection

14 November 2026. Local changes, not pushed. Additive migration `0011_long_invisible_woman.sql` applied to the configured database.

Previously, `trialUsed` was recorded and used for labels, but a canceled subscriber could create another checkout for a trial-bearing product. The server now rejects this before checkout creation or pending-checkout reuse. Existing subscription management remains unchanged.

New trial checkout reserves three unique subjects: workspace, Clerk account and normalized email. Account/email subjects are SHA-256 hashes, scoped to sandbox/live. These identifiers are pseudonymous, not anonymous. All subjects are reserved atomically in the checkout transaction; conflicting reservations roll back, including across workspaces. Reopening the same pending checkout remains possible.

A signed, organization-verified subscription webhook consumes the reservation only after validating the provider snapshot and checkout binding. Cancellation does not reset it. Ledger records have no cascading account/workspace deletion; their checkout foreign key becomes null after deletion, preserving the consumed restriction. Legacy `trialUsed` flags on currently owned workspaces are also enforced; legacy environment provenance is unavailable, so those flags are treated conservatively rather than inferred to be live or sandbox.

An elapsed local timer alone cannot release a reservation: a provider GET must confirm the original checkout is expired/canceled. Completed or ambiguous sessions remain blocked. Inaccessible provider sessions or reservations with missing checkout IDs require support review. No trial is granted by browser events or by this ledger; access still comes from the verified billing lifecycle.

## UI

The extra Ent checkout-choice dialog is removed. Eligible accounts open Bachs' card-only trial directly; copy says the trial is available once per account/workspace. Used-trial accounts use the one-time paid path, avoiding another trial-bearing catalog checkout. Card subscription renewals and management continue through Bachs. Prepaid access does not renew automatically.

## Verification

- `scripts/check-billing-db.mjs`: lifecycle regression plus rejected trial reuse after cancellation, another owned workspace, an outstanding reservation and workspace deletion. Fixtures rolled back; provider mocked.
- `scripts/check-trial-claims-db.mjs`: normalized identity, environment separation, reservation retry/conflict, provider-confirmed expiry, completed-checkout protection and deletion persistence. Fixtures rolled back; provider mocked.
- `scripts/check-prepaid-db.mjs`: paid one-time access remains functional with trial enforcement in place; mocked provider, rollback fixtures.
- Six existing unit cases and 17 offline UI checks, including direct card-trial dispatch, used-trial prepaid dispatch, no additional dialog, light/dark and LTR/RTL at 320–1280px.
- TypeScript, targeted ESLint and diff whitespace checks.

Limits: no actual charge/trial started, no deployment, no physical device testing. Distinct new accounts with different emails remain distinct identities; this does not implement payment-card fingerprinting, device fingerprinting or provider-wide fraud detection. Do not claim it prevents all multi-account abuse. Existing legacy records were not destructively rewritten.

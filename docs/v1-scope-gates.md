# Temporary v1 feature exclusions

Integrations, bring-your-own custom domains, and team management/role configuration are unavailable for v1. The central release flags are in `src/lib/features.ts`; `src/server/features.ts` enforces server-side gates. Existing tables, membership records, pending invitations and integration credentials are preserved. No migrations, data deletion or provider revocation were performed.

## UI

- Team and Integrations settings links are hidden; their old settings URLs redirect to Branding. Remembered settings sections cannot reopen either page.
- Invite members is removed from the workspace switcher. Standalone invitation, team and app-connection components are gated so they cannot render active controls or run their hooks while disabled.
- Registration now has Profile and Workspace steps only. Existing progress on the former Apps/Team steps resumes at Workspace and can finish without invitations or OAuth.
- Tutorial copy, workspace-creation copy, comment team badges and role-specific settings notices are removed or neutralized.
- Share no longer asks users to configure DNS/HTTPS. When a platform base domain is unavailable, it shares the existing application board URL.

## Server

- Integration list/connect/disconnect actions reject requests before auth/database/provider access. OAuth callbacks return 404 without exchanging a code.
- Invitation create/cancel/accept actions and corresponding team service functions reject requests before side effects. Team API returns 403; invitation links show an unavailable message without reading the token.
- The old registration advance action cannot enter the disabled integration stage.
- Owner creation, workspace membership lookup and authorization of existing boards/settings/feedback remain intact. These are data-isolation safeguards, not exposed v1 role-management features. Existing memberships are not revoked.

## Domains

Automatic workspace addresses under the application's configured base domain remain supported. They are part of workspace identity and sharing. There is no implemented user-supplied custom-hostname management route in this app; `customDomains: false` records its excluded status and must guard any future implementation. Optional website fields describe the customer's website; they do not provision a hostname.

## Verification

- Typecheck and focused lint passed.
- `node scripts/check-v1-gates.mjs` passed: three flags off; disabled actions, service functions, team API and OAuth callback return before auth, database or provider access.
- Browser fixture passed: no invitation menu or team/integration settings links; two-step registration; saved old step 3 can finish from Workspace; zero team/OAuth requests. Actual UI components with mocked auth/actions.
- All 12 existing auth/domain unit tests passed. No real invitations, provider connections, account registrations, DNS changes or database mutations were performed in these checks.

Re-enabling later requires a deliberate release change: update the feature flags, restore the relevant navigation/routes and optional onboarding flow, then rerun authorization/OAuth/invitation tests. A flag change alone is not a complete v2 launch.

# Team invitations and live chat operators

Team membership is enabled on `feature/chat-conversations`. Custom admin-role creation/editing remains deferred. No new membership migration is required; the existing invitation/member tables are used.

## Entry points

- Settings → Team: invite up to 10 email addresses, view pending delivery status, cancel invitations and remove members.
- Onboarding: Profile → Workspace → optional Team step. Sending uses the same invitation service; Skip for now completes onboarding without email.
- Invitation acceptance: existing users sign in; new users sign up. Verified email must match the invitation. Missing names are saved through Ent’s profile action to Clerk and PostgreSQL. Accepting selects the joined workspace and does not create a workspace.
- Conversations → Operators: all active workspace members, or an explicit selection. Save changes applies the selection. A selection of nobody leaves incoming messages queued for later.

## Access and delivery

Invitation creation and membership changes serialize on the workspace. Tokens are random, hashed at rest and expire in seven days. Existing members are skipped; duplicate concurrent invitations do not duplicate email. Cancelled links cannot join. Rejoining reactivates the same membership. Owners cannot be removed. Ordinary members cannot invite or change operator selection.

Selected operators can reply in Ent or Slack, appear online in the widget when their presence is current, and receive handoff emails. Selection and active membership are checked again when delivering a queued email. Removing a teammate prunes the operator selection and revokes access. Operator settings refresh after team changes and browser focus; stale IDs are removed from drafts. Shared Slack channel messages retain the channel’s own visibility rules.

## Evidence

- Isolated database checks: existing/new account joins, verified-email binding, hashed tokens, duplicate invitation concurrency, expiry, cancellation, membership isolation, remove/rejoin, selected presence, reply authorization and email-recipient rechecks.
- Browser checks: member-only invitation form and list refresh, removal confirmation, light/dark layouts at 320/390/768px; onboarding Send and Skip paths.
- One requested live invitation was sent, and the recipient confirmed inbox delivery. It used a localhost acceptance link for local testing; production invitations use the deployed app origin.
- Standalone suite (88 tests), scoped lint, TypeScript, documentation validation and production webpack build passed. Slack/provider traffic in database tests is mocked.

The new team flow needs deployment before it is available on the public app. The test dev server is on port 3000. No merge into main is performed by this change.

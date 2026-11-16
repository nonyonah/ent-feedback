# Human support release checklist

Changes ship together on `feature/chat-conversations`. Do not merge into `main` until the live checks below pass. Public Mintlify documentation is included in `documentation/`; its production deployment follows the configured source branch, so pushing this feature branch alone does not publish those changes.

## Before testing Slack

- Deploy this branch to the environment Slack will call. Production Slack URLs will still reach the old implementation until that environment has the new code.
- Apply pending Drizzle migrations through `0015_slippery_madrox.sql` to that environment's database using the normal migration command. Take the normal database backup first; do not copy local database credentials to the repository.
- Verify the existing Slack OAuth, signing and encryption secrets, R2 storage and scheduled maintenance configuration in the deployment. Keep the encryption key stable so saved connections remain readable.
- Confirm Event Subscriptions and Interactivity both target `https://ent.riftlabs.xyz/api/integrations/slack/events` (or the test deployment's equivalent). Reconnect Slack after granting the scopes listed in [the setup guide](README.md#slack-app-configuration-required), and invite the bot to the selected channel.
- Enable the desired board/chat notification switches in Settings → Integrations. Enable live chat and select existing operators in Chat settings. Use matching Slack and Ent email addresses for replying teammates.

## Live acceptance checks

1. Open the widget as a visitor. Send a message; verify it reaches the dashboard and one Slack thread. AI replies must remain disabled.
2. Reply in that Slack thread with text, an emoji and an image. Verify all three appear in the widget and dashboard. Reply from the dashboard and confirm it reaches the same Slack thread.
3. Refresh the visitor page. Verify the conversation restores and another message continues the same conversation. Check New chat separately.
4. Use Slack's Resolve, In progress and Queue buttons. Verify the dashboard status changes, a thread confirmation appears and no status command becomes a visitor message. Test resolving again after reopening.
5. Create feedback, a bug and a feature request. Verify each board alert identifies its type. Reply to a board thread with text, an emoji and an image; verify the correct feedback discussion updates.
6. Verify a Slack user who is not an active Ent workspace member cannot reply into Ent or change a conversation's status.
7. Check the widget on mobile and in dark mode, and confirm its bottom navigation and composer remain stable while messages load.
8. Check hosting logs for successful Slack acknowledgements and maintenance runs. Avoid recording visitor messages, attachment URLs or secrets in shared test evidence.

## Automated verification already completed

Type checking, scoped lint, production build, documentation checks, chat/widget browser regressions, isolated Slack support database checks and prepaid/trial reminder checks passed during implementation. Provider transports were mocked in the automated support and billing tests; these do not replace the live checks above. No live payment or email was sent by those tests.

Card trials remain USD-card-only. Local-currency one-time payment availability depends on the live Bachs account configuration; confirm that separately before advertising individual payment methods.

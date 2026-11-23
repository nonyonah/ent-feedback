# GitHub App for changelog drafts

This app creates private changelog drafts from merged pull requests. It does not read or synchronize GitHub issues.

## Register

Register a public GitHub App under the account that will own it. Configure:

- Homepage: `https://ent.riftlabs.xyz`
- Callback URL: `https://ent.riftlabs.xyz/api/integrations/github/app/callback`
- Setup URL: `https://ent.riftlabs.xyz/api/integrations/github/app/setup`
- Do not select **Request user authorization (OAuth) during installation**; Ent requests it after the installation step.
- Webhook URL: `https://ent.riftlabs.xyz/api/integrations/github/app/events`
- Generate a random webhook secret and configure the same value as `GITHUB_APP_WEBHOOK_SECRET` on the server.
- Repository permission: **Pull requests: Read-only**. Subscribe to **Pull request** events. Do not request issue permissions.
- Make the app available to other accounts so customers can install it.

Set `GITHUB_APP_SLUG`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_WEBHOOK_SECRET`, and the existing `INTEGRATION_ENCRYPTION_KEY` in the deployed environment. Keep secrets out of Git, logs, and messages. This integration keeps a GitHub user authorization token temporarily in an encrypted, HTTP-only cookie for repository selection. It expires after 10 minutes and is cleared after a repository is connected. No app private key is required.

Apply the database migrations as part of the normal deployment. Configure app URLs for the actual environment when using a staging deployment; a separate GitHub App is recommended for staging.

## Test

1. Open Changelog in Ent as a workspace owner or admin. Select the GitHub icon, enter the repository as `owner/repository`, and install the app for that repository.
2. Authorize the GitHub account when prompted. Choose the repository from the returned list and keep the dialog open until previous merged pull requests have been imported as drafts. Reconnect to retry a stopped import.
3. Merge a test pull request with a title and description. Refresh the Changelog dashboard and confirm exactly one private draft appears. It contains the pull request title and description; review it before publication.
4. Redeliver the same webhook in the GitHub App's delivery history and verify no second draft is created. Merge a PR labeled `skip-changelog` and verify no draft appears.
5. Remove the repository from the installation or uninstall the app. Verify new PRs no longer create drafts. Ent's Disconnect button also stops drafts but does not uninstall the app in GitHub.

Check the GitHub App's webhook delivery history for failed deliveries. GitHub does not automatically redeliver failed deliveries. Local development requires a publicly reachable HTTPS forwarding URL and a separate development GitHub App, with its callback, setup, webhook URL, and `NEXT_PUBLIC_APP_URL` configured consistently.

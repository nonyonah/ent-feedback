# Workspace app connections

Slack and Discord use server-side OAuth authorization-code grants. The same app connection component is used by registration step 3 and Settings → Integrations. Only workspace owners/admins can connect or disconnect apps; members can read connection status. No personal-account linking or message ingestion is implemented by these grants.

## Configuration

Set the following server-only values in your deployment environment (see `.env.example`):

- `NEXT_PUBLIC_APP_URL`: canonical application origin, including port locally.
- `INTEGRATION_ENCRYPTION_KEY`: a stable base64-encoded 32-byte key. Generate using `openssl rand -base64 32`. Preserve it across deployments; rotating it requires re-encrypting existing credentials.
- `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET`: from your Slack application.
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`: from your Discord application.

Register these exact redirect URLs, replacing the origin with your application origin:

- `https://your-app.example/api/integrations/slack/callback`
- `https://your-app.example/api/integrations/discord/callback`

For local development use `http://localhost:3000` if the provider permits it, or a configured HTTPS development origin. Do not mix hostnames during the authorization round-trip.

Slack: enable Incoming Webhooks and add the `incoming-webhook` bot scope under OAuth & Permissions. The authorization screen asks the installer to select a channel. No chat-history access is requested.

Discord: configure the OAuth2 redirect URL and use the authorization-code flow with `webhook.incoming`; the provider asks the installer to select a server/channel. A separate bot token is unnecessary for this grant.

## Storage and callbacks

`integration_connections.encrypted_secret_ref` stores a versioned AES-256-GCM envelope containing the provider grant and channel webhook credentials. Despite its historical column name, it contains ciphertext, not a plaintext token or external vault identifier. Encryption authenticates workspace ID and provider as associated data. Connection status APIs return only provider/state and management permissions.

OAuth starts from a Server Action. Its ten-minute HttpOnly SameSite=Lax state cookie binds the nonce, provider, initiating app user, workspace, expiry and allowlisted return screen. Callback processing consumes the cookie, verifies these bindings and rechecks membership before exchanging the code and saving the grant. Provider payloads are not exposed through error redirects. Cancellation and failure return to the original setup screen after state verification.

Disconnect revokes the Slack token; Discord disconnect deletes the created webhook and revokes the OAuth token before clearing credentials locally. There is currently no background notification delivery worker or inbound message ingestion; these connections establish and persist authorization for that backend work. No notification is sent merely by connecting an app.

## Verification

Run `node --conditions=react-server --import tsx --test tests/integrations.test.ts` for mocked provider exchanges, credential tampering/context binding, state/session checks and redirect safety. These tests do not contact providers or mutate the database.

Live acceptance requires configured provider apps and a real authorized owner/admin: connect each provider, cancel a connection, return from onboarding, reload settings and disconnect. Confirm workspace isolation using a different workspace/member. These live account operations are not performed by automated tests.

References: [Slack OAuth](https://docs.slack.dev/authentication/installing-with-oauth/), [Slack incoming webhooks](https://docs.slack.dev/reference/scopes/incoming-webhook/), [Discord OAuth2](https://github.com/discord/discord-api-docs/blob/main/developers/topics/oauth2.mdx).

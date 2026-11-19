# Linear and Discord: prepared, not launched

Both integrations appear under Settings → Integrations with official logos and disabled **Coming soon** buttons. Their server-side gates default to false. Existing Slack connections, settings and credentials remain unchanged. No live provider calls or customer messages are made while the gates are off.

## What is implemented

**Linear:** workspace OAuth with PKCE, encrypted access/refresh credentials, serialized rotating-token refresh, a default team and explicit four-state mapping, create or link an issue from dashboard feedback, stable issue IDs for retry safety, and signed webhooks that sync current Linear state into Ent. The current Linear state is fetched instead of trusting a possibly stale event. Existing Ent status history, roadmap timestamps, in-app notices and preference-aware email notifications are used. Issue comments are not mirrored; customer conversations stay in Ent. Ent status changes do not write back to Linear in this first version.

**Discord:** install to a server/channel through OAuth, board and live-chat delivery, category labels, emoji and image previews, notification preferences, Reply button → Discord reply modal, and progress/resolution buttons. Replies are stored in Ent and trigger its usual notification flow. Members explicitly link their Discord identity through OAuth; Discord usernames and emails are never used to guess authorization. Active Ent membership is checked on every action, and conversation actions also require a selected operator. Plain Discord channel messages are not imported: no Gateway/WebSocket service or message-content intent is needed.

Provider credentials stay encrypted server-side. Payloads are bounded, Discord Ed25519 and Linear HMAC signatures and fresh timestamps are verified, queued actions are deduplicated, and delivery jobs use leases and bounded retries. Discord interaction tokens are encrypted in jobs and expire after 14 minutes. Mentions are disabled on outgoing Discord messages. The existing scheduled notification maintenance endpoint also processes integration jobs, and inbound endpoints request an immediate drain after acknowledgement.

## Enable later

Adding API keys alone is **not** sufficient for OAuth integrations. The code is ready for provider app setup, migration and real-account acceptance tests. Keep both gates false until those tests pass.

1. Apply `drizzle/0025_connected_apps.sql` through the normal `npm run db:migrate` deployment workflow. This adds four tables with RLS enabled; it does not modify existing Slack storage. This migration has not been applied to the production database as part of this work.
2. Ensure `NEXT_PUBLIC_APP_URL` is the production origin and `INTEGRATION_ENCRYPTION_KEY` is the existing 32-byte base64 key. Do not rotate that key casually: existing Slack credentials use it too.
3. Create the provider applications as below; store credentials in hosting environment variables, never client code or Git.
4. Enable the selected provider gate on a test deployment, authorize a workspace and configure its settings.
5. Confirm real OAuth, revocation, token refresh, delivery, actions and notifications before enabling publicly.

### Linear

Environment variables:

```
LINEAR_ENABLED=false
LINEAR_CLIENT_ID=
LINEAR_CLIENT_SECRET=
LINEAR_WEBHOOK_SECRET=
```

- Register `https://ent.riftlabs.xyz/api/integrations/linear/callback` as the OAuth callback.
- Authorization requests use `actor=app`, PKCE and `read,issues:create` scopes. No broad admin scope is requested.
- Configure the OAuth application's Issue and OAuth authorization/revocation webhooks at `https://ent.riftlabs.xyz/api/integrations/linear/events`; copy its webhook signing secret to the environment.
- Enable `LINEAR_ENABLED=true` on the test deployment, connect, select a team and four distinct workflow states, then save.
- A connected member can create or link an issue from a dashboard feedback detail. Existing issues must belong to the selected team; each issue links to one feedback item per Ent workspace connection.
- Unmapped Linear states leave the Ent status unchanged. Moving to Shipped does not automatically opt voters into a shipped broadcast; the usual status preferences still apply.
- Linear currently returns expiring access and refresh credentials. Refresh is serialized and stored atomically; expired/revoked refresh credentials require reconnection. An installation unused beyond the provider refresh-token lifetime may need reconnecting.

### Discord

Environment variables (existing client ID/secret fields are reused):

```
DISCORD_ENABLED=false
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_PUBLIC_KEY=
```

- Create a Discord application and bot. Set the OAuth redirect to `https://ent.riftlabs.xyz/api/integrations/discord/callback`.
- Configure Interactions Endpoint URL as `https://ent.riftlabs.xyz/api/integrations/discord/interactions`. Discord sends a signed PING; the endpoint must be enabled/configured to validate it.
- Enable `DISCORD_ENABLED=true` on a test deployment before verifying the endpoint. Then install with `identify webhook.incoming bot` scopes. Permissions requested: View Channel, Send Messages, Embed Links, Attach Files and Read Message History (117760). No Administrator permission.
- Install into the intended server and channel. Check bot/channel overrides allow posting. Choose a regular text channel for this first release.
- The installer is linked automatically. Other teammates click **Link account** in Ent Settings → Integrations, then authorize their own Discord identity before using message actions.
- Replies are plain text plus Unicode emoji through the reply modal. Outgoing image previews are supported; uploading a new image inside a Discord modal is not supported in this release.
- Each notification has Reply, progress/status and Open Ent controls. Actions on old messages are authorized against the current workspace, connection, channel and membership.
- Discord bot nonces and delivery receipts reduce duplicate sends on retry; as with external APIs without durable idempotency guarantees, a very late retry after an ambiguous send can duplicate a notification. Ent reply/status mutations remain idempotent by interaction ID.

## Validation

- `node --conditions=react-server --import tsx --test tests/connected-apps.test.ts`
- `node scripts/check-chat-db.mjs --integrations` — isolated temporary PostgreSQL schema, all migrations, mocked provider APIs; no customer writes or real provider messages.
- `npx tsc --noEmit`
- Scoped ESLint and production build.

Provider-account end-to-end acceptance is deferred until credentials and applications are configured.

## Official assets and API references

Assets are hosted locally; no third-party image requests are required in Settings.

- Linear logo: `logo-dark.svg` from [Linear's official brand pack](https://linear.app/brand), downloaded from `https://static.linear.app/design-assets/Linear-Brand-Assets.zip`.
- Discord symbol: official black symbol from [Discord's brand page](https://discord.com/branding), `https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/66e3d8014ea898f3a4b2156c_Symbol.svg`.
- [Linear OAuth](https://linear.app/developers/oauth-2-0-authentication), [Linear webhooks](https://linear.app/developers/webhooks).
- [Discord OAuth](https://docs.discord.com/developers/topics/oauth2), [Discord interactions](https://docs.discord.com/developers/interactions/receiving-and-responding), [Discord webhooks](https://docs.discord.com/developers/resources/webhook).

## Verification (2026-11-19)

- Production webpack build passed (58 pages); TypeScript and scoped ESLint passed.
- All 97 unit tests passed, including new signature/replay, payload size, safe destination and state-mapping tests.
- `node scripts/check-chat-db.mjs --integrations` passed against an isolated temporary Neon schema with provider HTTP mocked. It exercised launch gates, the new migration/RLS, OAuth state rejection, serialized refresh, issue creation/link deduplication, Linear webhook/status flow, permissions, Discord delivery retries, replies, statuses, selected-operator restrictions, signed ping, credential redaction and Linear revocation. Temporary schemas are removed by the runner; production tables were not migrated.
- `node scripts/check-chat-ui.mjs --integrations` passed at 320, 390 and 768px in light and dark modes. Both official logo images loaded, Coming soon buttons stayed disabled and content did not overflow. Final screenshots: `/var/folders/dg/ylzprv1s7zz6g4cbv3srrfmc0000gn/T/ent-chat-ui-R3Uz4t`.
- `npm run docs:check`, `npx drizzle-kit check` and `git diff --check` passed.
- Live Linear/Discord authorization and delivery remain untested: no new production credentials were supplied and neither launch gate was enabled.

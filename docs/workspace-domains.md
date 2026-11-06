# Workspace names and subdomains

Workspace names are globally unique, ignoring case and repeated whitespace. Both creation flows check availability while typing and on submission. The `workspaces_name_normalized_unique` expression index enforces uniqueness under concurrent requests. Workspace domains remain globally unique and become their subdomain labels. New domain labels require 5–40 characters; existing shorter workspace URLs remain routable. The fixed `.feedback.riftlabs.xyz` suffix appears inside both creation inputs. Server-confirmed availability shows a green checkmark independently for the workspace name and domain. Infrastructure names such as `app`, `api`, `auth` and `www` are reserved for new workspaces.

Recommended namespace for this product:

- Application: `feedback.riftlabs.xyz`
- Workspace: `acme.feedback.riftlabs.xyz`
- Board: `acme.feedback.riftlabs.xyz/boards/product`

This keeps `dobby.riftlabs.xyz` and other products separate. A customer's optional website is informational; entering a website does not prove domain ownership or grant access to another workspace.

## Enable production subdomains

1. Point `feedback.riftlabs.xyz` and `*.feedback.riftlabs.xyz` at the deployment using the DNS records required by your hosting provider. Register both domains with that provider. Wildcard routing handles newly created workspaces without a DNS API call per workspace.
2. Ensure the deployment serves valid HTTPS certificates for both the application domain and `*.feedback.riftlabs.xyz`. A certificate for `*.riftlabs.xyz` alone does **not** cover `acme.feedback.riftlabs.xyz`.
3. Set `NEXT_PUBLIC_APP_URL=https://feedback.riftlabs.xyz` and `NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN=feedback.riftlabs.xyz`. Rebuild/redeploy because public environment variables are bundled into the client. Keep the subdomain variable unset until DNS, hosting and TLS are ready.
4. Configure Clerk for the production application origin and public workspace subdomains using Clerk's supported subdomain setup. Check modal sign-in, sign-up and session behavior on workspace hosts. Management and full-page auth routes redirect to the canonical application origin.
5. Update Slack/Discord redirect URLs to the canonical app origin as described in `oauth-integrations.md`.

No DNS or certificate changes are performed by application code. The existing `/p/{workspace}/boards/{board}` URLs remain available. Before the base domain is configured, navigation continues to use these paths. Share displays and copies the proposed workspace-domain URL using the same base domain as workspace creation, while its Preview action opens the working path-based board. A setup-pending note distinguishes the proposed address from an activated domain.

## Routing and data

Proxy resolves exactly one valid workspace label beneath the configured base domain. It rewrites public board, submission, following and item URLs to workspace-scoped routes. Unknown workspaces return 404. A tenant host cannot use `/p/another-workspace/...` to change its workspace. Public workspace metadata loading selects only public presentation fields and board metadata, never memberships or integration credentials. It does not complete the separate feedback persistence/backend handoff.

## Checks

- `node --import tsx --test tests/workspace-domain.test.ts`
- `npm run db:check`
- `npm run typecheck`

The name uniqueness migration is `drizzle/0002_smooth_pestilence.sql`. It does not rename or delete existing workspaces. If applying it to another database fails due to duplicate names, resolve those names with their owners before retrying.

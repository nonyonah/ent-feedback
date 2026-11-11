# Mintlify documentation setup

Prepared 11 November 2026. Public help content is in **`documentation/`**, separate from internal audits and implementation notes in `docs/`.

Public documentation URL: **https://ent.riftlabs.xyz/docs**. Ent's website and application keep the domain root. Mintlify serves only the documentation paths through the application's proxy. The earlier ent-docs.riftlabs.xyz proposal is superseded.

## Local commands

From the repository root:

```sh
npm run docs:dev
npm run docs:check
npm run docs:validate
```

Preview uses http://localhost:3001, leaving port 3000 for the app. The scripts pin Mintlify CLI 4.3.16 and fetch it through npx; it is not an application runtime dependency. The first run needs network access. Public configuration is `documentation/docs.json`.

`docs:check` checks all navigation targets, page metadata, internal links and branding assets, and compares documented board allowances, prices and trial length with app constants. `docs:validate` invokes Mintlify's own content/configuration/build validation. Run both when editing public help content. Mintlify's `broken-links` command can additionally check links from the documentation directory.

## Publish at /docs

1. Connect the Ent Mintlify project to **nonyonah/ent-feedback**, production branch `main`, content directory **`documentation`**. Keep the existing Hedwig project unchanged.
2. In the Ent project's custom-domain settings, register **ent.riftlabs.xyz/docs**, with base path **/docs** and reverse-proxy hosting. The repository directory does not configure this public base path.
3. Set **MINTLIFY_ORIGIN** in the app's local/hosting environment to the Ent project's exact HTTPS origin, `https://ent-docs.mintlify.site`. This is server-only configuration, not a token. Restart/redeploy the app after changes.
4. Push the reviewed docs to the connected branch and let Mintlify build them with its /docs base path.
5. Deploy the Next.js app with the proxy changes. Keep `ent.riftlabs.xyz` DNS pointing at the application host; do not change the entire domain's CNAME to Mintlify.
6. Verify `/docs`, `/docs/widget/install`, `/docs/account/billing`, `/docs/llms.txt`, root `/_mintlify/*` assets/API requests and `/mintlify-assets/*` assets. Check navigation, search, images, browser reloads and mobile layout.

The proxy preserves the public /docs prefix. Mintlify's shared asset/API prefixes stay at the domain root. The legacy `/api/request` endpoint maps to `/_mintlify/api/request`. No global Next.js basePath is changed, and the app's `_next`, authentication, billing and widget routes keep their own routing.

Public documentation requests bypass Clerk. An allowlist forwards only content/HTTP navigation headers and the Mintlify origin; application cookies, Authorization, Clerk tokens and incoming forwarded headers are removed. Only a fixed HTTPS `*.mintlify.site` origin is accepted. Missing/invalid configuration returns a no-store 503; workspace subdomains cannot use the main app's docs proxy. Both GET and POST requests can reach the documentation service.

GitHub/Mintlify project configuration still requires the account owner's authenticated access. Do not register the app's root domain against the existing Hedwig project. Local preview at port 3001 serves the content independently; the app's /docs URL relies on the published Ent Mintlify site and its configured base path.

References: [Mintlify subpath hosting](https://www.mintlify.com/docs/deploy/docs-subpath), [Mintlify reverse proxy](https://www.mintlify.com/docs/deploy/reverse-proxy), installed Next.js proxy and rewrites guides.

## Content

Sixteen pages cover introduction, quickstart, workspaces, boards, feedback types/statuses/tags, conversations/votes, sharing, widget installation/settings/troubleshooting, notifications, account appearance, billing, privacy and support.

Sources are the current application components, widget loader, feature flags and billing constants. No public API, host-user SSO, custom domain setup, integrations, team roles or export capability is invented. The widget example deliberately uses explicit placeholders until copied from the application's Share screen; users should copy the actual snippet from Share.

The documentation uses Ent's mascot logo, Inter typography and charcoal accent, with light/dark appearance through Mintlify. No PostHog integration is silently added to the documentation host; its analytics/consent setup is a separate decision from the app's existing integration.

## References

- [Mintlify quickstart](https://www.mintlify.com/docs/quickstart)
- [Mintlify CLI commands](https://www.mintlify.com/docs/cli/commands)
- [Mintlify monorepo setup](https://www.mintlify.com/docs/deploy/monorepo)

## Verification on 11 November

- Mintlify validation and strict build: passed.
- Mintlify broken-links check: no broken links found.
- Repository content check: 16 pages, 12 internal links, brand assets and billing consistency passed.
- Browser preview sampling: home, widget installation and billing at 390px and 1440px; all returned HTTP 200, with no horizontal overflow, broken images or browser errors. See `documentation-preview-checks.json`.
- Preview started at http://localhost:3001. Stop it with Ctrl+C in its terminal when finished, or restart later with `npm run docs:dev`.
- Ent upstream confirmed as https://ent-docs.mintlify.site and configured locally. Domain/base-path registration and production deployment must be verified separately. Keep Hedwig unchanged.

## Domain registration

Mintlify accepted `ent.riftlabs.xyz` with base path `/docs` on the selected `ent-docs` project on 11 November. Local `MINTLIFY_ORIGIN` is set to `https://ent-docs.mintlify.site`.

Add the verification records at the DNS provider:

| Type | Name (relative to riftlabs.xyz) | Value |
| --- | --- | --- |
| TXT | `_acme-challenge.ent` | `TUKJPLu8-PnAp6qN21Zv_PT0NLreC9tYk0gPX9lqCyY` |
| TXT | `_cf-custom-hostname.ent` | `3fde8bc6-cf4e-433f-ac69-204bfcf1b434` |

Keep the existing application DNS for `ent`. Do **not** add Mintlify's suggested root CNAME: it would send the entire app domain to Mintlify. The app proxy handles `/docs` instead. These are public domain-verification records, not API secrets. DNS verification, the Git-backed Mintlify build and deployment of the app proxy remain separate checks.

## Publication recheck

The upstream `https://ent-docs.mintlify.site/docs` returned HTTP 200 but still rendered **Mintlify Starter Kit**, not the Ent pages, during the follow-up check on 11 November. The connected production source needs verification: `nonyonah/ent-feedback`, branch `main`, directory `documentation`, followed by a successful deployment. A responding hostname alone is not publication evidence.

`https://ent.riftlabs.xyz/docs` did not resolve in the same check. Main application DNS/deployment and Mintlify domain verification remain outstanding. Do not describe the public documentation URL as live until the Ent content, assets, navigation and search are verified there.

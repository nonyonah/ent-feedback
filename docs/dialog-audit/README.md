# Dialog and mobile public-board review

14 November 2026. Applied better-interface, better-layout and emil-design-eng, with the accessibility, typography, writing, color and UI owners as references.

Scope: dashboard type/tag editing, create-board and rename-board dialogs, shared feedback type selector, and the mobile public-board toolbar. This is not a full-app audit.

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| Medium | `src/components/feedback/request-classification.tsx` | Type/category pill used an inline wrapper with inconsistent rounding. | Inline-flex pill with fully rounded ends, matching tag pills. | Consistent geometry around the label and colored dot. |
| Medium | `src/components/feedback/feedback-type-select.tsx` | Type selector fixed to 160px. | Noncompact selector fills its parent; compact composer selector remains compact. | Shared leading/trailing edges in the tag editor. |
| Medium | `src/components/feedback/request-classification.tsx` | Responsive button defaults overrode explicit height; input inner height exceeded its wrapper. | 36px desktop / 44px mobile controls; input fits its wrapper. | Equal heights and stable alignment, with mobile touch targets. |
| Medium | Create, rename and classification dialogs | Overflow could clip actions on short screens; heading could crowd close control. | Scrollable popup, reserved close-control space and consistent form heights. | Actions remain reachable and headings remain readable. |
| Medium | `src/server/actions/billing.ts` | Every provider failure became a generic retry message. | Known Bachs statuses explain permissions, customer/environment mismatch, rate limits or portal configuration. Network failures have a separate message. | Recovery depends on the actual failure; retrying cannot fix permissions. |

## Verification

- Offline Chromium fixture rendered the actual React/Base UI components and app CSS, with mocked server actions/providers. **22 checks passed**, zero browser errors: 320/375/768/1280 widths, light/dark, LTR/RTL, matching type/input/button dimensions, tag creation, scroll access at 320×380, type selection, load retry, inline create/save failures, focus restoration, create/rename sizing. Long list contained 30 tags. Mobile light/dark screenshots inspected.
- Actual mobile public toolbar regression: **52 checks passed**, zero browser errors; widths 320–1440, both themes and directions, status/sort choices, Escape/focus restore, 200% CSS zoom, long labels and reduced motion. Details: `docs/public-board-audit/mobile-toolbar.md`.
- Existing semantic colors, type labels, field-error associations and Base UI focus handling retained. Mobile text inputs use 16px to avoid iOS focus zoom. No new animation or color system introduced.
- Billing unit checks cover redirect restrictions and sanitized error mapping. TypeScript and targeted ESLint passed.
- One existing sandbox customer successfully received a fresh portal session from the configured Bachs sandbox API. Only its destination hostname was inspected: `sandbox-billing.bachs.io`; no session credential was logged or stored. Earlier attempts encountered network failures. This does not establish that the deployed Netlify environment is identical.

Not verified: physical Safari/iOS, VoiceOver, full authenticated browser flow, pending server actions under real network latency, deployed billing button after deployment. Offline font fallback was Arial; production Inter was not downloaded. Dialog-specific 200% zoom and screen-reader announcements were not tested.

## Billing follow-up

The integration creates a fresh server-side portal session for the workspace's stored customer and preserves owner authorization and strict HTTPS destination validation. It does not fall back to another customer's session or bypass sandbox/live isolation. Deploy this change, then retry Manage subscription. The toast distinguishes documented errors; server logs record only numeric provider status (or null for network/unknown failures).

Bachs references: [Create a portal session](https://docs.bachs.io/guides/customer-portal/create-portal-session), [Customer portal setup](https://docs.bachs.io/guides/customer-portal/overview). API keys need `customers:write`; customers belong to their original environment. Persistent 503 requires Bachs portal configuration/support attention.

**Verdict: Approve the inspected UI scope. Deployed billing resolution remains unverified.**

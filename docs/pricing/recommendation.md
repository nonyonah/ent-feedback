# Pricing proposal — 9 November 2026

The `/pricing` page is a reviewable commercial proposal, not a live checkout. Its CTA opens workspace registration. No subscriptions, payments, trials, usage entitlements, or cancellation policies are implemented by this change.

## Recommendation

Test one Essentials subscription at **$7 USD per workspace per month**, or **$70 USD per year** ($5.83/month equivalent; $14 saving, approximately 16.7%). Charge workspace owners rather than public contributors. This is a positioning hypothesis, not a revenue or margin forecast.

Include public boards, the embeddable widget, votes/comments/replies, categories/tags, statuses/history, search/trending, branding/theme, and notifications. Keep integrations, custom domains, and team roles/permissions out of v1, matching `src/lib/features.ts`.

Before paid launch, agree and disclose board count, attachment/storage limits, email usage, abuse/fair-use policies, cancellation/refunds, and applicable taxes. Validate hosting, database, R2, email, and Clerk costs against expected usage. Do not advertise unlimited storage or introduce a free-trial promise before the corresponding rules exist.

## Research

Primary sources checked on 9 November 2026:

- [UserJot pricing](https://userjot.com/pricing): Free plan with two boards; Starter $29/month and Professional $59/month. Unlimited posts and users. Its paid plans include capabilities outside our current v1.
- [Canny pricing](https://canny.io/pricing): Free includes 25 tracked users; Pro starts at $79/month billed yearly with 100+ tracked users. Broader AI and integration capabilities make it an upper-market comparison.
- [Featurebase pricing](https://www.featurebase.app/pricing): a broader support-and-feedback suite with seat-based paid plans. Not a direct like-for-like benchmark for a focused v1.

A low price alone does not beat competitors' free tiers. The differentiator to validate is a focused, polished board-and-widget workflow with predictable workspace pricing. Interview target customers and test willingness to pay before treating $7 as final.

## Interface review scope

New pricing screen, monthly/yearly selection, registration links, landing-page pricing navigation and removed preview caption. Next.js 16, React 19, Inter variable, CSS Modules, existing coss/Base UI Button, Hugeicons, app theme tokens. Reference: supplied Cursor pricing screenshot. Project conventions: AGENTS.md and docs/feedback-board-design-system.md, with subsequent user direction for charcoal pill buttons taking precedence over historical defaults.

All six better-interface domains were reviewed: accessibility, layout, writing, typography, colors, and UI. No invented customer logos, compliance badges, checkout actions, or operational guarantees were added.

### Coverage and verification

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Native radio group with legend; named links/buttons; keyboard arrow selection; one main/header | Clear in inspected browser paths |
| Layout | Screenshots at 1440px and 390px; widths 320, 390, 768, 1440; 200% CSS zoom | No horizontal overflow; cards stack in DOM order |
| Writing | Every feature, CTA, billing sentence, FAQ against current v1 feature flags | Clear; proposal and inactive checkout disclosed |
| Typography | Inter variable; headline 44/35px; card titles 19/21px, FAQ 16px; body 13–16px | Clear; no observed text clipping |
| Colors | Light body #686e73 on white 5.16:1 and #f5f6f6 4.77:1; dark #aaaeb2 on #242424 6.95:1 | Passes 4.5:1 normal-text threshold |
| UI | Existing pill Buttons, static FAQ grid, native selector, shared theme tokens | Clear in inspected states |

No actionable interface findings remain within the inspected paths. **Approve** for this reviewable pricing proposal; this verdict does not approve a commercial launch or imply billing is connected.

Commands: `npx eslint src/components/marketing/pricing-page.tsx src/app/pricing/page.tsx src/components/marketing/landing-page.tsx src/components/feedback/site-header.tsx` passed. Browser script `/tmp/pricing-check.cjs` verified displayed annual price $10/month with $120 yearly total, keyboard radio selection, light/dark screenshots, single site header, responsive widths, CSS zoom, and removed landing caption.

Not verified: native browser zoom, physical touch devices, a screen-reader walkthrough, RTL/pseudo-localized pricing content, checkout (not implemented), and real cost or willingness-to-pay validation. This page has no remote data/loading/error states; pricing selection is local and registration is an ordinary link.

The owner revised the proposed monthly price to $7; the corresponding annual proposal is $70 (a $14 saving). Previous verification figures above describe the earlier iteration.

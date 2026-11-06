# Secondary surfaces and input color audit

6 November 2026 · better-colors · default Ent accent, light and dark appearances.

The audit findings are implemented. The brand accent remains `#7443E9`; this pass corrects surface roles and theme consistency rather than introducing a new palette.

## Implemented findings

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `src/app/globals.css:125`; `src/components/ui/input.tsx`, `textarea.tsx`, `input-group.tsx`, `select.tsx`, `number-field.tsx` and related field primitives | The input border token also supplied translucent dark field fills. | Separate `control-surface` and `input` roles in both themes. Fields use the surface role; borders retain their own role. | Border tuning can no longer accidentally change field backgrounds. |
| LOW | `src/components/feedback/site-header.tsx`, `feedback-form.tsx`, `account-settings.tsx`, `dashboard-settings.tsx`, `widget-settings-view.tsx` | Quiet controls used independent hex and opacity recipes. | Shared `control-quiet`, `control-hover` and `control-pressed` roles. Ordinary field fill is white in light mode and #242423 in dark; quiet fill is #F5F5F4 and #2B2B2A. | Secondary controls now follow the same neutral system. Public feedback composer controls retain their requested flat interaction treatment. |
| MEDIUM | `src/app/globals.css:124`, `:147`, `:151`, `:189`, `:211`, `:215` and related foreground roles | Some destructive, information and warning declarations exceeded sRGB without an explicit fallback. | Explicit sRGB hex declarations for those roles and their foregrounds. | Narrow-gamut displays no longer depend on implicit browser gamut mapping for these colors. |

Public header search and sign-in, account theme, branding controls, widget settings and the feedback dialog use the shared quiet surface where appropriate. The type selector sits beside the board selector with rounded corners. The tag editor follows the compact board-creation dialog structure. Public feedback text fields have no focus ring or focus underline; action buttons elsewhere retain keyboard focus treatment.

## Measurements

538 rendered text/control measurements across eight view variants in each appearance. All sampled enabled normal-text pairs meet 4.5:1. Lowest sampled normal-text ratios: light: 5.451:1; dark: 5.486:1. All 33 inspected semantic roles resolve within sRGB in both themes. These measurements cover the default accent and the states described below.

Foreground alpha is composited over painted ancestor backgrounds. Browser canvas conversion resolves CSS OKLCH and `color-mix()` to sRGB. Center fills are measured; border-edge shadows are not treated as text backgrounds. WCAG 2 normal-text AA, 4.5:1, is this audit’s comparison threshold. APCA remains a diagnostic in the evidence, not a substitute threshold or a formal conformance claim. Disabled controls are excluded.

Evidence: [rendered pairs and semantic token checks](rendered-pairs.json). `node scripts/summarize-color-audit.mjs <browser-measurements.json>` computes WCAG/APCA and gamut results. The local browser fixture is `/tmp/ent-audit/colors.cjs`, using actual components/CSS with mocked account, workspace and server data.

## Image and dialog validation

- Feedback and comment DTOs include saved author image URLs. The public list, participant avatars, detail author, comments, dashboard and widget consume those URLs, retaining gradient fallbacks when images are missing or fail.
- Anonymous post image URLs remain withheld; PostgreSQL integration assertions cover this boundary.
- Workspace images loaded after explicit Save and reload in a local browser. Branding saves now invalidate public workspace layouts and embed pages so later navigation does not retain an old logo payload.
- Browser checks cover adjacent board/type selectors, ring-free focused feedback text, tag creation/assignment and the redesigned tag dialog. Workspace/profile image checks use local image fixtures, not production Clerk photos.

## Verification limits

Verified: both themes, the inspected computed semantic roles, enabled rendered text and placeholders in eight view variants, translucent flat fills, sRGB gamut, public workspace identity, image rendering with fixtures, and targeted dialog interactions.

Not verified: every application route; custom workspace palettes; every hover/pressed/error/loading color pair; every open menu/dialog contrast pair; image/gradient text backgrounds; all ancestor opacity effects; translucent headers over every possible scrolled background; production Clerk sessions and deployed cross-domain routing. The color sample does not establish whole-app accessibility conformance.

Approve — inspected default-accent views only. No remaining actionable color findings in that measured scope.

## Reference polish pass — 6 November 2026

Applied the supplied neutral SaaS reference to the existing Inter/purple system. Kept Inter variable and 13–14px UI sizes; request titles render at 13px, weight 500, 19.5px line height in both appearances. Counter badges now use medium weight. Set an explicit body line height of 1.5.

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `src/app/globals.css` | Warm gray page/control surfaces mixed with cool secondary gray | Neutral gray page, quiet-control and secondary roles in both appearances | One neutral family gives related surfaces a consistent hierarchy. |
| LOW | `src/components/feedback/dashboard-sidebar.tsx`, `dashboard-settings.tsx` | White selected rows with inset outlines and opacity-based navigation text | Soft gray selected fill and semantic secondary text | Reference uses restrained selection and stable text roles rather than raised navigation cards. |
| LOW | `src/components/feedback/dashboard-view.tsx` | Local translucent row/vote surfaces | Shared quiet-control surface | Reuses the same neutral role as other compact controls. |

Verification: production webpack build, targeted ESLint and TypeScript passed. Browser fixture checked actual components with mocked data at desktop and 390px mobile width. Inter loaded in both themes. Re-measured 534 rendered text/control pairs across eight views in light/dark; normal-text minimum 5.022:1 light and 5.480:1 dark. No measured normal-text pairs below 4.5:1; no inspected token out of sRGB gamut. Updated `rendered-pairs.json` supersedes earlier measurements. Not verified: every interactive/disabled state, all settings sections, arbitrary workspace palettes or live production data. Approve for inspected coverage.

Empty states now use four distinct monochrome Isocons objects. Attribution and modifications are documented in `docs/third-party/empty-state-illustrations.md` and shipped with the assets.

## Dark mode and status dots — 6 November 2026

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `src/app/globals.css` | Near-white dark text, translucent borders and no native color-scheme declaration | Softer foreground, explicit layered charcoal surfaces/borders and light/dark native control schemes | Improves consistency across app chrome, cards, popovers and native controls. |
| LOW | `src/components/feedback/status-label.tsx` | Colored status glyph and text | Bright semantic dot with inherited neutral text; label/accessible name retained | Status stays identifiable without tinting sidebar text. |
| LOW | `src/components/feedback/widget.tsx`, `feedback-form.tsx`, `submit-dialog.tsx`, `submission-page.tsx` | Black separators/borders disappeared on dark surfaces | Theme-aware border tokens | Surface structure remains visible in either theme. |
| LOW | `src/components/feedback/dashboard-sidebar.tsx`, `notifications-panel.tsx` | Neutral counts; bell had no unread count | Compact primary-filled counts and unread badge with primary foreground | Badges follow saved workspace accent, including portalled settings UI. |

Browser fixture verified both color schemes, neutral status labels, distinct status dots, notification badges updating from Purple to saved Emerald, mobile bounds, and all eight quick-tour steps including Requests and status filters. Empty-state artwork loads in public/inbox/following/widget views. Isocons attribution stays visible as required by its license; empty-state copy shortened. Production build and targeted ESLint passed. Latest 548 rendered text/control pairs across eight views: normal-text minimum 5.022:1 light, 5.642:1 dark, no inspected normal-text failures or out-of-gamut tokens. Measurements precede the final badge-size reduction, which changed geometry only. Not verified: every interaction state, arbitrary workspace accents, or live authenticated production data. Approve for inspected coverage.

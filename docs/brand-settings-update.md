# Branding and explicit settings saves

Updated 6 November 2026.

- The public and widget headers use the supplied logo mark without wordmark text. The full wordmark asset remains available in public/brand.
- The supplied layered-card mark is used for the favicon and Apple touch icon. Following the launcher revision, the launcher uses text rather than an image.
- The official primary is `#7443E9`, sampled from the central purple of the supplied mark. White text has a 5.64:1 contrast ratio on this color. App tokens, Clerk styling, new-workspace defaults and transactional email styling use the new accent. Migration 0005 updates workspaces using the previous default purple; other custom colors are preserved.
- Both in-app and embedded launchers are borderless, bottom-right “Submit feedback” buttons. Their surface and text follow the app’s light/dark theme. Embedded theme messages retain origin and source checks. Popup borders/default focus outlines are removed; keyboard focus remains visible on the launcher.
- Dropdown chevrons have explicit centered wrappers and overlaid SVGs. They show down when closed and up when expanded.
- Requests use the sort control in the header. The duplicate All statuses dropdown is removed; sidebar status navigation remains.
- Branding, widget settings, account appearance and notification preferences now edit drafts. Save commits changes, Discard restores saved values, and failed saves keep the draft. Widget greeting blur and its Default button no longer write settings automatically. Profile/photo changes already used the explicit profile Save action.

Verification: TypeScript, targeted lint, settings-action checks, migration consistency and a production webpack build passed. Browser checks with actual components and mocked persistence covered no change/blur autosave, grouped saves, Discard, failed-save retention, chevron centering/open state, header sort placement, smaller logos and 320px overflow. A separate browser check covered the actual embed loader’s theme messages, rejected spoofed messages and open/Escape-close behavior. No test settings were written to user workspaces.


## System theme and image follow-up

The embed now transmits `themeMode` separately from the resolved theme. System mode follows live `prefers-color-scheme` changes instead of freezing the iframe’s last appearance snapshot. Explicit light/dark preferences still override system mode. Theme-change and storage events also report preference changes when the resolved class does not change.

Workspace image selection accepts up to 2 MiB. Server validation checks decoded bytes, and Server Actions allow a 4 MB request body to accommodate base64 encoding and form metadata. Workspace avatars in branding and both sidebars are circular; registration profile avatars are circular too. Account profile photos already supported 2 MB.

Verified: production build, type/lint checks, exact 2 MiB server acceptance and over-limit rejection, browser selection of a valid image larger than 1 MB, circular avatar styling, icon-only header assets, and launcher system-theme changes in both directions after iframe messages. Browser settings persistence remained mocked.

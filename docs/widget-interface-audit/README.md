# Widget interface review

Reviewed and improved on 16 November 2026 with better-interface, better-layout and emil-design-eng.

Scope: the widget shell, Feedback list/search/filter, feedback submission and confirmation, feedback detail/reply, Live chat, shared chat composer, bottom navigation, and their loading/error/empty states. The shared chat composer is also exercised in the dashboard Conversations fixture. This is a screen/flow review, not a review of all uncommitted repository changes. Billing, marketing, the full dashboard and live Slack configuration are outside this design review.

Stack: Next 16.4.4, React 19, Tailwind 4, coss/Base UI, Hugeicons and Inter variable. Sources: AGENTS.md, docs/project-direction.md, docs/feedback-board-design-system.md, docs/public-board-audit/README.md, the installed Next lazy-loading and viewport guides, all six better-interface domain skills, better-layout and emil-design-eng. No CONTRIBUTING.md, CODING_STANDARDS.md or CLAUDE.md was found. Later product decisions take precedence over the older blue/Lucide design proposals: the existing theme, configurable accent, compact controls and gradient avatars are retained.

## Coverage

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Heading semantics, tab roles and keyboard activation, search/composer focus, emoji dismissal, recovery controls, loading announcements, status labels and forced-color fallback | Focus/recovery improvements implemented; native screen readers remain manual. |
| Layout | Widget list/chat/form, fixed chrome and scrolling content, 320/390/768/1440px, short viewport, RTL and doubled text | Shared insets and stable initial chrome implemented. |
| Writing | Feedback/chat terminology, filtered-empty state, loading and configuration failure | Added factual retry and clear-filter actions; no marketing copy added. |
| Typography | Computed 22px H2, secondary heading, dense body scale, long-string wrapping and touch input sizes | Distinct section hierarchy; 16px native inputs on coarse pointers. |
| Colors | Rendered heading, search text and navigation foreground/background pairs in both themes; actual light/dark screenshots | Existing tokens retained; sampled contrast checked against 4.5:1. This is not certification of every possible workspace accent. |
| UI | Shared composer tools, skeletons, persistent footer, selected navigation cue and high-frequency tab behavior | No navigation entrance/stagger; coss keyboard behavior and immediate tab selection retained. |

## Findings and changes

All rows are implemented. Severity describes the issue before correction, not an outstanding blocker.

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Accessibility | `src/components/feedback/widget.tsx:52` | Search used `outline-none` without a wrapper focus indicator | Inset search focus ring; the shared composer retains a visible inset focus treatment; existing flat feedback fields indicate focus through their labels; forced-color fallback | Keyboard users can locate the active control. The correction reuses the app ring token. |
| HIGH | Writing | `src/components/feedback/widget.tsx:41`, `src/components/feedback/widget.tsx:52` | Chat configuration failures were caught silently and hid the entry point | An unknown configuration keeps the navigation shell; chat failure has an explicit retry screen and Feedback remains usable | A failed request should name a recovery path rather than silently remove a feature. |
| MEDIUM | Layout | `src/server/public-workspace.ts:8`, `src/components/feedback/widget.tsx:36`, `src/components/feedback/widget.tsx:55` | Navigation was gated by a second client request and appeared after the widget | Public workspace query includes the chat flag in its existing join; navigation renders from that initial data, with a stable fallback for previews | Removes the visible footer jump without introducing another server round trip. Chat enabled/disabled settings remain authoritative. |
| MEDIUM | Typography | `src/components/feedback/widget.tsx:52`, `src/components/chat/widget-chat.tsx:27`, `src/components/chat/message-list.tsx:18` | “Feedback” was already an H2, but styled at 14px; Live chat lacked a matching section title | 22px semibold H2 for Feedback, Live chat and submission; the empty-chat prompt is a smaller H3 | Semantics and the visible hierarchy now agree; workspace identity stays secondary. |
| MEDIUM | UI | `src/components/feedback/widget.tsx:52` | Plain loading text replaced the list/header/action grouping | A list-shaped skeleton occupies the content area while the header, submit action and navigation remain in place; submission can open independently of list loading/failure | Waiting no longer rearranges the shell. Skeleton movement stops for reduced motion. |
| MEDIUM | Typography | `src/components/feedback/widget.module.css:2`, `src/components/chat/chat-composer.tsx:9`, `src/app/embed/page.tsx:1`, `src/app/widget-preview/page.tsx:1` | Small native inputs and safe-area CSS without an explicit viewport-fit setting | Coarse-pointer inputs use 16px; embedded/preview routes declare viewport-fit=cover without restricting zoom | Prevents the common iOS input-zoom trigger and enables the existing safe-area inset. Physical iOS keyboard behavior remains unverified. |
| MEDIUM | Accessibility | `src/components/feedback/widget.tsx:53` | Compact metadata showed the status dot with only a tooltip/accessibility label | Visible status label alongside the dot; full detail remains available | Status can be read directly without remembering a hue or discovering the tooltip. |
| MEDIUM | Writing | `src/components/chat/widget-chat.tsx:27` | Sending a visitor message also enabled “Preparing a reply…” | The send button shows its pending state; only an actual server generation can show the reply indicator | A pending send must not suggest that an AI/team response is being composed. AI replies remain paused. |
| LOW | Layout | `src/components/feedback/widget.tsx:51`, `src/components/feedback/widget.tsx:52` | Heading had an extra nested inset; submission/detail used different margins; some offsets were physical | Shared 16px insets, wrapping workspace/detail text, logical row offsets and mirrored back icon | Identifying content follows shared edges and holds up in narrow/mirrored layouts. |
| LOW | Writing | `src/components/feedback/widget.tsx:53` | Filtering to an empty status could say “Share the first idea” even when posts existed | “No matching feedback” and a Clear filters action | The empty state explains the active filter rather than implying the board is empty. |
| LOW | Colors | `src/components/feedback/widget.tsx:53` | Vote boundary used a hard-coded black inset shadow | Semantic border and foreground tokens | The vote control follows both theme palettes rather than painting a light-mode shadow in dark mode. |
| LOW | Colors | `src/components/feedback/widget.tsx:55` | The dark inactive tab passed WCAG but measured APCA Lc 55.8 | Existing foreground token at 80%; measured APCA magnitude 66.4 | Meets the advisory Lc 60 guideline for non-body labels without replacing the palette. |

## Verification

Measured heading/search/navigation samples: minimum WCAG ratio **5.57:1** in the default theme matrix; minimum APCA magnitude **66.4** for these non-body labels. Alpha text was composited onto its actual background before measurement.

The browser fixture renders the actual widget and shared chat components, generated Tailwind styles and CSS modules, with project/auth/provider calls mocked. The chat flag is included in its initial workspace data. A delayed configuration response verifies navigation visibility before the response and measures its position before/after resolution.

Commands:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright node scripts/check-chat-ui.mjs
npm run typecheck
npx eslint src/components/feedback/widget.tsx src/components/chat src/server/public-workspace.ts src/components/feedback/project-provider.tsx src/app/embed/page.tsx src/app/widget-preview/page.tsx
git diff --check
```

Evidence is saved in `evidence/results.json`, `evidence/widget-contrast.json` and the screenshots beside them. The production webpack build also passed.

Browser checks include light/dark layouts at 320, 390, 768 and 1440px; loading/error shell retention; chat-configuration failure recovery; a working clear-filter action; computed section heading size; sampled text contrast; RTL and doubled-text reflow; short-screen submission; keyboard tab switching and emoji Escape dismissal; composer focus; and touch-mode input size. Existing send/retry, attachments, polling, navigation draft retention and team-reply checks run in the same suite.

**Not verified:** native screen readers, physical Safari/iOS/Android keyboards, native browser zoom (doubled computed text and narrow reflow are separate checks), full translated locales, every accent permutation, frame-by-frame playback of all existing shared overlay animations, real Slack delivery, real Clerk sign-in or live image upload in this browser fixture. The separate support integration suite covers authorization, image sanitization and Slack message/image mapping with isolated database data and mocked transports.

## Verdict

Approve for the inspected widget UI flow. Browser and static checks passed. No known HIGH findings remain within that scope. This verdict does not approve the manual/live-service boundaries above.

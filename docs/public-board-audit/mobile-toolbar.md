# Public board toolbar — 14 November 2026

## Scope and coverage

Reviewed the public board status/sort/submit toolbar and its loading placeholder.
Next.js 16.4.4, Tailwind 4 semantic tokens, CSS modules and existing coss/Base UI
Select/Button components. Followed AGENTS.md and the existing design-system
conventions. Backend behavior, Clerk and the feedback composer are outside scope.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Actual Select roles/names, all options, keyboard opening, Escape/focus restoration, submit trigger | Passed fixture interactions; native screen reader not verified |
| Layout | Actual toolbar with compiled CSS at nine widths, both directions/themes, 200% CSS zoom and a German label stress case | Passed; no toolbar wrapping or horizontal overflow |
| Writing | All/Open/Planned/In Progress/Completed and Top/Trending/Newest options; dynamic sort accessible name | Existing vocabulary preserved |
| Typography | Longest English status and German label growth with system sans-serif fallback | Labels usable; exact downloaded Inter rendering not verified |
| Colors | Existing tokens in light/dark, rendered submit foreground/background pairs | Submit text exceeds 4.5:1 in both themes; no new palette |
| UI polish | Existing select indicators, control sizing, reduced-motion preference, loading placeholder | Controls share one row and established shapes |

## Findings addressed

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| MEDIUM | Layout | `src/components/feedback/board-view.tsx:35` | Wrapping chips and a separate wrapping action group | Shared responsive `BoardToolbar` | Keep filters and primary action together on mobile |
| MEDIUM | Layout | `src/components/feedback/board-toolbar.module.css:2` | Text sort label competes with status chips for width | Three-column compact toolbar; status dropdown and icon-only sort | Fit 320px while retaining all statuses and sort choices |
| LOW | UI polish | `src/components/feedback/board-states.tsx:11` | Loading placeholders mirror the old wrapping toolbar | Shared responsive toolbar layout for placeholders | Avoid an unrelated loading structure |

## Verification

- `npx eslint src/components/feedback/board-toolbar.tsx src/components/feedback/board-view.tsx src/components/feedback/board-states.tsx`: passed.
- `npx tsc --noEmit --incremental false`: passed.
- Offline Chromium fixture built from the actual `BoardToolbar`, coss Select/Button,
  esbuild CSS module output and PostCSS-compiled app stylesheet: 52 checks passed,
  zero browser errors. No network, customer data or provider calls.
- Widths: 320, 360, 375, 390, 414, 600, 768, 1024, 1440px, light/dark, LTR/RTL.
- All five statuses selected; all three sorts selected; accessible sort name updates.
  Escape from a focused option closes the popup and restores trigger focus.
- Submit callback fires. This fixture does not exercise the unchanged feedback dialog.
- 200% CSS zoom at 640px approximates a 320px content viewport; native browser
  zoom is not verified. Reduced motion and longer German labels were exercised.
- Screenshots inspected at 320px light and 1440px dark. Evidence summary is in
  `evidence/mobile-toolbar.json`. Temporary runner: `/tmp/ent-toolbar-check/run.mjs`.
- Empty and error render branches inspected in source. Loading skeleton inspected
  in source; full authenticated board rendering and physical Safari/touch devices
  are not verified by this isolated fixture.

## Verdict

Approve for the inspected toolbar scope. Native Safari and assistive-technology
coverage remain explicit limitations, not claims of a full-app audit.

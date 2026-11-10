# Public board interface audit

Reviewed and improved on 10 November 2026 using **better-interface**, **better-layout**, and **emil-design-eng**, with the six better-interface domain skills as the review criteria.

Scope: workspace header, public feedback list and filters, submission dialog, feedback conversation and metadata, and loading, empty, missing and failed states. Stack: Next.js 16, React 19, Tailwind 4, coss/Base UI, Hugeicons and Inter variable. Followed AGENTS.md, the installed Next.js Link guide, the existing semantic color/motion tokens, and the user's newer design decisions over the historical design-system document. The wider board, compact controls, solid active votes, status dots, workspace branding and flat composer fields are retained.

## Coverage

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Keyboard skip link, dialog Escape/focus restoration, form validation, type selector focus, retry and live result count; actual components in browser fixtures | Focus and recovery improvements implemented. Native screen-reader testing remains manual. |
| Layout | List and conversation grids, narrow and short viewports, long unbroken title, RTL and text enlargement | Unified alignment, wrapping and scrollable dialog implemented. |
| Writing | Filter labels, result announcements, missing-post copy, empty/error states | Consistent feedback terminology and factual missing-post guidance implemented. |
| Typography | Computed title hierarchy, line heights and title/tag wrapping | Distinct conversation heading and tighter card title rhythm implemented. |
| Colors | Existing light/dark semantic surfaces, muted text, primary controls and type/status indicators | No palette replacement needed. Visible text samples passed the automated 4.5:1 check in the tested fixtures. |
| UI | Card separation, skeleton layout, loading/retry behavior, existing component variants and overlay motion | Improved grouping and loading states; retained restrained shared interaction motion. |

## Findings and changes

All rows below are implemented. Severity describes the issue before correction, not an outstanding blocker.

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| MEDIUM | Accessibility | `src/components/feedback/site-header.tsx:16`, `board-view.tsx:29`, `item-detail.tsx:86` | Repeated public navigation had no bypass | First keyboard link focuses the public content in loaded, missing and failure states | Repeated visits can reach feedback without traversing header controls. |
| MEDIUM | Accessibility | `src/components/feedback/item-detail.tsx:111` | Type selector explicitly suppressed its focus ring | Shared visible keyboard ring restored on this borderless control | Keyboard focus remains identifiable without adding a resting border. |
| MEDIUM | Accessibility | `src/components/feedback/feedback-form.tsx:21` | Flat fields removed every outline without an explicit label cue | Focused field label becomes darker and semibold | Preserves the requested outline-free design while identifying the active field. |
| MEDIUM | Layout | `src/components/feedback/submit-dialog.tsx:7` | Popup clipped overflowing content | Popup scrolls vertically and contains overscroll | Small-height screens can reach the form actions. |
| MEDIUM | UI | `src/components/feedback/board-states.tsx:7`, `item-detail.tsx:85` | Board skeleton suggested a removed hero; conversation loading/error were plain text | Toolbar/list skeleton, screen-reader loading status and working retry state | Waiting and recovery follow the product's existing components. Skeleton motion stops with reduced-motion preference. |
| MEDIUM | Layout | `src/components/feedback/item-detail.tsx:96` | Conversation used a different outer width and padding | Header, board and conversation share a 1024px outer container and responsive insets | Navigation between list and detail keeps a stable alignment. |
| MEDIUM | Typography | `src/components/feedback/board-feedback-row.tsx:40`, `item-detail.tsx:104` | Global type tokens flattened the detail heading; card title retained oversized leading; unbroken strings lacked wrapping | Explicit 22px detail heading, 20px card title leading, wrapping for titles/descriptions/tags | Restores heading hierarchy and allows difficult content to fit. |
| MEDIUM | UI | `src/lib/project-links.ts:5`, `board-feedback-row.tsx:22`, `item-detail.tsx:33` | Card and share links used a legacy redirect route | Canonical workspace-scoped detail links | Removes an avoidable redirect/database lookup from opening or sharing feedback. |
| LOW | Layout | `src/components/feedback/board-view.tsx:36` | Breakpoint forced toolbar groups not to wrap | Content-driven wrapping while preserving the normal desktop row | Enlarged text has room without sacrificing normal desktop alignment. |
| LOW | UI | `src/components/feedback/board-view.tsx:49` | Adjacent card surfaces touched | 8px between cards | Distinguishes each feedback item without increasing internal padding. |
| LOW | Writing | `src/components/feedback/board-view.tsx:37`, `item-detail.tsx:89` | Mixed ideas/feedback labels; missing post claimed it might be merged | Feedback result count and filter labels; removed-post guidance | Uses consistent vocabulary and avoids suggesting an unsupported merge flow. |
| LOW | Layout | `src/components/feedback/board-feedback-row.tsx:41`, `item-detail.tsx:62` | Several trailing metadata/action offsets were physical left/right | Logical start/end spacing in the changed card/action controls | Supports mirrored layouts without changing the LTR composition. |

## Verification

The reproducible browser fixture renders the actual public components and generated application styles, with mocked project, auth and feedback services. It deliberately includes a long unbroken title and a conversation with status history. It is a UI regression fixture, not a claim of live backend/auth verification.

```sh
PLAYWRIGHT_MODULE=/path/to/playwright node docs/public-board-audit/evidence/check.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node docs/interaction-audit/evidence/check.cjs
node --conditions=react-server --import tsx --test tests/*.test.ts
npm run typecheck
npx eslint src/components/feedback/board-feedback-row.tsx src/components/feedback/board-view.tsx src/components/feedback/board-states.tsx src/components/feedback/item-detail.tsx src/components/feedback/site-header.tsx src/components/feedback/feedback-form.tsx src/components/feedback/submit-dialog.tsx src/lib/project-links.ts tests/workspace-domain.test.ts
git diff --check
```

- Public browser matrix: board and conversation × loaded/loading/error/empty × light/dark × 320/768/1440px. No horizontal overflow, unnamed visible buttons or browser runtime errors in that matrix. Text contrast is sampled for visible text, not a complete WCAG certification.
- Additional interaction checks cover skip navigation, status filtering, dialog focus restoration, retry, RTL, enlarged text, desktop toolbar alignment, reduced-motion skeletons and short-screen submission. Evidence: `evidence/results.json`.
- Existing interaction suite: 27 checks passed, including failed submission/reply draft preservation and successful retries.
- Node suite: 43 tests passed, including canonical detail links with and without configured workspace subdomains.
- Targeted ESLint, TypeScript and diff whitespace checks passed.

**Not verified:** native screen readers, physical iOS/Android keyboards, native browser zoom (the fixture doubles computed text and separately tests narrow reflow), translated copy, all accent permutations, live Clerk sign-in or live database writes. Auth is mocked as signed out in this public fixture. Attachment uploads and billing are outside this review. No new entrance/stagger animations were added to frequently used filters or cards; shared overlay motion remains in place.

## Verdict

**Approve for the reviewed UI scope.** No known HIGH findings remain in that scope. The manual and live-service boundaries above remain part of release verification.

# UI, layout, typography, and motion audit

Date: 6 November 2026. App: Ent Feedback. Starting commit: `b300ef4`; the working tree already contained ongoing frontend and backend work.

## Direction and review method

A compact feedback workspace for owners reviewing requests, and a public board for customers sharing ideas. Preserve the existing Paper layouts, Inter Variable, 13–14px text, weights 500/600, primary `#6247aa`, Hugeicons, gradient avatar fallbacks, and the custom status symbols.

This review uses Stageshow’s framing, hierarchy, density, legibility, and motion scrutiny on the **actual application components**. Stageshow is primarily a faux product demo skill; no mock product screens, kit replacement, marketing animation, or artificial cursor tour was added. Its demo filming gate is not an application test, and no “rehearsal passed” claim is made.

Nudge informs typography and visible hierarchy. Animate and Emil’s guidance inform implementation. The improve-animations audit and implementation plans are in [plans](../../plans/README.md). Elf drift checks remain off, as requested.

Screenshots are CSS-pixel viewport captures at 1440×1000 and 390×1000; long public pages use full-page capture. Desktop dashboards have independently scrolling panes, so additional lower-pane captures are needed to assess content below their fold. Protected screens use actual components with isolated account/data fixtures. Action and database tests use mocks; no invitations were sent and no real profile, workspace, or account was changed during testing.

## Coverage

| Area | Screens / states reviewed |
| --- | --- |
| Main dashboard | Request list, selected request, search/status/sort controls, sidebar, workspace menu |
| All boards | Color and emoji markers, cards, actions menu, board dialog, color/emoji picker, drag affordances |
| Settings | Account, branding, team, widget, integrations; editable, loading, failed-save recovery, read-only permissions |
| Share | Workspace domain, copy/preview, official social marks, disabled sections, installation snippets |
| Public board | Signed-in and anonymous composition paths, filters, feedback dialog, search |
| Conversations | Public post detail, author/status/actions, comments and reply composer |
| Following | Empty state and return-to-board navigation |
| Workspace setup | Workspace creation and all four registration steps |
| Authentication | Clerk wrapper and anonymous sign-in/sign-up rendering; no account registration submitted |
| Widget | Preview from Settings, floating launcher, embedded panel, submission fields |
| Motion | Pointer versus keyboard, popup origins, fixed-size marker tabs, opening/closing, reduced motion |
| Theme and type | Light/dark semantic surfaces, Inter, text sizes, weights, line heights, overflow |

Initial captures: [before](before/). Final captures: [after gallery](after/INDEX.md). The final gallery contains 61 captures, including open controls, light/dark states, and anonymous live Clerk widgets. Screenshots show fixture content or blank authentication forms, not production user data.

## Visual comparisons

| Screen | Before | After |
| --- | --- | --- |
| Mobile widget settings | [Narrow description column](before/settings-widget-390.png) | [Controls wrap beneath readable descriptions](after/settings-widget-390.png) |
| Workspace creation | [False red error borders](before/onboarding-390.png) | [Neutral initial state](after/onboarding-390.png) |
| Mobile sharing | [Heavily clamped address](before/share-390.png) | [Visible workspace address](after/share-390.png) |

Additional states: [dark notifications](after/notifications-dark.png), [dark charcoal share link](after/share-charcoal-dark.png), [mobile widget](after/widget-open-390.png), [widget form](after/widget-submit-390.png), [keyboard board reorder](after/boards-keyboard-reorder.png), [direct invite dialog](after/invite-from-switcher.png), and [workspace validation](after/workspace-validation.png).

## Findings and implemented changes

| Priority | Before | After | Why / principle |
| --- | --- | --- | --- |
| High | Branding, widget, and notification preferences only changed React state, although the interface said they were saved. | Authenticated settings actions persist to existing database tables; settings hydrate on load; errors remain retryable. | A completed action must have the result it promises. Nudge 9: Affordance; 16: Responsibility. |
| High | A failed settings save disabled the whole form and notification errors were routed through workspace save state. | Workspace load/save and notification preferences have separate state; failed writes preserve editable values and report the error. | Errors need a path forward. Nudge 4: Communication. |
| High | The embeddable route ignored the installation’s workspace and board parameters. | The server resolves the requested public workspace; the embedded panel selects the requested board, receives saved settings, and reports its accent to the origin-checked launcher. | The widget must belong to the workspace that installed it. Nudge 16: Responsibility. |
| High | Saved widget options were not passed through the public workspace layout. | Public workspace lookup and boundary supply saved widget configuration to the provider. | Customers must receive the settings their team configured. Nudge 16: Responsibility. |
| Medium | Workspace inputs had red borders even when `aria-invalid="false"`. | Input-group styling matches `aria-invalid=true`; valid or untouched identity fields omit the invalid attribute. | Error styling must communicate a real error. Nudge 9: Affordance. |
| Medium | Small headings retained tracking of −0.6/−0.65px from an earlier, larger type scale. | Heading tracking is −0.14px at 14px; hierarchy uses weight, position, space, and contrast. | Small text needs legibility before decorative tightness. Nudge 1: Typography. |
| Medium | Form labels at 13px had 16px line boxes; some board metadata also had tight line height. | Shared labels use 20px line boxes; board metadata uses 20px. Reading text in feedback rows/comments uses 14px/1.5. | Text roles need consistent line height. Nudge 1: Typography; 8: Order. |
| Medium | Placeholder text was attenuated below the normal supporting-text token. | Shared inputs/textareas and feedback fields use the supporting-text token directly. Availability text uses green-700 in light mode and green-400 in dark mode. | Supporting text still needs to be readable. Nudge 15: Accessibility. |
| Medium | Fixed-width widget selectors squeezed descriptions into very narrow mobile columns. | Settings descriptions retain a useful minimum reading width; controls wrap when the row cannot fit both. | Wrap by groups rather than crushing the reading lane. Nudge 2: Grids; 5: Proportion. |
| Medium | Share URL was aggressively clamped on mobile. | Workspace address wraps within the card; copy remains available. | Users can inspect the destination they are sharing. Nudge 6: Clarity. |
| Medium | Dark-mode switch thumbs inherited the dark page background. | Thumbs retain a white surface on both themes. | The moving state marker must remain visible against the track. Nudge 9: Affordance; 15: Accessibility. |
| Medium | Several share/widget/notification surfaces used hard-coded light backgrounds and dark ink. | Semantic surface and text tokens follow the selected theme; official social marks remain intact. | Theme changes must preserve hierarchy and readability. Nudge 3: Color; 8: Order. |
| Medium | Popover/tooltip positioning and dimensions animated layout properties. | Positioners move immediately; anchored surfaces transition opacity/scale from the trigger origin. | Avoid layout churn for occasional surfaces. Nudge 10: Motion. |
| Medium | Dialogs, tooltips, switches, and toasts had unrelated timing and incomplete reduced-motion treatment. | Shared curves and timing, explicit properties, keyboard immediacy, reduced-motion variants. | Motion should explain state consistently. Nudge 10: Motion. |
| Medium | Toast updates replayed shake/pulse keyframes and could transition for 500ms. | Updated content remains in the same toast; no replay keyframes; transform/opacity transitions stay within 250ms. | Repeated feedback must remain interruptible. Nudge 10: Motion. |
| Low | Dropdowns displayed static up/down arrows. | A shared indicator shows down when closed and up when expanded. | State is visible before interaction. Nudge 9: Affordance. |
| Low | Workspace creation was labeled “Create workspace or project” with a plus inside that menu item. | Menu label is “Create workspace” with no icon. The small circular plus sits beside the bell, with a larger hit area. | Match the product’s workspace model and avoid duplicate emphasis. Nudge 4: Communication; 8: Order. |
| Low | Team cancellation could be triggered repeatedly while a request was pending. | Pending cancellation disables repeat actions and shows progress; failed team loading offers Retry. | Progress and failure are explicit. Nudge 9: Affordance. |
| Low | Selecting Charcoal could continue using the purple theme alias. | Custom accent selections use the selected color; `#6247aa` remains the default. | A setting must reflect its selected value. Nudge 16: Responsibility. |

### Typography specification

| Role | Size | Weight | Line height / treatment |
| --- | --- | --- | --- |
| Page and dialog titles | 14px | 600 | 20–21px, restrained negative tracking |
| Reading text | 14px | 500 | 1.5 for feedback descriptions and comments |
| Navigation, labels, metadata, actions | 13px | 500; 600 for selected/emphasized content | Approximately 20px; avoid squeezing labels |
| Code | 13px | 500 | Monospace, wrapping/scrolling only within code blocks |

Accent text uses a separate semantic token in dark mode so a charcoal or purple fill does not become an unreadable link. Raised dark cards use a lighter surface than the dashboard canvas. Portals inherit the active workspace accent.

Registration and server profile synchronization now keep Clerk’s generated initial avatars out of the image path when `hasImage` is false, allowing the gradient fallback to render.

Inter Variable remains the app font. Text size is not inflated to create hierarchy. Code retains its monospace face. Status symbols and gradient avatar fallbacks are unchanged.

### Motion specification

| Interaction | Treatment |
| --- | --- |
| Anchored menus/selects/popovers | Opacity and scale, 200ms; `cubic-bezier(0.23,1,0.32,1)`; trigger origin |
| Tooltip | 125ms; adjacent/instant tooltips skip transition |
| Dialog / widget panel | 250ms; centered dialog or bottom-right widget origin; short 125ms exit |
| Sheet | 250ms; `cubic-bezier(0.32,0.72,0,1)` |
| Pointer press | Scale .97, 160ms; excludes deliberately flat public feedback composer |
| Switch thumb | Translate only, 160ms; no press stretch or animated radius |
| Onboarding step | 200ms opacity and 8px entry; only after step changes |
| Toast | Transform 250ms, opacity 200ms; no replay keyframes |
| Keyboard actions / command palette | Immediate; no decorative transition |
| Reduced motion | Drop spatial movement; brief opacity feedback; switch/reorder position changes are immediate |
| Color/emoji tabs | Fixed-size, instant content changes; no resize animation |
| Frequent navigation | No decorative page/list entrance animation |

## Verification

Results are recorded below after the final checks. Browser tests use mocked identity/actions and actual components/CSS. This validates UI behavior and wiring, not production email delivery or a real OAuth round trip.

- TypeScript: passed.
- Focused ESLint: passed for the app components, changed server/page code, loader, and verification scripts.
- Existing auth-flow and workspace-domain tests: 12 passed.
- Settings action harness: passed normalization, duplicate names, admin checks, image URL restrictions, widget field mapping, authenticated notification ownership, and unauthenticated write rejection. Database calls were mocked.
- Initial desktop/mobile capture: 22 screenshots, no horizontal page overflow, no browser runtime errors, measured text sizes 13/14px in the sampled text roles.
- Final matrix: 30 desktop/mobile screen captures across 15 screen categories; no horizontal page overflow, browser runtime errors, or sampled tight label line boxes. Sampled text roles remained 13/14px Inter.
- Interaction checks passed: workspace label/20px plus placement, expanded-state chevrons, constant-size marker tabs, keyboard menus/search, failed-save recovery, reloaded branding/widget/notification settings, widget preview, flat feedback composer, and reduced motion.
- Additional states passed: keyboard board reorder, direct invite dialog, validation circles outside inputs, following a post, signed-out public header, steps 2–4 of registration, mobile widget/form, installation panels, and dark surfaces.
- External widget loader passed: interrupted close/reopen, keyboard immediacy, reduced-motion fade, viewport bounds, project/board URL, and message origin/source checks. Iframe data was mocked.
- Embed route harness passed: requested tenant lookup, saved widget settings and board propagation, unknown-tenant rejection, and a missing-tenant state without loading a default workspace.
- Measured dark charcoal-link sample: RGB(172,172,172) against RGB(36,36,35), contrast **6.84:1**. This is one measured state, not a full contrast certification.
- Live anonymous Clerk sign-in/sign-up rendered centered at 1440px and 390px, with no horizontal overflow. No credentials were entered and no registration was submitted. The app appearance now sets Clerk headings to 14px and labels/subtitles to 13px.
- Final focused ESLint, TypeScript, and diff whitespace checks passed.
- Mobile sidebar checks passed for switcher layout, viewport fit, and reduced motion. The policy targets the actual sidebar popup slot, which overrides the generic sheet slot.

## Remaining work and limits

1. **Feedback and board persistence remain backend handoff work.** Board creation/rename/reorder and feedback/votes/comments still use client state in the inspected providers. The settings persistence added here does not make those flows production-backed. A locally created board is not evidence that its public server route exists.
2. **Notification preferences now persist; the activity feed is still a placeholder.** Real event ingestion, unread state, delivery, and feed retrieval require backend work. The current empty-state copy should not be treated as proof that a live account has no notifications.
3. **OAuth and invitations were not exercised against real services in this audit.** Existing handlers and controls remain; Slack/Discord authorization, email delivery, and role changes need a configured staging account and end-to-end checks.
4. **Branding images use the existing text column for small image data URLs (maximum 500 KB).** Profile photos use Clerk. Moving workspace uploads to R2 is a separate storage integration; no R2 upload test is claimed.
5. **Real-device and assistive-technology coverage is still required.** Desktop Chromium responsive captures do not prove iOS keyboard/zoom behavior, mobile Safari gestures, screen-reader announcement quality, or every translated/long-content case. The requested 13–14px input text may trigger iOS focus zoom.
6. **The compact type direction is intentional.** This pass improves its rhythm and hierarchy; it does not claim a full WCAG conformance audit or a guaranteed subjective “premium” rating.

## Design experiment for the next review

On a narrow public post, the author/details/actions card appears before the conversation and takes substantial vertical space. Should the conversation take priority, with post information behind a compact disclosure? The current layout is preserved because this is a product hierarchy decision, not a mechanical typography fix. (5. Proportion; 6. Clarity)

## Reproduce the essential checks

```sh
npm run typecheck
npx eslint src/components/feedback src/components/ui src/server/actions/settings.ts src/server/actions/registration.ts src/server/auth.ts src/server/public-workspace.ts src/app/embed/page.tsx 'src/app/p/[project]/layout.tsx' src/app/layout.tsx src/lib/clerk-appearance.ts public/widget.js scripts/check-settings-actions.mjs scripts/check-embed-route.mjs
node --import tsx --test tests/auth-flow.test.ts tests/workspace-domain.test.ts
node scripts/check-settings-actions.mjs
node scripts/check-embed-route.mjs
```

For browser review, start the local app and inspect desktop and 390px layouts. Open and close menus by pointer and keyboard, switch theme, emulate reduced motion, rapidly reverse a toggle, retry a failed save, and verify settings after reloading. Watch panel entry/exit at slowed playback; the resting frame must be fully opaque and controls must remain usable.

References: [Stageshow skill](/Users/macintoshhd/.agents/skills/stageshow/SKILL.md), [Nudge skill](../../.agents/skills/nudge/SKILL.md), [Shift Nudge](https://shiftnudge.com/skill). Skill principles are attributed here; their licensed source files were not modified.

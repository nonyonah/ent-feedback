# Interface audit — 6 November 2026

Initial audit was read-only. **Implementation completed in the follow-up below**; original evidence and findings are preserved. Applied `better-colors`, `better-layout`, `better-writing` and `better-interface`, including its accessibility, typography and UI owners. Findings below distinguish confirmed failures from proposed visual direction.

## Scope and coverage

Inspected the dashboard inbox and selected request, all boards, share/install page, Account/Branding/Team/Widget/Integrations settings, public board, detail, following, embedded board, submission, registration entry and workspace creation. Browser sampling covered 15 screen variants at **320, 768 and 1440 CSS pixels**, with computed light/dark text pairs: 45 screen visits, 90 theme samples. Focus, a German-length button label, RTL and a CSS-zoom stress case received separate checks.

Stack: Next 16.4.4, React 19.3, Tailwind 4, coss/Base UI, Hugeicons, variable Inter and Clerk. References read: AGENTS.md, docs/project-direction.md, docs/feedback-board-design-system.md, and the six owning skills. The older design documents specify blue/Lucide and larger headings; the user's later #6247aa, Hugeicons, gradient avatar and compact 13–14px instructions take precedence.

The browser harness renders actual app components and actual generated CSS. Clerk identity, router, server actions and team responses are fixtures. This is UI evidence, **not production backend or authentication certification**. The previous audit's captures and verification remain historical evidence, not newly repeated checks.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Keyboard submission field; rendered text pairs; accessible labels in composer source | Focus blocker; contrast blockers assigned to Colors below |
| Layout | 45 responsive visits; share long-label/RTL/CSS zoom; screenshots | Long-label clipping; RTL boundary documented |
| Writing | Public board, submission, branding, sidebar, notification and share copy against handlers | Misleading notification state and product promise; terminology and labeling issues |
| Typography | Rendered sizes, line heights, weights, wrapping and font family across sampled screens | Compact scale retained; bilingual URL isolation recommendation |
| Colors | Composited light/dark pairs; selected rows, counters, sidebar, cards and primary buttons | Secondary-text and shortcut contrast failures; semantic foreground bypass |
| UI | Desktop inbox and narrow public/share/branding captures; shared versus copied surface styles | Surface consolidation recommended; full slow-motion replay not repeated |

## Findings

The table has ten root causes. Severity follows the interface skill; a documented design choice does not remove a confirmed accessibility failure.

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Colors | `src/app/globals.css:118`; `src/components/feedback/dashboard-view.tsx:56`; `src/components/feedback/dashboard-sidebar.tsx:52`; `src/components/feedback/dashboard-settings.tsx:34`; `src/components/feedback/share-view.tsx:236` | `--muted-foreground: oklch(0.556 0 0)` resolves to RGB115. Sidebar labels on RGB245/245/244: **4.346:1**. Request metadata on selected tint: **4.237:1**; selected vote counter: **3.890:1**. Share step labels reach **3.704:1**. | Darken the secondary-text role enough for its darkest intended light surface; remeasure selected, hover, counter and installation surfaces. Use a separate tertiary role only for nonessential decoration. | Required normal-text threshold is **4.5:1** at 13px, including semibold counters. One shared correction improves multiple views. Do not brighten every background to compensate. |
| HIGH | Colors | `src/components/feedback/site-header.tsx:17` | Search shortcut uses `text-muted-foreground/50`: **1.933:1** light and **2.547:1** dark. | Remove the `/50` attenuation, then measure the shortcut on its actual search surface in both themes. | The slash communicates a usable keyboard shortcut, rather than decoration. Its normal-size text misses 4.5:1. Public/detail/following/submission share the header. |
| HIGH | Accessibility | `src/app/globals.css:230`; `src/components/feedback/feedback-form.tsx:16` | Composer inputs force `outline:none` and `box-shadow:none`; a filled title field reached with Tab/Shift+Tab has no focus outline or shadow. | Keep pointer hover flat, but provide a keyboard-only indicator: a restrained underline or inset treatment, or the browser focus ring. Apply to title/details and verify each stop. | Keyboard users lose their location. This originates in the earlier no-outline design requirement; it needs an accessible alternative, not restoration of hover decoration. |
| HIGH | Layout | `src/components/feedback/share-view.tsx:74`–`:90` | Action row is nonwrapping; both controls use `shrink-0`, inner label `w-max`, parent card clips overflow. Replacing Copy link with “Freigabelink in die Zwischenablage kopieren” at 320px puts its right edge at **344.58px** and hides the rest of the row. | Use `flex-wrap`, `min-w-0` and wrapping/min-height labels; let the primary action occupy a full row when needed. Remove unnecessary fixed-width overlay inside Preview. | Content growth clips a critical action at 320px. Default English fitting is insufficient evidence of adaptable layout. |
| HIGH | Writing | `src/components/feedback/notifications-panel.tsx:15` | Always renders “You’re all caught up” and “New activity … will appear here”; there is no feed fetch, loaded state or activity list. | Until a real feed exists, say “Activity notifications aren’t available yet.” Keep preference settings separately available. Once wired, distinguish loading, failure, empty and populated states. | Claims knowledge of unread activity that the component does not have. A premium interface must report state truthfully. |
| MEDIUM | Colors | `src/components/feedback/widget.tsx:23`, `:38`; `src/components/feedback/project-provider.tsx:32`–`:58` | Widget actions/launcher use `text-white`, bypassing `--primary-foreground`; the theme function deliberately selects black for sufficiently light custom accents. | Use `text-primary-foreground` for every action sitting on `bg-primary`, including launcher glyphs. Verify against a light custom workspace accent. | A confirmed semantic-role bypass. Default purple is safe; a live alternate-accent failure was not measured in this audit, so this is not classified as a measured contrast blocker. |
| MEDIUM | Writing | `src/components/feedback/board-view.tsx:33` | “We review every request and build the ones teams ask for most.” | “Share an idea, vote on requests, and follow progress.” Let each workspace add its own review policy separately. | Makes an operational promise for every workspace and implies popular requests will be built. The app cannot guarantee either. |
| MEDIUM | Writing | `src/components/feedback/dashboard-sidebar.tsx:44`, `:52`; `src/components/feedback/dashboard-settings.tsx:41` | “Project menu”, “Project”, and hidden field label “Project name” describe the entity elsewhere called Workspace. | “Workspace menu”, “Workspace”, “Workspace name”. Keep internal identifiers unchanged if renaming them adds risk. | Consistent flow vocabulary: users should not wonder whether these are different entities. Includes assistive labels, not only visible text. |
| MEDIUM | Writing | `src/components/feedback/dashboard-settings.tsx:41`; `src/components/feedback/project-provider.tsx:32` | “Accent used across your public boards” while the same theme maps dashboard actions, focus and portals too. | “Accent used across this workspace and its public boards.” Alternatively limit the implementation to the documented public scope. | The description understates the setting's actual reach. Settings should explain what changing them does. |
| MEDIUM | Writing | `src/components/feedback/feedback-form.tsx:16`; `src/components/feedback/account-settings.tsx:32`; `src/components/feedback/dashboard-settings.tsx:41` | Submission title/details and profile names rely on placeholders/ARIA labels; branding name has an `sr-only` label. After entry, sighted readers lose the field's explicit identification. | Add compact persistent labels (13px) without changing the flat input treatment. “Title”, “Details”, “First name”, “Last name”, “Workspace name”. | Placeholders are examples, not durable labels. Accessible names already exist; this is a visible-writing/comprehension issue, not an unlabeled-control claim. |

## Measured colors and visual direction

**Keep the purple.** White on #6247aa measured **6.997:1**, on both sampled primary-button appearances. Branding description text on white measured **4.742:1**; the same description on the dark card RGB36/36/35 measured **6.013:1**. The gray is failing on specific tinted surfaces, not everywhere.

Raw composited foreground/background values, ratios and screen names are in [contrast-pairs.json](evidence/contrast-pairs.json). Full per-screen observations are in [new-metrics.json](evidence/new-metrics.json). Foregrounds/backgrounds were resolved through browser canvas to sRGB, with ancestor background alpha composited. Rows with ancestor opacity or background images were excluded from numeric pass/fail claims. Values are rounded, not estimated. No claim is made that this exhaustively measures every glyph, icon, gradient or interactive state.

For the desired polish, use a small, explicit surface hierarchy:

| Role | Proposed direction |
| --- | --- |
| Canvas | One quiet base surface per appearance; retain the existing neutral family |
| Navigation | One restrained sidebar surface, not several unrelated grays |
| Content/cards | Flat for ordinary content; subtle structural border only where needed |
| Menus/dialogs | One elevated surface and shared shadow recipe |
| Secondary controls | One neutral control fill, with explicit hover/selected roles |
| Primary action | Purple fill with semantic foreground; neutral peers |
| Text | Strong primary, verified secondary; do not express secondary hierarchy by arbitrary opacity |
| Status | Retain labeled status colors and custom icons, distinct from the accent |

This is a proposed role map, not a newly approved palette or a claim that a particular off-white is intrinsically superior. Mixed hex/OKLCH notation and compact density are not defects. Do not turn every card into a floating panel. The visible hierarchy should come from grouping and restrained contrast, with depth reserved for overlays.

Source consolidation opportunities: share buttons carry independent Paper shadow recipes (`share-view.tsx:75`, `:93`, `:246`, `:271`, `:297`, `:305`); widget controls have another recipe (`widget.tsx:23`). Reuse shared coss button/elevation variants before adding new surface values. This is recommended implementation direction, not a separate unverified visual blocker.

Linear's [public product page](https://linear.app/) was consulted as a reference, including its presented inbox/properties UI. The useful direction here is restraint and hierarchy. This audit does not claim access to Linear's private application or copy its exact tokens.

## Layout, typography and writing notes

- **Default-width layouts:** no document-level horizontal overflow in the 45 sampled visits. At 320px Branding controls wrap below descriptions and remain readable. This does not prove every internal scroll region is reachable.
- **RTL:** share controls and reading alignment generally mirror in the stress capture. The workspace URL is not isolated with `dir="ltr"`/`bdi`; protect URLs and snippets at their content boundary before supporting mixed-direction workspaces. English-only RTL was inspected; real Arabic/Hebrew content and the full dashboard mirror were not.
- **Type:** retain variable Inter, weights 500/600 and the user's 13–14px density. Do not “fix” hierarchy by indiscriminately enlarging headings. Shared semantic text roles would make future tuning safer than changing every Tailwind size globally. Native iOS input zoom was not tested.
- **Copy:** use Workspace → Board → Feedback → Comment consistently. Prefer “Collect feedback” over the isolated “Collect Feedback” (`share-view.tsx:47`). Keep one submission verb across public/widget flows where the action is identical. These are lower-priority refinements, not extra blockers.
- **Empty states:** the inbox offers Clear filters and the public filtered board offers Show all ideas. Those recovery paths are good patterns to preserve. The notification pane is the exception because its empty state is unconditional.

## Verification

### Completed

- `node /tmp/ent-audit/build.cjs` — built actual UI components into the fixture harness, without application edits.
- `node /tmp/ent-audit/deep.cjs` — 45 visits at 320/768/1440, light/dark computed color sampling; **no page errors and no document-level overflow**.
- `node /tmp/ent-audit/stress.cjs` — filled submission title, Tab/Shift+Tab, inspected focus; 320px German-length share label; share RTL; CSS zoom 2 at a 640px viewport. Focus and long-label failures reproduced. CSS-zoom case had no document overflow, but clipping persisted inside the card.
- Inspected representative full screenshots: desktop requests; 320px public, share and Branding; focus, RTL and German stress captures. [Evidence directory](evidence/) contains these frames and the scripts. Scripts use local absolute paths and a running dev server; adjust paths to reproduce elsewhere.
- Read actual handlers for notification, branding scope, workspace labels, public promises and composer labels. No email, invitation, signup, OAuth or destructive action was executed.

### Not verified

- Native browser 200% zoom (CSS zoom is a stress approximation, not an equivalent certification), actual iOS Safari, Firefox/WebKit, real translated locales, every internal scroll boundary and safe-area/keyboard combination.
- Exhaustive keyboard traversal or automated axe/screen-reader audit across the entire app. Only the described keyboard field check was newly run.
- Every color pair in every hover, active, disabled, error or loading state; APCA, wide-gamut clipping, translucent header extremes and text over gradients/images. WCAG 2 normal-text AA was the metric used for reported text failures.
- Full motion replay at 10% speed, GPU profiling or newly repeated reduced-motion checks. Previous motion work is not a substitute for those checks.
- Live OAuth, notification delivery/feed, real team mutations, persistence across real accounts, Clerk signup redirects and production subdomain/DNS routing. The fixture UI cannot certify these.
- A full source-wide localization/copy inventory. Findings cover the listed primary screens and cited handlers, not every backend error string.

No source lint/test/build rerun was needed for this read-only report. The UI harness itself compiled and rendered. Existing work was preserved.

## Original audit verdict

**Block** for the inspected scope: five HIGH root causes remain. Fix measured contrast, keyboard focus, long-label action clipping and truthful notification state before calling this release ready. The surface consolidation direction can then be implemented and remeasured without changing the established product identity.


## Implementation follow-up — 6 November 2026

All ten findings in this report have been addressed in source and the relevant UI checks rerun. The original Block verdict above describes the pre-fix state.

| Finding | Implemented correction | Verification |
| --- | --- | --- |
| Secondary contrast | Light secondary text now uses #626262; dark secondary text retained | Sidebar 5.591:1, selected metadata 5.451:1, selected vote 5.004:1, share step label 4.764:1 |
| Search shortcut | Removed opacity attenuation | 5.895:1 light, 5.857:1 dark on sampled search surfaces |
| Composer focus | Keyboard-only 2px inset underline using theme-aware primary text; pointer hover/focus remain flat | Title/details Tab focus and pointer-click assertions; dark focus capture |
| Share clipping | Actions wrap; labels can wrap; controls have min-height/max-width; removed fixed Preview overlay | German-length label and Preview both stay inside 320px; label wraps instead of clipping |
| Notification truthfulness | Unavailable activity state replaces fabricated caught-up state | Pane copy checked; all five preference switches retained |
| Widget foreground | All primary widget controls use semantic foreground; external launcher computes black/white from accent | #dddddd workspace: black submit/post/launcher glyph; external origin checks and keyboard behavior pass |
| Public promise | Removed unconditional review/build promise | Source now says “Share an idea, vote on requests, and follow progress.” |
| Vocabulary | Workspace menu, Workspace group and Workspace name label | Updated visible and assistive text |
| Branding scope | Description includes workspace and public boards | Matches current theme propagation |
| Durable labels | Visible Title, Details, First name, Last name and Workspace name labels | Browser assertions and narrow account/submission captures |

Also isolated the share URL as LTR content, corrected “Collect feedback” capitalization, reused theme-aware borders/shadows for installation copy controls, and simplified widget CTA elevation using the existing coss shadow utilities. Purple #6247aa, status icons, gradient avatars and compact typography remain.

### Reverification

- `npm run typecheck` — passed.
- Focused ESLint over the nine edited feedback components and `public/widget.js` — passed.
- `node /tmp/ent-audit/fixed-deep.cjs` — 45 screen visits at 320/768/1440; no page errors, no document overflow, **zero failing eligible sampled text pairs**. Same compositing exclusions as the original audit apply.
- `node /tmp/ent-audit/fixed-stress.cjs` — keyboard underline confirmed; long label right edge now 271px in a 320px viewport; CSS zoom stress has no document overflow.
- `node /tmp/ent-audit/regressions.cjs` — title/details keyboard versus pointer focus, persistent labels, notification copy/preferences, light-accent widget actions and translated share controls passed. One initial test run lost its Copy link locator after translating that label; corrected the locator and reran successfully.
- `node /tmp/ent-audit/light-loader.cjs` — external light-accent foreground, origin/source checks, viewport fit, rapid reversal, Escape, keyboard activation and reduced motion passed with mocked iframe content.

[After evidence](after/) contains measurements, scripts and captures; original evidence remains under evidence/. Browser tests render actual components with fixture auth/data/actions, not live account mutations. No production build or real Clerk/OAuth/email/DNS test was performed. Native 200% browser zoom, real translated locales, exhaustive screen-reader traversal, and unsampled color states remain outside this verification.

**Follow-up verdict: Approve for the ten reported findings and tested scope.** This does not certify the outstanding backend work or unverified states listed above.

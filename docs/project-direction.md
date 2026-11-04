# Ent Feedback: project and UI direction

Reviewed 4 November 2026. This is a proposal for discussion, based on the supplied v1 scope, design specification, repository inspection, and the primary references below. No UI redesign or further Figma component generation was performed in this review.

## Recommended direction

A compact, welcoming feedback board. Keep Inter, neutral surfaces, one configurable blue accent, thin borders, and the existing status colors. Make the content and voting the first things people notice. Use depth for dialogs and floating panels; keep the main list quiet. This is a design recommendation for this product, not a claim that one style is universally best.

The existing large gradient introduction, decorative badge, repeated submission actions, and aggregate counters consume space before people reach feedback. Propose a short project introduction with one sentence and a clear submission action. Do not promise to build the most-voted requests; say that votes help prioritize decisions.

## Layout proposal

Public board, desktop: centered 720px container, 680px feedback list, compact project identity/header, short introduction, status chips, Top/New sorting, then the list. Put the 48 × 56px vote control on the left. Keep an 18px title, two-line description, concise metadata, and a labeled status. Reserve the primary accent for submission, selected filters, links, and voted controls.

Public board, mobile: 16px side margins, no fixed-width content, 44px interaction targets, horizontally scrollable status filters, and a persistent submit action. Let long titles wrap; move status below the title when necessary. Start design exploration at 390px and also check 320px, 640px and 1024px.

Item page: Back to feedback, vote/title/status, complete description, then comments and a plain reply composer. A subtle Team label distinguishes owner replies. Keep visitors in the public flow; owner actions belong in the owner dashboard.

Submission: a 480px desktop dialog and mobile sheet. Title first, matching existing requests directly below it, then description and email. Show confirmation, validation, sending, and failure states. Choose a truthful email confirmation flow before promising email updates.

Owner dashboard: a restrained sidebar and table within a 1200px content area. Prioritize title, votes, status and actions. Include a working project-settings view for name, logo and accent. Use a dedicated merge review showing the destination item and what happens to votes/comments. Confirm deletion or provide a reliable undo.

Widget: add after the core flow works. Desktop panel 380 × 560px; a mobile sheet that fits the visible viewport. Design a compact item treatment for the narrow panel. Include board and submission views, focus management, Escape handling, focus restoration, and a real installation snippet with a project identifier.

## Scope audit from source

| Capability | Current implementation | Required next step |
|---|---|---|
| Public list and status filters | Present | Add Top/New sorting; review mobile density |
| Submission | Local state, basic validation, substring matching | Persist posts; improve similar-item matching; define email flow |
| Votes | Toggles local React state | Persist votes with one vote per verified identity and item |
| Comments | Local state | Persist replies and distinguish authenticated owner replies |
| Status changes | Update shared local state | Persist changes and enforce owner access |
| Merge | Toast placeholder | Select destination and merge without double-counting voters |
| Delete | Immediate local deletion | Persist with owner authorization and confirmation/undo |
| Project settings | Toast placeholder | Editable project name, logo and accent |
| Widget | Panel within this app | Installable cross-site embed and submission flow |
| Light/dark | CSS themes and local theme preference | Check contrast and initial theme rendering in a browser |

The prototype has no shared durable data layer in its feedback provider. Refreshing resets feedback; separate visitors cannot share changes. The optional submission email is passed to the provider but is not stored or used. The success message currently promises an email when an idea ships, which the implementation cannot send.

Some sample requests describe integrations and public roadmap features as planned or shipped. Those may be legitimate customer requests, but their fictional release claims should not be mistaken for implemented v1 capabilities.

## Build order after the UI discussion

1. Settle public-board density, identity and mobile layout; add Top/New sorting.
2. Establish projects, posts, identities, votes and comments in a durable backend; protect owner operations. Supabase is suggested by the scope, not installed or configured by this review.
3. Complete submission, vote deduplication, comments and owner status changes end to end.
4. Finish project settings, duplicate merging and spam deletion.
5. Build and test the embeddable widget on a separate host page.

Keep integrations, analytics, custom domains, public roadmap/changelog pages, team roles and AI outside v1. Pricing remains a product proposal; billing implementation is not implied by this review.

## Elf drift findings and limits

The live `check_drift` call failed with: “Connect this project's configured Figma file first.” Elf's onboarding tool reports MCP project file `nMkJyanPcxDg6MZpfTwseE`, while the selected/connected Ent Feedback file and this repository's `elf.config.json` use `Hkm2fZfiP82wOLjKF0u1p2`. The selected-file connection works for reading variables; project drift monitoring remains bound to a different server-side project context. Point the running Elf MCP project context at this repository before relying on its project drift report. Automatic sync remains off.

The existing local report is historical, not a fresh successful check. It reports 66 tokens missing in code, 16 missing in Figma and 68 unsynced code components. These counts do not establish visual differences: Figma names such as `color/status-open-bg` normalize differently from CSS `--status-open-bg`, many CSS colors use OKLCH, and the scanner found only 16 code tokens. Zero reported value mismatches is not evidence of a match when names do not pair.

Live variable read-back confirms Light `color/primary = #2563EB` and `color/ring = #60A5FA`. CSS uses OKLCH values for primary and ring; ring is achromatic in both themes, unlike the blue specification. Treat these as items for comparison, not a reason to replace the generated preset: the design document makes generated CSS the color source of truth. Reconcile code keys, names and mode mappings, then compare resolved colors.

Use Elf for token/resource drift after fixing its project context. Check responsive layout, interaction behavior, contrast and screenshots separately; a token drift report cannot certify these.

## What to design next in Figma

Design screens and flows using the specifications rather than expanding the component library:

1. Public board at 390px and desktop: explore separate bordered cards versus a single list with dividers. Keep content identical for a fair comparison.
2. Item detail and owner reply, including a long title and long comment.
3. Submission with similar ideas, email verification, validation errors, success and failure.
4. Owner table, project settings, merge destination/review, and delete confirmation.
5. Empty board, empty filtered result, loading and network failure; then dark versions of the chosen screens.
6. Widget board and submission over an actual host-app screen, on desktop and phone.

Start our next UI discussion with the public board: how compact the header should be, whether items are separate cards or divided rows, and how much project personality the logo and introduction should carry.

## Research references

- [UserJot's public feedback board](https://feedback.userjot.com/) exposes vote counts, post titles, statuses and comments in a browsing interface. Borrow the clarity of its request list; its multiple boards and roadmap navigation exceed this v1 scope.
- [UserJot widget overview](https://userjot.com/docs/widget-overview) describes an in-product feedback entry point. This supports treating the widget as another entry into the same core flow.
- [Canny: Creating a Post](https://help.canny.io/en/articles/3831672-creating-a-post) documents public submission, votes, comments, optional status emails and an initial Open status. Borrow the feedback lifecycle, while keeping the scoped form short.
- [Nolt](https://nolt.io/) presents feedback boards, item comments and duplicate merging. Its broader task, roadmap and integration features are not needed for this v1.

Research used public pages and product documentation. Recommendations above are design judgments based on the scope and source review; they have not yet been validated by a rendered-browser inspection or user testing.

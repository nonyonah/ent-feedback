# Landing-page UI polish

## Latest revision

Final user refinement: restore readable chip/comment backgrounds (#F5F5F5 light, #2A2A2A dark); rename the primary hero action to “Get started”; remove icons from both hero actions. This supersedes the earlier request for literal identical foreground/background colors.


Paper exports `4O6-0` (light) and `4I5-0` (dark), supplied on 7 November, are now the landing styling source. Matched the 60px/500 hero, 31px feature heading, 18px/550 bento titles, 10px card corners, 16px grid gap, white outlined light cards (warm #FFFCFB vote card), #131211 dark cards, snippet surfaces/shadows/insets, and outlined light CTA banner. Dark-only omissions of the eyebrow and hero button arrows follow the dark export. Shared primitives, image preview, auth links, and responsive layouts remain functional.

The user explicitly selected “Match the exported colors exactly” after the equal chip/comment background and text colors were flagged. These surfaces now use #686868 in light mode and #ABABAB in dark mode exactly as supplied. Their labels consequently blend into those backgrounds; this is intentional fidelity to the user's choice, not a readability fix.

Verification: targeted ESLint passed; Chromium returned no page errors. Measured 60px/500 hero, 10px card corners, intended card colors, 1080px CTA width at a 1440px viewport, light/dark screenshots, preview dialog/Escape, and no document overflow at 320/390/768px. Fractional .5px outlines rasterize to 1px on the test browser's 1x display. Not verified: pixel comparison against a Paper-rendered screenshot, Safari/Firefox, physical devices, or production hosting.

## Earlier revision

The next refinement quietens the hero and CTA (medium weights, smaller scale, neutral headlines), removes floating annotations, and replaces the plain feature list with a four-card bento. The bento imports the real shared Button, Textarea, Avatar, StatusLabel, and FeedbackTypeLabel components. Samples are inert illustrations with accessible feature descriptions, so visitors cannot mistake them for live feedback forms.

Verification: targeted ESLint passed; Chromium rendered without errors. Checked four bento cards and shared type/status primitives, desktop/mobile/dark captures, widths 320/390/768/1440px without horizontal overflow, keyboard product tabs, and full-image dialog/Escape.

## Earlier revision

The user requested heavier and larger typography, tighter spacing, a Safari-style mockup, a feature grid, and a larger unframed final CTA. Both layouts now share these changes. The earlier journey, interactive widget section, and FAQ have been removed; their checks below describe the previous revision only.

Current verification: targeted ESLint passed; Chromium rendered both layouts without page errors. Checked 320/390/768/1440px widths without horizontal overflow, light/dark product images, keyboard product tabs, screenshot dialog/Escape, six feature entries, and absence of the removed sections. Desktop hero computes to 76px/600. Safari chrome is a decorative HTML/CSS mockup, not a live browser.

Not verified in this revision: Safari/Firefox, physical devices, production hosting, live signup.

Approve for the inspected revision.

## Previous revision

Scope: `/` and `/landing-v2`. Both use `src/components/marketing/landing-page.tsx`; the second uses its split composition. Existing application screens are outside this review.

References revisited: [Beside](https://www.beside.com/), [Altitude](https://altitude.xyz/), [UserJot](https://userjot.com/), and [Linear](https://linear.app/). Reviewed the sites and the saved desktop captures. The revised direction uses a stronger product scene, selective visual personality, and interactions that explain the feedback loop. It retains Inter, the app's purple, and captures of the actual dashboard.

## Surfaces and concentric radius

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `src/components/marketing/landing-page.module.css:15` | Neutral screenshot frame carried almost all the visual story; repeated sections had similar emphasis. | Purple product stage, layered screenshot elevation, quieter independent story surfaces, and a contrasting final invitation. Mobile stage radius accounts for its image inset. | Shadows for elevation and concentric radius make the hierarchy and nested surfaces read clearly. |
| MEDIUM | `src/components/marketing/landing-page.module.css:15` | Image edges used tinted borders. | Actual product images use a pure-black 10% inset outline in light mode and pure-white 10% in dark. | Image outlines separate the image without a muddy themed edge. |

## Interruptible and purposeful motion

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `src/components/marketing/landing-page.tsx:13` | Static overview offered little help examining the product. | Three keyboard-accessible views frame the real inbox and conversation; a native dialog opens the complete screenshot. | Interaction explains the product, with persistent selected labels as static cues. |
| MEDIUM | `src/components/marketing/landing-page.module.css:25` | Widget mounted/unmounted with a one-way entrance; launcher icons swapped instantly. | Widget stays mounted, uses interruptible opacity/6px translation transitions, and becomes inert when closed. Both launcher icons remain in the DOM and crossfade using the skill's exact scale, blur, easing, and duration. | Interruptible animations and contextual icon transitions preserve context when users reverse direction. |
| LOW | `src/components/marketing/landing-page.module.css:15` | Hero had no staged hierarchy; buttons translated by 1px on press. | Infrequent hero chunks enter with a 100ms stagger. Action buttons press to scale 0.96; frequent controls respond in 150ms or less. Reduced motion removes entrances and press movement. | Split entrances communicate hierarchy; scale on press gives consistent tactile feedback. |

## Theme and icon consistency

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `src/components/marketing/landing-page.tsx:26` | Color transitions could run together during a system-theme change. | Theme-class changes temporarily suppress transitions, force a reflow, and restore transitions on the next animation frame. | Suppress transitions on theme switch: colors snap together rather than smearing. |
| LOW | `src/components/marketing/landing-page.module.css:27` | Icon stroke used the app's heavier default throughout marketing copy. | Marketing icons use one Hugeicons set and a consistent 2px stroke with currentColor. | Match icon stroke to the accompanying text weight. |

## Verification

- Targeted ESLint: passed.
- Chromium: both compositions render without page errors.
- Inspected desktop, mobile, and dark-mode captures.
- Checked widths 320, 390, 768, and 1440px: no horizontal document overflow.
- Checked responsive image decoding. Increased mobile image sizes to match the intentional close-up instead of downloading an undersized screenshot.
- Product tabs: mouse, arrow keys, selection state, and rapid reversal checked.
- Full-image dialog: open and Escape close checked.
- Status journey: each state is selectable and changes its message; sample content only.
- Widget: open, close, reopening, Escape, required fields, submission success, reset, and closed-panel accessibility checked. No live feedback writes.
- FAQ open state, CTA hover, focus outline, and press CSS checked.
- Hero animation replayed at 10% browser playback using Chrome DevTools Protocol. Durations, easing, scale, and blur values inspected in source.
- Reduced-motion and device-theme changes checked.
- Not verified: manual scrubbing in the DevTools Animations panel, Safari/Firefox, physical touch devices, production hosting, and live account creation. No new backend or asynchronous loading state is introduced by this local demo.

Approve — for the inspected landing-page scope. No HIGH findings remain. Unverified coverage above is not approved.

# Qatalog reference: implemented structure

The user supplied a Qatalog landing-page image and requested its alignment, typographic hierarchy, and layout principles, alongside a new mascot logo. This revision supersedes the earlier fixed Paper composition while preserving its bento snippets, charcoal actions, and logo-only branding.

## Alignment and reading order

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `src/components/marketing/landing-page.tsx:23` | Hero led directly into one large screenshot; most sections repeated the same composition. | A focused headline, sample feedback strip, outcome statement, two alternating product stories, bento, and final banner. | Order by importance: explain the promise, show the input, then show how the product helps. |
| MEDIUM | `src/components/marketing/landing-page.module.css:20` | Header, image, feature content, and footer used different alignment edges. | 1080px shared content grid with 24px gutters, a centered compact header, and faint column guides. Text/media rows use minmax(0,1fr) tracks and stack in DOM order on narrow layouts. | Shared edges and deliberate grouping give the page a coherent reading rhythm. |

## Typography

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `src/components/marketing/landing-page.module.css:20` | A large headline and small product content carried most of the hierarchy. | 58px hero, 35–36px story headings, 31px bento heading, 18px card titles; primary copy 15px with 1.65–1.7 leading. Headings balance; descriptions use pretty wrapping and bounded measures. | Heading sizes descend and readable measures distinguish the promise, explanation, and product detail. |
| LOW | `src/components/marketing/landing-page.tsx:35` | Hiding explicit line breaks on mobile joined adjacent words. | Natural whitespace retained around line breaks; long words can wrap. | Wrap deliberately without changing the underlying text. |

## Brand assets

The supplied `Fluffy Mascot Feedback Card.png` is the source. Removed empty transparent margins, preserved the artwork, and prepared appropriately sized PNG/icon assets. Updated the shared logo, favicon, and Apple icon. No visible “Ent Feedback” wordmark is added to the header or footer; accessible image/link labels retain the product name. Workspace names and user-provided workspace logos remain their own identities. Product screenshots were refreshed from actual dashboard components using sample data.

## Verification

- Targeted ESLint passed.
- Chromium: no page errors; inspected desktop and mobile screenshots, dark theme, and an RTL mirror.
- Checked 320, 390, 768, 1024, and 1440px document widths without horizontal overflow.
- Ran a 200% CSS-zoom layout stress check; this is not a native browser-zoom test.
- Full-product-image dialog opens and closes with Escape.
- Header/footer checked for absence of a visible product wordmark.
- Source: logical properties for new alignment rules; text remains selectable outside inert product illustrations.
- Not verified: native browser zoom, Safari/Firefox, physical devices, production hosting, or live signup. The sample strip and component scenes do not submit feedback.

Approve — for inspected layout and typography coverage. No HIGH finding remains in that coverage.

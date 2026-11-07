# Ent Feedback landing-page direction

Research date: 7 November 2026. Research and proposal only; no landing-page implementation or app routing changed.

## Recommendation

A short, light, product-led page: Beside's open composition, UserJot's concrete product examples, Altitude.xyz's clear promise paired with UI, and Linear's typographic/surface restraint. Keep the product's purple accent and Inter variable. The visitor should understand what Ent does, see the actual workflow, and try the widget without reading a feature catalogue.

Primary audience: independent software makers and small SaaS businesses collecting feedback from their users. The buyer creates a workspace; their users submit, vote and discuss through a public board or embedded widget.

## References and decisions

| Reference | Observed approach | Application to Ent |
| --- | --- | --- |
| [Beside](https://www.beside.com/) | Centered outcome-led hero, generous whitespace, quiet typography, one primary hero CTA and a phone demonstration. | Take its spacious composition and plain-language hierarchy. Our UI preview replaces the phone; the clock ornament is not needed. |
| [UserJot](https://userjot.com/) | Centered hero, product-mode preview, widget demonstrations and a request-lifecycle section. Its current site promotes support/AI alongside feedback. | Explain Ent through real product states and one request's journey. Keep the story focused on our feedback product. |
| [Altitude.xyz](https://altitude.xyz/) | Split hero: a plain-language promise and CTA next to a large product scene on a colored surface. The product story continues in concrete sections. | Give the product preview enough space to be understood; use a subdued neutral/lavender frame rather than copying its finance palette. |
| [Linear](https://linear.app/) | Large Inter typography, restrained dark surfaces/hairlines and substantial product-interface scenes. | Borrow hierarchy and precision. Keep our page shorter, with light as the initial visual direction and an intentional dark counterpart. |
| [Tally](https://tally.so/) | Immediately names its product category and demonstrates link, popup and embed sharing. | Explain board versus widget in everyday language. Borrow clarity, while keeping Ent's quieter visual identity. |

Desktop and mobile captures for the four primary references are alongside this brief. Tally has a supplementary desktop capture. `browser-observations.json` contains browser-extracted headings/type data. Altitude.xyz's accessible H1 differs from its animated visible headline, so its recorded H1 font size is not a reliable measurement of that visual headline. Linear's final captures use reduced motion after allowing the hero to render. These are observations of these particular visits, not permanent specifications of third-party sites.

## Proposed page

1. **Navigation:** Ent Feedback logo; How it works, Widget, FAQ; Log in and Get started. Anchor links keep this first version to one page. Pricing can be added once the offer is decided.
2. **Hero and product preview:** a centered two-line headline, one supporting sentence, Get started plus a quieter Try the widget action. Below, one large, legible preview of the real feedback inbox with a selected conversation and a Trending request. Use prepared fictional data, not private customer records. On mobile, crop to a deliberate meaningful region rather than shrinking the full desktop dashboard to unreadable size.
3. **One simple workflow:** three short statements: collect through a public board or widget; understand demand through votes, discussion and Trending; reply and track progress through statuses. Reuse one example request across the scenes so the connection is clear. Treat these as one narrative section rather than three separate feature sections.
4. **Widget demonstration:** a compact sample website with the actual widget launcher. Explain that users can submit without leaving the site. Demo submissions must go to a dedicated demo context, not the real `elf-workspace` customer board used during development. A clearly labeled interactive preview is also an option.
5. **FAQ, final CTA, footer:** four questions covering board/widget differences, guest submission, embedding and branding. End with a short invitation to create a workspace, then legal/contact/product links that actually exist.

Aim for approximately 350–500 words of marketing copy, one hero preview and one widget demonstration. Let those explain the product rather than adding a large grid of repeated benefits. Keep logos, usage figures and testimonials out until there is real evidence and permission to publish them.

## Starting copy

**Hero:** Know what to build next.

**Supporting copy:** Collect feedback, bug reports, and feature requests in one place. Let users vote, join the conversation, and follow progress.

**Actions:** Get started · Try the widget

**Workflow:**

- **Make it easy to speak up.** Share a board or add the widget to your site.
- **See what matters.** Votes and conversations bring active requests to the top.
- **Keep the conversation moving.** Reply, update the status, and show what has shipped.

**Widget section:** Feedback, right where your users are.

**Final CTA:** Give your users a place to be heard.

Alternative hero if a more literal direction is preferred: **Customer feedback, in one clear place.**

## Visual direction

- Light neutral page, white product surfaces, charcoal text, readable secondary gray. Purple used for primary actions and a few meaningful product details.
- Inter variable: proposed hero 48–56px desktop / 34–38px mobile, weight 400–500; section headings 28–36px; body 16–18px. Existing app UI stays 13–14px. Marketing needs a scoped type scale because current global text-size tokens deliberately compress app typography.
- Content width around 1100px, hero copy width around 650px. Generous but purposeful section spacing, fine separators, restrained rounding and shallow shadows around product scenes.
- A static headline, with limited hover/state transitions and at most one short product interaction. Respect reduced motion. Avoid making content wait for entrance animations.
- Use actual UI imagery rather than another illustration style. Existing isometric illustrations stay in product empty states.

## Product fit and implementation boundaries

Current code, feature flags and recently tested flows are the source of truth; older `product-flow.md` prose contains pre-backend details that are no longer current.

Lead with public boards, an embeddable widget, feedback/bug/request types, votes, threaded comments, tags, engagement ordering, Trending and visible status changes. Branding includes workspace name/image, accent and theme.

V1 flags disable integrations, user-supplied custom domains and team-management/role configuration. Roadmap and changelog pages were removed from scope. Avoid marketing those, AI features, unrestricted file types, unconfirmed free plans or setup-time guarantees. Scheduled email delivery is still a hosting/deployment decision, so the page should show visible progress and follows without promising an unverified email-delivery schedule.

`src/app/page.tsx` currently redirects `/` to `/dashboard`. Implementation would put the marketing page at `/`, preserve `/dashboard` as the application entry and `/p/...` as public boards, and separate the marketing header from the public-board header. Keep workspace data/loading off the marketing critical path. Get started should preserve workspace-owner signup intent; a visitor using the widget must stay in the public/guest flow.

Open decisions before shipping: pricing/access offer, launch/public app domain, demo persistence policy and any published customer proof. None prevents a first visual draft with neutral Get started copy and a labeled local demo.

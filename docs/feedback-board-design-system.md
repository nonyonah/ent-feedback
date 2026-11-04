# Feedback Board: Design System (v1 + v2 combined)

Built with **coss ui** components, themed by the **shadcn preset `b1D23ulM`**. Layout and feel are inspired by UserJot: clean white UI, vote-first lists, small status tags, a sidebar dashboard, and an in-app widget.

This file is written so the **Elf MCP** can read it and build the full system in Figma (variables, text styles, effect styles, components), and so the same names match the code.

## Principles
1. **Vote first.** The vote button is the strongest control on every item.
2. **Calm and light.** White space, thin borders, soft shadows.
3. **One accent.** The owner changes one color (`color/primary`) and the board follows.
4. **Phone first.** Tap targets at least 44px.
5. **Light and dark** from day one.
6. **Preset first.** Colors, font, and radius come from the preset. Only add custom tokens when the preset has nothing for it.

---

## 1. Stack and preset

**Preset `b1D23ulM` decodes to:**
| Setting | Value |
|---|---|
| Style | mira |
| Base color | neutral |
| Theme | blue |
| Chart color | neutral |
| Icon library | lucide |
| Font | Inter |
| Heading font | inherit (Inter) |
| Radius | default |
| Menu accent | subtle |
| Menu color | default |

**Code setup (in this order):**
```bash
# 1. new Next.js project with Tailwind v4, then:
npx shadcn@latest init

# 2. add coss ui components
npx shadcn@latest add @coss/ui

# 3. apply only the preset's theme and font, keeping the coss components
npx shadcn@latest apply --preset b1D23ulM --only theme,font

# 4. optional: coss knowledge for your AI coding tool
npx skills add cosscom/coss
```
- Skip `@coss/colors-neutral`. It would replace the preset colors.
- The preset sets colors, font, and radius. The "mira" style shapes shadcn's own components, so coss components keep their own shape.
- Icons: Lucide.

**Source of truth:** after step 3, the generated `globals.css` is the truth for color values. The hex values below are close matches to the preset, so Figma can be built now. Run the Elf CLI later to diff Figma against the real `globals.css` and fix any drift.

---

## 2. Variables

Naming: Figma variable name = code token without the `--` (for example `--primary` becomes `color/primary`).

### Collection: Color (modes: Light, Dark)
Preset tokens (names match shadcn so code and Figma line up):

| Token | Type | Light | Dark | Use |
|---|---|---|---|---|
| color/background | COLOR | #FFFFFF | #0A0A0A | Page background |
| color/foreground | COLOR | #0A0A0A | #FAFAFA | Main text |
| color/card | COLOR | #FFFFFF | #171717 | Cards, panels |
| color/card-foreground | COLOR | #0A0A0A | #FAFAFA | Text on cards |
| color/popover | COLOR | #FFFFFF | #171717 | Menus, dialogs |
| color/popover-foreground | COLOR | #0A0A0A | #FAFAFA | Text in popovers |
| color/primary | COLOR | #2563EB | #3B82F6 | Brand and accent (owner can change) |
| color/primary-foreground | COLOR | #EFF6FF | #EFF6FF | Text on primary |
| color/secondary | COLOR | #F5F5F5 | #262626 | Secondary buttons |
| color/secondary-foreground | COLOR | #171717 | #FAFAFA | Text on secondary |
| color/muted | COLOR | #F5F5F5 | #262626 | Subtle backgrounds, hover, chips |
| color/muted-foreground | COLOR | #737373 | #A3A3A3 | Secondary text, hints, timestamps |
| color/accent | COLOR | #F5F5F5 | #262626 | Hover and selected rows |
| color/accent-foreground | COLOR | #171717 | #FAFAFA | Text on accent |
| color/destructive | COLOR | #E7000B | #FF6467 | Delete, errors |
| color/border | COLOR | #E5E5E5 | #FFFFFF1A | Default borders |
| color/input | COLOR | #E5E5E5 | #FFFFFF26 | Input borders |
| color/ring | COLOR | #60A5FA | #2563EB | Focus ring |
| color/sidebar | COLOR | #FAFAFA | #171717 | Dashboard sidebar |
| color/sidebar-foreground | COLOR | #0A0A0A | #FAFAFA | Sidebar text |
| color/sidebar-accent | COLOR | #F5F5F5 | #262626 | Selected sidebar item |
| color/sidebar-border | COLOR | #E5E5E5 | #FFFFFF1A | Sidebar divider |

Custom tokens (not in the preset):

| Token | Type | Light | Dark | Use |
|---|---|---|---|---|
| color/status-open-bg | COLOR | #F4F4F5 | #1B1B1F | Open tag background |
| color/status-open-fg | COLOR | #52525B | #A1A1AA | Open tag text |
| color/status-planned-bg | COLOR | #E8F0FE | #172554 | Planned tag background |
| color/status-planned-fg | COLOR | #1D4ED8 | #93C5FD | Planned tag text |
| color/status-progress-bg | COLOR | #FFF4DB | #3B2A0A | In Progress tag background |
| color/status-progress-fg | COLOR | #B45309 | #FCD34D | In Progress tag text |
| color/status-shipped-bg | COLOR | #E6F6EC | #0F2E1A | Shipped tag background |
| color/status-shipped-fg | COLOR | #15803D | #86EFAC | Shipped tag text |
| color/vote-active-bg | COLOR | #2563EB1F | #3B82F63D | Voted button background |
| color/vote-active-border | COLOR | #2563EB | #3B82F6 | Voted button border |
| color/success | COLOR | #16A34A | #4ADE80 | Success toast and icon |

**Owner accent:** in code, override `--primary` (and `--ring`) on the board root per project. Everything built on the tokens follows.

**v1 names to v2 tokens** (for anyone reading old notes):
`surface` = card · `surface-subtle` = muted · `border-strong` = input · `text` = foreground · `text-muted` and `text-subtle` = muted-foreground · `accent` = primary · `accent-soft` = vote-active-bg · `danger` = destructive.

### Collection: Radius (mode: Default)
Based on the shadcn default radius of 10px. Confirm against `--radius` after setup.

| Token | Type | Value | Use |
|---|---|---|---|
| radius/sm | FLOAT | 6 | Tags, small controls |
| radius/md | FLOAT | 8 | Buttons, inputs |
| radius/lg | FLOAT | 10 | Cards, feedback items |
| radius/xl | FLOAT | 14 | Dialogs, widget panel |
| radius/full | FLOAT | 999 | Pills, avatars, launcher |

### Collection: Spacing (mode: Default)
4px scale.

| Token | Type | Value |
|---|---|---|
| space/1 | FLOAT | 4 |
| space/2 | FLOAT | 8 |
| space/3 | FLOAT | 12 |
| space/4 | FLOAT | 16 |
| space/5 | FLOAT | 20 |
| space/6 | FLOAT | 24 |
| space/8 | FLOAT | 32 |
| space/10 | FLOAT | 40 |
| space/12 | FLOAT | 48 |
| space/16 | FLOAT | 64 |

### Collection: Sizing (mode: Default)
| Token | Type | Value | Use |
|---|---|---|---|
| size/control-sm | FLOAT | 32 | Small controls |
| size/control-md | FLOAT | 40 | Default controls |
| size/control-lg | FLOAT | 48 | Large controls |
| size/tap-min | FLOAT | 44 | Minimum tap target |
| size/vote-width | FLOAT | 48 | Vote button width |
| size/vote-height | FLOAT | 56 | Vote button height |
| size/avatar-sm | FLOAT | 24 | Small avatar |
| size/avatar-md | FLOAT | 32 | Default avatar |
| size/avatar-lg | FLOAT | 40 | Large avatar |
| size/board-max | FLOAT | 720 | Board content max width |
| size/dashboard-max | FLOAT | 1200 | Dashboard max width |
| size/widget-width | FLOAT | 380 | Widget panel width (desktop) |
| size/widget-height | FLOAT | 560 | Widget panel height (desktop) |
| size/launcher | FLOAT | 48 | Widget launcher button |

### Collection: Typography (mode: Default)
| Token | Type | Value |
|---|---|---|
| font/family | STRING | Inter |
| font/weight-regular | FLOAT | 400 |
| font/weight-medium | FLOAT | 500 |
| font/weight-semibold | FLOAT | 600 |

### Collection: Motion (mode: Default)
| Token | Type | Value | Use |
|---|---|---|---|
| motion/fast | FLOAT | 120 | Hover, tap bump (ms) |
| motion/base | FLOAT | 200 | Panels, toasts (ms) |

Easing is ease-out. Respect reduced motion.

---

## 3. Text styles
All use Inter.

| Style | Size | Line height | Weight | Use |
|---|---|---|---|---|
| Caption | 12 | 16 | Medium | Tags, timestamps |
| Body/Small | 14 | 20 | Regular | Descriptions, meta, comments |
| Label | 14 | 20 | Medium | Buttons, form labels |
| Body | 16 | 24 | Regular | Inputs, long text |
| Title/Item | 18 | 28 | Semibold | Feedback item titles |
| Title/Section | 20 | 28 | Semibold | Section titles, empty states |
| Title/Page | 24 | 32 | Semibold | Page titles |

## 4. Effect styles
| Style | Effect |
|---|---|
| Shadow/sm | Drop shadow, y 1, blur 2, #0000000F |
| Shadow/md | Drop shadow, y 4, blur 12, #00000014 |
| Shadow/lg | Drop shadow, y 12, blur 32, #00000029 |

---

## 5. Components

**Rule:** use a coss component wherever one exists. Build the board-specific pieces from them. Confirm exact coss names in the coss docs.

Format for each: base, variants, sizes, states, tokens.

### Button (coss Button)
- Variants: Primary, Secondary, Ghost, Destructive
- Sizes: sm 32, md 40, lg 48
- States: default, hover, pressed, focus (ring), disabled, loading (spinner)
- Tokens: primary fill uses color/primary and primary-foreground; Secondary uses color/secondary; radius/md; Label text style

### Input and Textarea (coss Input, Textarea)
- Input height 40; Textarea min height 96
- States: default, hover, focus (color/ring), error (color/destructive border plus message), disabled
- Label above (Label style), helper text below (Caption, muted-foreground)
- Tokens: border color/input; radius/md

### Avatar (coss Avatar)
- Sizes: 24, 32, 40. Image or initials on color/muted
- Stack: up to 3, then a "+N" count

### Vote Button (custom, the key component)
- Base: coss Button or Toggle
- Layout: vertical pill, up arrow (Lucide chevron-up) over the count
- Size: 48 wide, 56 tall (size/vote-width, size/vote-height)
- States: default (muted bg, border), hover (primary border), voted (vote-active-bg, vote-active-border, filled arrow), loading (arrow pulses), disabled (voting closed)
- Behavior: 120ms scale bump on tap
- Tokens: radius/lg; Label style for the count

### Status Tag (custom, built on coss Badge)
- Variants: Open, Planned, In Progress, Shipped
- Style: pill, Caption text style, padding 2 / 8, radius/full
- Tokens: status-*-bg and status-*-fg for each variant
- Always text plus color, never color alone

### Feedback Item (custom, built on coss Card)
- Layout: Vote Button (left), content (middle), meta row below
- Content: title (Title/Item), description (Body/Small, muted-foreground, 2 lines max), Status Tag, comment count, author, time
- States: default, hover (Shadow/sm), focus, pinned (pin icon)
- Tokens: color/card, color/border, radius/lg, padding space/4, gap space/4

### Comment (custom)
- Layout: Avatar 32, name (Label), time (Caption, muted), body (Body/Small)
- Variants: User, Owner (small "Team" badge), Status change note (inline, subtle, with icon)
- Actions: Reply and Vote in Caption ghost style

### Filter Bar (coss Tabs or Toggle Group, plus Select)
- Status filters: All, Open, Planned, In Progress, Shipped
- Sort: Top, New
- Selected state: color/accent background, accent-foreground text

### Submit Form (custom)
- Fields: title (Input), description (Textarea), email (Input), Primary Button
- "Similar ideas": compact Feedback Items shown under the title while typing, so people vote instead of posting duplicates

### Empty State (custom)
- Lucide icon, Title/Section, one muted line, one Primary Button ("Be the first to share an idea")

### Dialog (coss Dialog)
- Max width 480, radius/xl, Shadow/lg, dimmed backdrop
- On phones: full-screen sheet (coss Drawer or Sheet)

### Toast (coss Toast)
- Variants: Success, Error, Info
- Bottom center on phones, bottom right on desktop, auto-dismiss 4s, Shadow/md

### Skeleton (coss Skeleton)
- Shaped like a Feedback Item, soft shimmer

### Sidebar Item (coss Sidebar)
- Height 36, Lucide icon plus label (Label style)
- States: default, hover, selected (color/sidebar-accent)
- Sections: Requests (with status counts), Boards, Settings

### Dashboard Row (custom, built on coss Table)
- Columns: checkbox, vote count, title, status select, author, date, actions
- Hover shows actions: merge, delete, reply

### Widget Launcher (custom)
- 48px round button, bottom right, color/primary fill, radius/full, Shadow/md

### Widget Panel (custom)
- Desktop: 380 x 560, radius/xl, Shadow/lg. Phones: full-screen coss Drawer
- Tabs inside: Feedback, Submit
- Uses the same tokens, so the owner's accent carries over

---

## 6. Screens (to assemble after components)
1. **Public board:** header (project name, logo, Submit button), Filter Bar, list of Feedback Items
2. **Item page:** full description, Vote Button, Status Tag, comment thread
3. **Submit form:** as above, with similar ideas
4. **Owner dashboard:** Sidebar plus Dashboard Row table, quick status change, merge and delete
5. **Widget:** Launcher plus Panel over a sample app page

## 7. Layout and accessibility
- Breakpoints: 640 (phone to tablet), 1024 (tablet to desktop)
- Board: one centered column (size/board-max). Dashboard: sidebar plus content (size/dashboard-max)
- Text contrast at least 4.5:1, visible focus rings, full keyboard support
- Status is never color alone

## 8. Using this with Elf
1. Pair the Figma file with Elf.
2. Give this file to Elf to extract collections, variables, text styles, effect styles, and components.
3. Review the plan Elf shows and approve it.
4. Elf creates the variables first (Color with Light and Dark modes, then Radius, Spacing, Sizing, Typography, Motion), then text and effect styles, then components in this order: Button, Input, Avatar, Status Tag, Vote Button, Feedback Item, Comment, Filter Bar, Submit Form, Empty State, Dialog, Toast, Skeleton, Sidebar Item, Dashboard Row, Widget Launcher, Widget Panel.
5. After the code project exists, diff Figma tokens against `globals.css` and fix any drift.

## 9. Build order in code
1. Project setup and preset (section 1)
2. Custom tokens in `globals.css` (status, vote)
3. Status Tag, Vote Button, Feedback Item
4. Public board and Submit form
5. Item page and comments
6. Owner dashboard
7. Widget

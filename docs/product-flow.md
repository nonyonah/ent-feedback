# Current connected frontend flow

This file describes the current implementation, not the sequence of earlier redesigns. The backend handoff is [backend-handoff-deepseek.md](backend-handoff-deepseek.md), with the high-level sequence in [backend-plan.md](backend-plan.md). Clerk is selected for authentication and is not yet connected.

## Workspace and board management

1. `/onboarding` creates a workspace/project with an optional website, name, and handle. It creates no board. In the current product, workspace and project refer to this same container.
2. `/dashboard/boards` lists boards in the selected workspace. A sidebar plus opens the compact board-creation dialog: name and color or emoji only. A unique handle is generated automatically.
3. Board cards show the actual marker inline with the name. They support mouse/touch/keyboard reorder, Open inbox, Rename, Share, Copy link, and View public board. Rename preserves the public handle.
4. The switcher changes workspace, creates a workspace/project, opens Invite members directly over the dashboard, or logs out to the authentication entry point. Project overview and Project appearance were removed from that menu. Individual board links were removed from the sidebar.
5. `/dashboard` provides the feedback inbox, status filters, board selection, and conversation panel. Public and admin feedback changes use the same React session state.

Board reordering supports mouse dragging, long-press touch dragging, and keyboard Space/arrows/Space with Escape to cancel. Creation uses a fixed 300×400 marker popup for both Colors and Emojis, 25 supplied swatches, and lazy-loaded Unicode Emoji 17.0 data. Search covers the complete dataset; category browsing supports loading more results. The Unicode license is in `docs/third-party/`.

## Sharing and embedding

`/dashboard/share` contains board URLs, social share links, signature HTML, ready-to-paste messages, and the real `/widget.js` installation snippet. It is outside Settings. Message rows have filled/gray styling where supported by the selected icon library, plus bold expand/collapse controls on the right.

The loader takes `data-project` and `data-board` and creates an iframe for `/embed?project=...&board=...`. The redesigned widget is a 384px panel with search, status filtering, author rows, vote pills, the primary-color Submit feedback CTA, a single-message composer, image attachments, confirmation, details, and comments. It opens from a floating icon and keeps interactions inside the host app.

Preview widget in Settings opens the same Widget component directly in place. `/widget-preview` remains a functional standalone host preview and opens the current widget immediately. Backend handle resolution, persisted configuration, and shared iframe data are still required; an independent iframe currently initializes its own sample state.

## Settings and notifications

`/dashboard/settings` restores the last section from session storage; Branding has an explicit `/dashboard/settings/branding` route. The searchable settings navigation contains:

- Personal: Account.
- Workspace: Branding and Team.
- Product: Widget.
- Connections: Integrations.

Branding has an editable name, clickable image-upload avatar, primary color, theme, and attribution switch. Team shows saved members and invitation actions. Widget controls availability, visitor-detail requirements, greeting, and reply expectation. Slack and Discord use persisted workspace OAuth connections; see `oauth-integrations.md`.

Notification preferences live in the bell panel, not Settings: new feedback, comments on feedback, replies to comments, reactions to comments, and reactions to feedback. The supplied bell SVG is used throughout the interface. Other interface icons use Hugeicons; custom status icons remain unchanged.

## Public experience

- `/p/[project]/boards/[board]` displays a workspace-scoped public board; `/` uses the active preview board.
- The public header shows workspace branding, **Feedback only**, search, and signed-in account/bell controls or signed-out Sign In/Sign Up. Roadmap and Updates have been removed from the header and current scope.
- The compact 600px public feedback form uses the supplied guest/signed-in designs, a board selector limited to the current workspace, title/details, image attachments, searchable emojis, and Create. Hover styling and field/selector outline rings are removed from the public composer; keyboard button focus uses a subtle opacity change.
- `/items/[id]` displays a post, attachments, comments, reactions, follow/share actions, and a reply composer with images and emojis.
- `/following` shows locally followed posts.
- `/auth` uses Clerk authentication with explicit public/workspace intent. Public signup/signin returns to the current public screen without workspace onboarding. It never grants team membership.

## Backend boundary and removed screens

Clerk identity, workspace creation/membership, default boards, invitations and Slack/Discord OAuth have server persistence. Public workspace routes load saved branding and board metadata. Some board editing/settings and feedback interactions still use React state; these are separate backend handoff work. Following uses local storage, and the last settings section uses session storage. Invitation actions can send email; automated tests mock them. Automatic notification delivery is not connected.

`/design` and fixture-only `/preview/*` routes were removed. Old standalone project/preferences/install/share pages and Settings Feedback/Share/Notifications pages were removed or consolidated. Do not recreate them while connecting the backend.

All avatar fallbacks use deterministic, softly blended color gradients through the shared coss Avatar component. No initials are rendered. Workspace/profile image uploads still take precedence over the gradient fallback, and widget rows use the same shared avatar implementation.

Workspace-owner registration follows Clerk authentication → profile/photo → workspace creation → optional Slack/Discord authorization → optional member invitations → boards and the welcome tour. Progress survives provider redirects using server-owned onboarding metadata. Public header sign-in/sign-up controls open Clerk overlays. Settings → Integrations uses the same persisted workspace app connections as onboarding; see `oauth-integrations.md` for setup.


## Authentication journeys

| Entry | New account | Existing account | Destination |
| --- | --- | --- | --- |
| Public board Sign In / Sign Up | Clerk overlay only; no workspace required | Authenticate the same account | Return to the board/request being viewed |
| Main app `/auth` or `/dashboard` | Clerk → profile/photo → workspace → optional apps → optional team | Open existing memberships, or resume workspace setup | `/dashboard/boards` (or another dashboard screen) |
| Public account → My dashboard / Create a workspace | Reuse the existing Clerk session; no second signup | Create first workspace through the four-step setup; additional workspaces use `/onboarding` | Dashboard after setup |
| Team invitation | Clerk if needed, then review/accept invite | Validate invitation and membership on the server | Invited team’s dashboard after acceptance |

`intent=public` only accepts public return paths. It does not bypass dashboard authentication or membership checks. Workspace setup only accepts dashboard destinations, so an old public `next` query cannot send a creator back to a board after onboarding. A public participant can create their own workspace, or ask the existing team for an invitation; knowing a workspace domain never grants management access.

The public account menu includes My dashboard and Create a workspace. Authenticated feedback forms use the existing Clerk identity; posting anonymously remains an explicit local option. No extra user record or second authentication identity is needed when moving from public participation to workspace management.

Research: [UserJot getting started](https://feedback.userjot.com/help/articles/getting-started), [UserJot member roles](https://feedback.userjot.com/help/articles/member-roles), [Canny board access](https://help.canny.io/en/articles/3831745-choosing-the-right-board-access-public-private-or-custom). These sources distinguish customer participation from managing a workspace; the exact routing above is this application’s implementation.

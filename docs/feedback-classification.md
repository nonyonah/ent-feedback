# Workspace inbox, request types and tags

The dashboard request inbox loads every live request in the active workspace. A board card’s **Open inbox** link adds a `board` query parameter to narrow that view. Returning to a visible tab refreshes feedback; visible tabs also refresh every 15 seconds. Successful changes also signal same-origin tabs to reload their own server snapshot. Cross-origin tabs refresh on focus and through visible-tab polling; this is not a WebSocket subscription. Active-state synchronization refers to the same signed-in account. Guest identities remain scoped to their browser origin and workspace. Public boards and embedded widgets keep their own board scope.

Every request has a type: Feedback, Bug report or Feature request. Both public submission forms and the widget collect it. Existing records default to Feedback; they are not classified from their wording. Public rows and request details show the saved type and assigned tags. In a public conversation, the borderless Type dropdown lets the signed-in author or a workspace owner/admin change the type. The server checks ownership or membership before saving; other visitors see a read-only control. This operation does not change tags.

In dashboard request details, **Edit type & tags** allows an owner/admin to change the type, create workspace tags and assign up to 10 tags. Classification changes require **Save changes**. Creating a tag saves the workspace tag immediately; canceling classification leaves that tag available without assigning it to the request. Tag names are trimmed, limited to 32 characters and unique per workspace without regard to case. Tags are visible publicly when attached to a public request. Types and tags can filter the request inbox.

Migration `0006_rich_banshee.sql` adds the category column, tag catalog and workspace-scoped feedback/tag joins. Composite foreign keys prevent cross-workspace assignments. Workspace inbox reads require membership; classification and tag creation require owner/admin access. Existing public submission permissions are unchanged.

The widget header uses the workspace image (gradient fallback) and name. The React launcher uses the dialog trigger so a closing click does not reopen the dialog through an outside-press race.

Validation:

- Production webpack build, TypeScript, targeted ESLint and Drizzle migration checks passed.
- `node scripts/check-feedback-db.mjs` passed against PostgreSQL with fixture rollback and a mocked Clerk actor: second-board public submission, workspace inbox access, type/tag persistence, normalized tag uniqueness, cross-workspace tag rejection and existing feedback/comment/reaction behavior.
- Local browser checks used actual components and mocked actions: launcher click close/reopen and Escape, workspace header identity, bug submission, multi-board inbox, create/assign tag, tag filter and focus refresh.
- No live notification email was sent. Authenticated production Clerk flows and deployed cross-domain routing were not exercised by these checks.

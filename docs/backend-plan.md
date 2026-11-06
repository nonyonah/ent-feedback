# Backend plan — Clerk authentication

**V1 scope update:** integrations, custom domains and team/role management are temporarily disabled in UI and server entry points. Automatic workspace subdomains and internal ownership checks remain. See [v1 feature exclusions](v1-scope-gates.md). These features are not part of the next backend milestone.

Clerk is installed and connected for local development. Milestone 1 (database, schema, environment) and the Milestone 2 authentication/workspace/invitation paths are implemented. Board creation, renaming and ordering now persist, alongside branding, widget settings and notification preferences. Feedback, votes, comments, comment likes and admin status history now persist too. Server-backed follows and the paginated inbox are implemented. Notification events now queue email jobs transactionally, with a Sendbyte worker that rechecks recipient preferences before delivery. Image upload client wiring and R2 validation are implemented. Full live authentication/browser verification remains. See [feedback persistence](feedback-persistence.md). Sendbyte configuration is present locally; the authorized delivery test was accepted by Sendbyte. Recipient inbox confirmation and scheduler setup remain. See [email delivery](email-delivery.md).

DeepSeek implementation specification: [backend-handoff-deepseek.md](backend-handoff-deepseek.md).

1. Add Clerk to this Next.js App Router project. Replace verification previews with real sign-in, sign-up, session resolution, and logout while preserving the originating public workspace and return URL.
2. Persist workspaces/projects, members and invitations, boards, branding, and widget settings. Workspace authorization belongs in server-side application checks; a valid Clerk session alone grants no administration privileges.
3. Persist feedback, votes, comments/replies, reactions, follows, status history, and image attachments. Add validated object-storage uploads and remove data URLs from persisted records.
4. Resolve public handles and widget project/board configuration from the database. The public board, admin dashboard, and widget must use the same records without leaking data between workspaces.
5. Connect the five notification preferences and inbox; add delivery workers and integration authorization only after the core flows work.
6. Validate the full guest/authenticated, admin, and external-widget journeys before deployment.

The public navigation contains Feedback only. Roadmap and Updates are outside the current backend handoff scope.

Current verification and deployment limits: [backend readiness](backend-readiness.md).

Selected infrastructure (bootstrap, milestone 1):

- Database: PostgreSQL with Drizzle ORM (`node-postgres`), direct connection. No Hyperdrive or D1.
- Object storage: Cloudflare R2 with bounded server-side multipart uploads and private object reads.
- Transactional email: Sendbyte. See [email delivery setup](email-delivery.md).
- Background work: PostgreSQL-backed `jobs` table and worker; no separate queue provider.
- Hosting: still undecided.

Database, object storage, transactional email, and background-job providers are selected. Hosting remains undecided. These are separate from Clerk and must not introduce a second authentication provider.

Milestone 2 status:

- Clerk sign-in/sign-up/sign-out, protected dashboard/onboarding/registration routes, and app-user upsert are wired.
- Workspace creation, membership, team reads, invitation creation/cancellation/acceptance, and default board creation are server-backed.
- Registration stores onboarding progress in Clerk private metadata and supports profile, workspace, app connection, and invitation steps.
- Board creation/rename/reorder are server-backed with admin authorization, stable public handles and transactional ordering. See [board persistence](board-persistence.md).
- Remaining: verify the full browser authentication journey and email delivery, then connect uploads, follows and notification delivery.

Official references (verify against installed versions when implementing):
- [Clerk Next.js SDK](https://clerk.com/docs/reference/nextjs/overview)
- [Clerk route/session middleware](https://clerk.com/docs/reference/nextjs/clerk-middleware)
- [Verified Clerk webhooks](https://clerk.com/docs/guides/development/webhooks/syncing)

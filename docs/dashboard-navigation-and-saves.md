# Dashboard navigation validation and queued saves

Next.js 16.4.4 validates page segments separately when Cache Components and partial prefetching are enabled. The dashboard layout authenticates first, and WorkspaceGate withholds its children until the client workspace bootstrap finishes. Consequently, an inbox or settings page can be dropped from the instant-navigation validation render even though normal navigation works. A layout opt-out alone does not opt its child page segments out of that check.

Protected dashboard pages explicitly export `instant = false`. This matches their authenticated bootstrap behavior and leaves validation enabled outside the dashboard. The legacy Settings entry renders its remembered section directly in a Client Component behind a Server Component page; it no longer redirects through an “Opening settings…” screen. Sidebar links target the remembered section directly and explicitly prefetch their routes. The remembered section is scoped to the signed-in account. No authentication or workspace checks were removed.

The prior feedback mutation guard rejected every action while any other feedback mutation was running. Independent votes or status changes could therefore show “Another change is being saved” during ordinary use. Feedback writes now run through a FIFO queue. Identical pending commands share one promise, pending state covers queued work, failures release the queue, and queued work checks its workspace/account scope before execution. Existing request IDs, retry handling, upload ownership and server authorization remain intact.

Verification: mutation queue unit tests cover ordered overlapping writes and recovery after failure. Browser regression uses actual providers and delayed/failing mock server actions to cover independent votes, duplicate-click deduplication and saving after failure. Production build, TypeScript and targeted lint checks validate the route exports and client/server split. The production Clerk-authenticated development overlay was not exercised by these mocked browser checks.


## Cached navigation and empty states follow-up

Dashboard links explicitly opt into full route prefetching, including settings sections and board inbox destinations. The shared authenticated layout remains in place across child navigation; it passes the workspaces it already loaded to WorkspaceSync instead of initiating a second browser API request. No cross-user server cache was introduced. Route/authentication checks still run at the server boundary. Cold loads show a structured dashboard skeleton rather than an inline navigation-status message.

The main feedback, inbox, followed-post, board, notification, widget and command-search empty states use locally hosted unDraw SVG artwork. See `docs/third-party/empty-state-illustrations.md` for provenance and license. The browser smoke test verified illustration loading, direct remembered Settings links, the legacy entry rendering its remembered section without a redirect, and mobile bounds with mocked data. Actual authenticated production latency, router-cache hit rates and real-account session transitions were not measured; “instant” here describes the improved warm-navigation structure, not a zero-network guarantee.

## Board-scoped badges and device theme (6 November 2026)

Sidebar status and All feedback counts use only the `board` query's requests when viewing a board inbox; the workspace inbox still totals its workspace. Zero-count badges are omitted. All boards shows the number of boards only when nonzero; the bell's unread badge remains conditional on unread notifications.

Theme defaults are applied by a small root inline script before paint and re-applied in a layout effect during hydration/Strict Mode. Device changes, page restoration and returning to a visible tab re-evaluate appearance. Public Dynamic boards (including embeds) follow the device rather than a browser's saved account theme. Fixed workspace Light/Dark themes still apply after workspace data loads. Dashboard appearance follows the saved Account theme; System (the default) follows the device, while explicit Light/Dark overrides remain intentional.

Checks: webpack build, targeted ESLint and initial-script cases (including blocked storage). Local browser fixture verified different board counts, workspace totals, zero-count hiding, public device changes with a conflicting account preference, and Account → System → Save appearance responding to live device changes. Backend calls were mocked; no production data changed.

Account appearance now applies and persists as soon as Light, Dark or System is selected (user-requested exception to explicit settings saves). Removed its Discard/Save appearance buttons. Branding, widget and other settings retain explicit saves.

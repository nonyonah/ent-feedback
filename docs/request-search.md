# Request search and type markers

Public and dashboard search use the existing coss UI Command components. `/` and Cmd/Ctrl+K open the palette outside editable fields; arrow keys navigate, Enter selects, and Escape closes. Commands do not intercept those shortcuts while another dialog is open.

Search matches all query terms across a request’s title, details, author, type, board name and assigned tags. Type aliases include “bugs” and “requests.” Matching ignores case and repeated whitespace. Blank queries show recent requests first; results show their type, board, author and status. At most 50 results are displayed, with the total count shown so the user can refine broad searches. Empty, loading and load-failure states are provided.

Public search uses the current board’s loaded records and opens the selected conversation within its workspace route. Dashboard search uses the currently filtered inbox; choosing a result selects its detail pane, including on mobile. Board, status, type and tag filters remain intact. Search reads the provider’s persisted feedback dataset; this is client-side matching, not a separately indexed server search or comment-body search.

Type labels share one marker component: green for Feedback, red for Bug report, purple for Feature request. Markers accompany the text in public rows, public type controls, submission selectors (including the widget), dashboard filters, the type/tag editor and command results. The dots are decorative; names remain the accessible labels. Type colors are independent of a workspace’s custom accent.

Validation: matching tests cover fields, multi-term queries, aliases, empty results and stable source ordering. Local browser checks with actual components and mocked data cover palette keyboard controls, public scope/routing, dashboard selection/filter retention and markers in dropdowns. Production build, TypeScript and targeted lint checks passed. Real deployed routing and production Clerk sessions were not exercised in these browser checks.

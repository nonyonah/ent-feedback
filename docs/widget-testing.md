# Testing the widget on another project

1. Open Ent Feedback, choose the workspace and board, then open **Share → Widget embed**. Copy the installation snippet. The script's `data-project` is the saved workspace domain slug; `data-board` is the board slug. Use the generated values rather than guessing them.
2. Add that snippet once to the other project's HTML, immediately before `</body>` (or its equivalent global script entry). The loader adds the floating Submit feedback button and an iframe pointing to the feedback app's `/embed` route. It does not replace the host site's page.
3. For a deployed host site, the snippet must reference a publicly reachable HTTPS deployment of Ent Feedback, not your computer's localhost. No custom-domain feature or integration connection is needed.
4. For local testing, run Ent Feedback and the other project on separate local ports. The generated snippet can reference the local Ent origin, such as `http://localhost:3000/widget.js`, while the test project runs at another local origin. Check the origin in the copied snippet if Next selected a different dev port.

A representative snippet (replace the origin and both slugs, or copy the real snippet from Share):

```html
<script
  src="https://YOUR-FEEDBACK-APP/widget.js"
  data-project="YOUR-WORKSPACE-SLUG"
  data-board="YOUR-BOARD-SLUG"
  defer
></script>
```

For a Next.js host, put the equivalent `next/script` component in the site's shared layout with `strategy="afterInteractive"` and the same `src`, `data-project` and `data-board`. This installs it across pages while keeping the script execution under Next's control.

## Smoke test

- Open the host site. Confirm one launcher appears at bottom-right; open it, close it through the launcher, and reopen it.
- Confirm workspace image/name and the correct board load. Inspect light/dark appearance using the chosen workspace theme or the system setting when dynamic.
- Submit a uniquely named test request. Confirm it appears in the intended board and the workspace dashboard. Test an image attachment if uploads are enabled/configured.
- Vote, reload, and verify persistence. Use the same signed-in account when comparing personal active-vote state with the dashboard; anonymous votes use a separate visitor identity.
- Confirm cross-tab dashboard updates. Same-origin tabs receive a refresh signal; different origins refresh on return or via the visible-tab polling interval.

If the launcher is absent, check that the script URL opens and that the host's content-security policy permits the feedback origin for both scripts and frames. If the launcher appears but its contents do not, open `/embed?project=WORKSPACE-SLUG&board=BOARD-SLUG` directly at the feedback app origin and check the board slugs and server connection.

No private API key belongs in the snippet. The current widget does not provide host-user identity/SSO through data attributes.

## Standalone local demo

Run Ent Feedback with `npm run dev -- --port 3000`, then run `npm run widget:test` in another terminal. Open http://localhost:3333.

`examples/widget-test/index.html` is an independent sample app. It installs the actual loader with the same script attributes as Share → Widget embed, pointing to the existing `elf-workspace` / `product` board. Edit its final script tag to test another board or app origin. No Next/React components are reused on the host site. Posts made in this demo are real board submissions, not fixtures. `WIDGET_TEST_PORT` can override port 3333.

The launcher follows a host page's explicit `html[data-theme]`, `html[data-color-scheme]` or `html.dark`/`html.light` state, falling back to the device color scheme. Host theme mutations and device changes update it live. A `data-theme="light"` or `data-theme="dark"` installation attribute explicitly locks its appearance; iframe workspace theme messages do not lock the launcher.

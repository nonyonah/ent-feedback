# Interaction audit — Apple Design

Reviewed November 9, 2026. Applies the local [Apple Design skill](../../.agents/skills/apple-design/SKILL.md): immediate response, continuous feedback, predictable placement, recovery, restrained motion and accessibility. Existing Inter typography and the app’s visual language remain in place.

## Feedback placement

| Situation | Placement | Behavior |
| --- | --- | --- |
| Invalid field | Beside the field | Explain the correction; associate with `aria-describedby` and `aria-invalid`. Focus an invalid public feedback title. |
| Form submission pending | Initiating button | Spinner, accessible action label and `aria-busy`; retain the original label’s footprint; prevent duplicate submissions. |
| Form submission fails | Inline in the open form + retry button | Preserve text, selected tags and attachments. Never close the form or claim success. |
| Comment/reply succeeds | Updated conversation and cleared composer | No additional success toast is necessary. |
| Public/widget feedback succeeds | In-place confirmation | Offer the next action; no duplicate toast. |
| Board creation/rename, classification or settings save succeeds | Short toast | Useful confirmation after a dialog closes or saved settings become clean. |
| Vote/status action fails | Error toast | Keep failure visible and dismissible. The provider only updates the saved result after the server confirms it. |
| Initial page data fails | Error state with real Retry | Loading/empty/error are distinct. Do not display an empty collection after a failed fetch. |
| Background refresh fails | Contextual banner alongside existing data | Keep the last successful snapshot; offer retry without replacing the screen. |
| Attachment preparation | Beside attachments + initiating control | Separate from emoji loading. Prevent submission until preparation completes. |
| Emoji loading/search/error | Inside the picker | Distinct loading, no matches and retry states. |
| Theme selection | Immediate selected appearance | No success toast for each choice. Storage failure uses an error toast, not a profile form error. |
| Billing checkout | Disabled initiating action, provider overlay, then server confirmation | Billing errors use toasts. Browser checkout completion alone never grants paid access. |
| Destructive account/billing changes | Explicit provider confirmation flow | No success message before the provider/server confirms the change. |

## Findings addressed

- Global comment pending state locked unrelated reply/like controls. Each composer now owns its pending state; the existing server mutation queue and deduplication remain intact.
- Failed comment submissions used a detached toast. Errors now stay with their retained draft and retry action.
- Background feedback refresh failures replaced loaded content with an error page. Existing snapshots now remain visible; initial-load errors still render a recoverable error state.
- A board error Retry fallback simulated work with a timer. Retry now invokes the supplied loader or reloads the page; no artificial success/progress delay.
- Public feedback title validation appeared below an unrelated field. It now identifies and focuses the title field.
- Classification used one busy flag for tag creation and saving the request. Only the initiating action now shows progress.
- Failed tag loading could look like an empty tag collection. It now exposes a real retry and prevents saving an incomplete selection.
- Settings load and save errors shared one state. Branding/widget saves now retain a ready page and draft, expose inline save errors, and retry the save action. Discarding the draft hides its stale save error.
- Notification save errors offered a loader retry. Failed saves now retry through Save; loader retry is reserved for unavailable preferences.
- Mark-as-read failures could replace the notification list or disappear when the popover closed. They now use a persistent error toast. Notification refresh errors preserve previously loaded entries.
- Image preparation and emoji loading shared progress/error state. They are now separate; image errors stay with attachments and emoji errors stay inside the picker.
- Widget post buttons lacked explicit busy semantics. Public, widget, comment, board, settings and registration actions now share the same pending-button behavior.
- Added opaque toolbar fallback for reduced transparency and greater contrast. Pointer press feedback uses 100 ms; existing keyboard immediacy, reduced-motion overrides and reversible overlay transitions remain intact.

## Other surfaces reviewed

Board marker picker already has a fixed viewport, keyboard grid/tab navigation, retry and no-match states. Workspace identity fields already show checking/available/unavailable feedback beside the relevant input. Registration preserves the current step and error; its primary action now uses the shared pending treatment. Share uses copied-state/toast feedback rather than a page-level success screen. Billing retains its server-confirmed entitlement flow and explicit cancellation portal. Existing dialogs manage focus/Escape/focus restoration, and the widget launcher remains a reversible toggle.

No new decorative motion or loading delays were added. Loading does not imply progress percentages we cannot measure. No live email, checkout, account deletion or subscription change was triggered by this audit.

## Validation

The browser evidence script mounts actual components with controlled service responses. It exercises public feedback, comments, the widget, tag classification, and the **real FeedbackProvider** with failed initial and background reads. Checks include pending semantics, draft preservation, retry/success, selected-tag preservation and unrelated controls remaining available. Service fixtures make these deterministic; they do not establish production network/provider behavior.

Run from the repository root with Playwright available:

```sh
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node docs/interaction-audit/evidence/check.cjs
node --conditions=react-server --import tsx --test tests/*.test.ts
npm run typecheck
npm run lint
```

The evidence script uses installed esbuild and the existing development CSS output. It starts a temporary loopback server, builds into `/tmp`, and does not mutate customer data.

Remaining release checks: authenticated end-to-end registration and profile upload, live checkout/cancellation, real email delivery, native mobile browsers, assistive-technology reading order, and slow/offline behavior against deployed infrastructure. This audit is not a substitute for those production checks.

Completed checks: 25 deterministic browser assertions passed with zero browser exceptions; all 39 existing tests passed. Browser outcomes are recorded in [results.json](evidence/results.json).
Full ESLint, TypeScript (`tsc --noEmit`) and `git diff --check` passed. No production build or live provider transaction was repeated for this interaction-only change.

## Billing portal follow-up

Manage/Cancel subscription now opens the secure Bachs portal in a separate tab, allocated during the user click. The originating action resets after handing off the URL. Blocked tabs, closed waiting tabs, service failures and a 30-second timeout produce error toasts and allow retry. Checkout continues to use the existing overlay. Browser fixtures verified successful navigation/reset, service-error recovery, timeout recovery (virtual clock), and blocked-pop-up handling, with no runtime errors. These checks did not open a live billing session.

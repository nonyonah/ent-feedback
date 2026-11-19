# Settings polish and interaction audit

Reviewed 2026-11-19 using the Emil design engineering skill. Changes remain on `feature/chat-conversations`; this audit does not enable Linear, Discord or AI features.

| Before | After | Why |
| --- | --- | --- |
| Widget/Team spacing selected by page-title conditionals | Shared 32px section rhythm and 16px action spacing | Predictable grouping without special-case page geometry |
| Account had a separate card treatment and smaller Save button | Shared settings cards, headings and coss actions | One visual system across personal and workspace settings |
| Row controls could exceed narrow panels | Bounded controls, wrapping rows, consistent text spacing | Long labels and mobile widths remain readable |
| Card overflow could clip field focus indicators | Shared card no longer clips its contents | Keyboard focus stays visible; selects still use their portals |
| Some pages showed loading prose or an empty billing body | coss skeletons and accessible loading labels | Preserve page structure while data arrives |
| Conversation load/save failures used the same error state | Load recovery uses the shared retry toast/view; save failure stays on its action with a toast | Retry the correct operation and preserve drafts |
| A successful conversation save waited for a reload to reset its dirty baseline | Baseline updates immediately, followed by refresh | Prevent duplicate saves and misleading unsaved indicators |
| Settings load promises could reject without recovery | Conversation and integration loads handle rejected promises | Recoverable failures do not become unhandled errors |
| Profile errors shared a plain status line | Image validation stays inline; save failures use a toast and retry action | Explain validation at the field and transient failures at the action |
| Profile edits had no Discard; sign-in method resembled passive text | Discard plus explicit Manage sign-in and destructive-outline Delete account controls | Clear affordances without changing secure Clerk account management |
| Working-day buttons were custom native buttons | coss buttons with pressed state | Shared press, focus and disabled feedback |
| Keyboard switch changes retained background transitions | Immediate keyboard state updates; existing pointer/reduced-motion rules retained | Frequent keyboard actions do not wait for decorative motion |
| Upcoming provider settings could save unchanged drafts | Dirty-aware save/discard controls and labeled Linear selects | Prepared integrations follow the same editing contract |

## Behavior preserved

- Account theme applies immediately, as requested. Branding, widget, conversation and integration preferences still require an explicit save.
- Save failures retain edits. Discard resets the local draft without making a server request.
- Clerk still owns secure sign-in/account deletion confirmation.
- Workspace membership and operator permissions remain enforced by the existing backend.
- AI knowledge, topics and answer overrides remain disabled. Linear/Discord still show Coming soon.
- No changes to billing prices, checkout behavior, subscription permissions or payment-provider credentials.

## Verification

`node scripts/check-chat-ui.mjs --settings-audit` passed for Account, Branding, Team, Billing, Widget, Conversations and Integrations at 320, 390 and 1024px in light and dark mode. It checks no horizontal overflow, 16px action gaps, explicit-save drafts, failed-save retention and retry, Discard, keyboard working-day selection, keyboard switch motion and conversation/billing load recovery. Screenshots were reviewed at `/var/folders/dg/ylzprv1s7zz6g4cbv3srrfmc0000gn/T/ent-chat-ui-b1klwT`.

The production webpack build (58 pages), TypeScript, scoped ESLint and all 97 unit tests passed. Browser tests use controlled server/Clerk fixtures; they do not send invitations, change a real subscription or modify production preferences. Physical-device Safari testing remains a separate release check.

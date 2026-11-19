# Dashboard interaction audit

Reviewed with the Emil design engineering skill, November 19, 2026. Existing coss UI components, typography, semantic colors and restrained motion remain the basis of the interface.

| Before | After | Why |
| --- | --- | --- |
| Conversation status failures also marked the reply composer as failed | Status failures use an action-specific toast; reply errors stay with the reply composer | Recovery must refer to the operation that actually failed |
| Resolve had no visible pending feedback | Resolve shows the shared spinner and Resolving label while pending | Confirm the action immediately and prevent repeated submissions |
| Conversations overflowed at 320px | Both split-pane flex containers allow children to shrink and scroll | Keep narrow layouts inside the viewport |
| Empty conversation copy referred to the disabled assistant | Copy describes reading and replying as a team | Explain currently available actions |
| Conversation errors could appear alongside an empty state | Empty content appears only after a successful load | Distinguish unavailable data from no data |
| Request skeletons appeared alongside existing data during refresh; initial detail looked empty | Skeletons are limited to initial loading, including the detail pane | Retain context while refreshing |
| Dashboard post links omitted the workspace prefix | Copy and public links use the existing feedbackHref helper | Open the correct public item on both subdomain and path-based deployments |
| Board dragging started from the entire card | Drag starts from the dedicated accessible handle | Clicking links and menus must not initiate a drag |
| Board motion ignored keyboard and reduced-motion preferences | Sorting transitions are disabled for those inputs/preferences | Direct manipulation must remain predictable |
| Failed board deletion persisted after reopening | Each newly opened deletion dialog starts clean | Avoid stale action errors |
| Share clipboard results occupied permanent inline space | Shared toast feedback and coss buttons | Consistent transient success/error feedback |
| Share footer actions could overflow narrow screens | Footer actions wrap and social columns have narrower mobile gaps | Preserve readable controls on phones |
| Boards and Share had weak page headings | Explicit 20px headings match Settings | Maintain page hierarchy |
| Share navigation had no active state; copy could run without a board | Active page indication and disabled unavailable action | Make current context and availability clear |
| Copied sidebar label never reset | Copied feedback resets after two seconds | Keep transient confirmation transient |
| A rejected board-allowance request could become an unhandled promise | A toast explains the failure; submission still checks the real plan limit on the server | Recover without blocking the form |
| Tag labels/errors used fixed IDs | React useId connects each instance independently | Avoid duplicate form IDs |

## Verification

- Focused browser checks: Boards, Share and Conversations at 320, 390 and 1280px, light/dark; no horizontal overflow.
- Status failure does not switch the reply button to Retry reply.
- Public request links contain the workspace route.
- TypeScript, scoped ESLint and all 97 unit tests pass.
- Production build was stopped after remaining at optimized compilation without further output; no successful production build is claimed for this run.
- Screenshots: `/var/folders/dg/ylzprv1s7zz6g4cbv3srrfmc0000gn/T/ent-chat-ui-giDLfu`.
- Additional Roadmap browser execution was denied by tool approval; not claimed as verified in this run.
- The general browser suite initially stopped at an outdated custom-greeting expectation; that expectation now reflects the previously approved removal. The full suite has not been rerun to completion.

No GitHub push or database migration was performed for this audit.

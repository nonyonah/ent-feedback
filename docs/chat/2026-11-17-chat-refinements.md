# Live chat refinements — 17 November 2026

Applied using the Emil design engineering review: reduce competing text, preserve existing component styling, and update frequent states without decorative motion.

| Before | After |
| --- | --- |
| Custom greeting appeared above a second default greeting. | One greeting: configured copy, with “How can we help?” as the fallback. |
| Availability and reply time occupied separate rows in the transcript. | Team avatars, availability and reply time are grouped under the Live chat title. |
| Incremental polling left completed suggestion actions visible. | Completion is persisted on the source message and included independently of the message cursor. Both clients show “Added to board.” |
| Slack review buttons stayed active after conversion. | A queued delivery updates the matching original Slack review block and posts confirmation in the conversation thread. |
| Repeated conversion could create another request. | Conversation locking and completion checks roll back a second conversion to a different request. Repeated linking to the same request is safe. |

Completion is tied to the specific suggestion message, not every future feature request in a conversation. It does not resolve the conversation or mark the feedback post completed. Existing links remain valid; older conversions are recognized only when a linked feature request has the exact same description. Unrelated suggestions remain available.

No new database columns are required for completion: it extends the existing suggestion JSON. Slack needs the existing channel history and chat write permissions and channel membership. Outbound Slack updates are retried by the existing delivery queue. No AI is enabled.

## Verification

- PostgreSQL concurrency checks: six independent users registering concurrently, repeated first sign-in, repeated onboarding submission, guest identity isolation, pooled transaction concurrency. Fixture accounts/workspaces are removed afterward. Clerk identities are mocked; this is not an external authentication load test.
- Chat database regression includes completion after an incremental cursor, retry deduplication, wrong-conversation rejection and original Slack action removal with Slack mocked.
- Browser contact-policy check covers a configured greeting, compact reply-time header and required details at a 320px viewport.

Subscription cancellation was completed by the user in the Bachs dashboard. No cancellation request was sent by this agent.


## Results

- 88 standalone tests passed; TypeScript, scoped ESLint and production webpack build passed.
- Isolated PostgreSQL chat regression passed, including actual feature-request creation, duplicate-conversion rollback, cursor-independent completion and mocked Slack message updates. Its temporary schema was removed.
- Both local browser regressions passed (contact policy and feature-request conversion).
- PostgreSQL concurrency regression passed, including six independent simultaneous registrations.
- Slack integration tests use mocked HTTP responses; the deployed app still needs a live channel smoke test after release. No live Slack messages or email were sent for this work.

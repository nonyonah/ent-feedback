# Frontend review

Start at `/design`. It links to all product screens and directly reviewable states.

## Screens

- `/`: public feedback board; `/items/guest-voting`: conversation.
- `/submit`: submission with similar-request matching, voting, validation, sending, retry, and confirmation.
- `/auth`: email-link entry. `/auth/check-email`, `/auth/verified`, `/auth/expired`, and `/auth/error` expose each email-flow state.
- `/following`: browser-followed posts; `/preferences`: notification preferences; `/preferences/unsubscribed`: confirmation design.
- `/onboarding`: two-step project setup and completion; `/project-settings`: logo, introduction, accent, and name editing.
- `/install`: installation snippet and live embedded panel; `/widget-preview`: an interactive widget over a sample host app; `/embed`: standalone iframe content.
- `/preview/*`: loaded/empty/error/loading board states, populated following, submission states, a sending email request, setup completion, and widget submission.

Use the header theme toggle to review dark mode. Pages adapt to phone widths. Account and project links are available from the header's account menu. The existing `/dashboard` remains available for the next admin redesign.

## Widget

`public/widget.js` adds a launcher and cross-origin iframe. The installation screen generates a snippet using the current origin. The embedded UI uses coss components, includes the board and inline submission, and has an Escape/close message back to the host. Messages are checked against the iframe source and origin. The in-app React widget uses a coss dialog for focus management and restoration.

## What is still a frontend preview

- Feedback, comments, votes, likes, and project appearance use React state and reset on refresh. Project appearance is shared across client-side navigation.
- Following preferences use browser storage. Followed sample posts appear at `/following`.
- Email-link screens do not send email or create authenticated sessions. Verification and unsubscribe routes demonstrate those designs; they do not modify a real account.
- Notification settings are local UI state and do not send notifications.
- The external widget uses sample data. Its project identifier is included in the URL for the future backend; it does not yet load separate projects or share changes with other browser contexts.
- Simulated sending states use a short delay to make feedback visible. Dedicated preview routes let designers review states without forcing real failures.

Next backend work: durable projects/posts/comments/votes, verified identities, owner access control, actual notification subscriptions and delivery, project-aware embedding, and shared persistence. Integrations, analytics, custom domains, separate roadmap/changelog pages, roles, and AI remain outside v1.

## Project and board hierarchy

Start at `/project` for the connected owner journey. Project creation (`/onboarding`) and board creation (`/project/boards/new`) are separate. Share (`/share`) and widget installation (`/install`) target the selected board. Public board and direct submission URLs include project and board handles. See [product-flow.md](./product-flow.md) for the full route sequence and current persistence boundaries. The default accent is charcoal with an inverse neutral treatment in dark mode.

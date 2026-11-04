# Connected frontend flow

UserJot’s [getting started guide](https://userjot.com/support/getting-started) moves from workspace setup to sharing, collecting feedback, triage, and visible progress. Its [board creation guide](https://userjot.com/support/create-a-board) places boards inside a workspace, and its [sharing guide](https://userjot.com/support/share-your-board) provides a public URL and a direct submission entry point.

Ent follows that sequence with the project hierarchy requested for this product:

1. `/onboarding`: create a project and choose its appearance. This creates no board.
2. `/project`: see the project’s boards and setup steps.
3. `/project/boards/new`: create a board inside the project. Each board starts empty and has a separate feedback collection.
4. `/share`: select a board, copy its public URL or direct submission URL, and continue to widget installation.
5. `/install`: copy a project-and-board-specific loader snippet; inspect the interactive sample widget.
6. `/p/[project]/boards/[board]`: browse feedback, vote, search, sort, or submit.
7. `/items/[id]`: discuss the idea, like comments, follow the post, or share its link. Return to the active board.
8. `/following` and `/preferences`: return to followed conversations and choose notification preferences.
9. `/dashboard`: select a board and manage its feedback/status. Public status changes reflect the same session state.

The account menu connects public feedback to project overview, sharing, appearance, installation, and the inbox. Sign-in previews preserve a same-origin return path. `/design` remains the screen review index rather than the product’s default back destination.

## Backend boundary

Projects, boards, feedback, votes, and comments currently live in React session state and reset on refresh. Following is saved in browser storage. Authentication and email are previews. Independent widget iframes have their own sample state; the loader carries project and board handles, but backend resolution and shared persistence are still pending. Public links to newly created content only work within the same frontend navigation session.

Roadmaps, changelogs, team permissions, AI, and live chat from UserJot have not been added to this scope. The existing admin layout remains available for the user’s upcoming redesign.

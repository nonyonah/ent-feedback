import { widgetSnippet } from "../lib/widget-snippet";

export function widgetInstallPrompt(origin: string, projectKey: string, board: string) {
  return `Add the Ent Feedback feedback widget to this project.

Project key: ${projectKey}

Steps:
1. Find out which framework this project uses and where the root HTML or layout file is (for example app/layout.tsx in Next.js, index.html in Vite, src/app.html in SvelteKit, the base layout in Astro, or a plain HTML file).
2. Add this snippet once, in that root file, so it loads on every page:

${widgetSnippet(origin, projectKey, board)}

3. In Next.js, use next/script with strategy "afterInteractive" instead of a raw script tag.
4. Do not install packages, and do not change anything else.
5. If the widget is already installed, tell me instead of adding a second copy.
6. Tell me exactly what you changed and how to run the project so I can check that the feedback button appears in the corner of the page.`;
}

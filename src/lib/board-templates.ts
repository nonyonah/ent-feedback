import type { FeedbackStatus, FeedbackCategory } from "./feedback-data";

export const boardTemplateIds = ["saas", "mobile", "developer", "blank"] as const;
export type BoardTemplateId = typeof boardTemplateIds[number];
export const boardTemplateLabels: Record<BoardTemplateId, string> = {
  saas: "SaaS product", mobile: "Mobile app", developer: "Developer tool", blank: "Blank",
};

type Entry = [title: string, body: string, status: FeedbackStatus, votes: number, category?: FeedbackCategory];
const catalog: Record<BoardTemplateId, Entry[]> = {
  saas: [
    ["Dark mode", "Use a darker color scheme in low light.", "open", 12],
    ["Export data to CSV", "Download a spreadsheet of your data.", "open", 9],
    ["Team invites with roles", "Invite teammates with the right level of access.", "open", 7],
    ["Slack notifications", "Receive product updates in your team’s Slack channel.", "open", 6],
    ["Mobile-friendly dashboard", "Use the dashboard comfortably on a small screen.", "open", 4],
    ["Single sign-on", "Sign in with your organization’s identity provider.", "planned", 15],
    ["Custom branding", "Personalize the board with your company branding.", "planned", 8],
    ["Zapier integration", "Connect product events to automated workflows in Zapier.", "in-progress", 11],
    ["Faster page loading", "Spend less time waiting for dashboard pages to load.", "shipped", 14],
  ],
  mobile: [
    ["Dark mode", "Switch to a darker theme for nighttime use.", "open", 13],
    ["Home screen widgets", "See key updates without opening the app.", "open", 10],
    ["Offline mode", "Keep using the app without an internet connection.", "open", 9],
    ["Face ID login", "Unlock the app with Face ID.", "open", 7],
    ["Share to other apps", "Send content to another app from the share menu.", "open", 5],
    ["Push notification settings", "Choose which updates can send push notifications.", "planned", 12],
    ["iPad layout", "Make better use of the extra space on an iPad.", "planned", 6],
    ["Faster startup time", "Get to the home screen sooner after opening the app.", "in-progress", 11],
    ["Fix crash on launch", "Prevent the app from closing unexpectedly at startup.", "shipped", 16, "bug"],
  ],
  developer: [
    ["CLI autocomplete", "Complete commands and flags directly in the terminal.", "open", 11],
    ["TypeScript types", "Catch mistakes while writing code with typed API responses.", "open", 10],
    ["Webhooks", "Send event updates to your own endpoint.", "open", 9],
    ["Better error messages", "Explain what went wrong and how to fix it.", "open", 7],
    ["Dark mode for the docs", "Read the documentation with a darker color scheme.", "open", 8],
    ["Python SDK", "Call the API from a native Python client.", "planned", 14],
    ["Rate limit dashboard", "See remaining requests and when the limit resets.", "planned", 8],
    ["GitHub integration", "Connect repository activity to your development workflow.", "in-progress", 12],
    ["API key rotation", "Replace an API key without interrupting existing clients.", "shipped", 13],
  ],
  blank: [],
};

export function buildSampleItems(template: BoardTemplateId, boardName: string) {
  const welcome: Entry = [
    `Welcome to ${boardName}'s feedback board`,
    "This is a sample. Vote on ideas, suggest your own, and see what we are working on. The team can clear the samples any time.",
    "open", 0, "feedback",
  ];
  return [welcome, ...catalog[template]].map(([title, body, status, startingVotes, category = "feature_request"]) => ({
    title, body, status, startingVotes, category, isSample: true, roadmapVisible: true,
    shippedAt: status === "shipped" ? new Date() : null,
  }));
}

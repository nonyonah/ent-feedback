/** Team membership is enabled; advanced workspace features remain deferred. */
export const features = {
  integrations: false,
  customDomains: false,
  teams: true,
  feedbackAi: false,
} as const;
export type Feature = keyof typeof features;

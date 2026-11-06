/** Temporarily unavailable in v1. Keep implementation/data for later releases. */
export const features = {
  integrations: false,
  customDomains: false,
  teams: false,
} as const;
export type Feature = keyof typeof features;

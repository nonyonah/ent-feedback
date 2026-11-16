export const appPresenceLifetime = 90_000;
export const slackPresenceLifetime = 120_000;

export function recentPresence(value: Date | string | null | undefined, lifetime: number, now = Date.now()) {
  if (!value) return false;
  const age = now - new Date(value).getTime();
  return age >= 0 && age < lifetime;
}

export function operatorOnline(value: {appSeenAt?: Date | string | null;slackCheckedAt?: Date | string | null;slackOnline?: boolean;slackConnectionVersion?: string | null}, connectionVersion: string | null, now = Date.now()) {
  if (recentPresence(value.appSeenAt, appPresenceLifetime, now)) return true;
  return Boolean(connectionVersion && value.slackConnectionVersion === connectionVersion && value.slackOnline && recentPresence(value.slackCheckedAt, slackPresenceLifetime, now));
}

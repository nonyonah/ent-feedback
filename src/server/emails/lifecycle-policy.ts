import type {LifecycleEmail} from './templates';
export const lifecycleKinds = ['welcome','onboarding_reminder','first_board_reminder','inactive'] as const;
export type ScheduledLifecycleEmail = typeof lifecycleKinds[number];
const day = 86_400_000;
export type LifecycleState = {enrolledAt: Date; lastActiveAt: Date; onboardingStartedAt: Date | null; onboardingCompletedAt: Date | null; optedOutAt: Date | null; welcomeEligible: boolean; hasWorkspace: boolean; workspaceCreatedAt?: Date; hasBoard: boolean};
/** Re-evaluated immediately before dispatch; completing setup cancels stale reminders. */
export function eligibleLifecycleEmail(kind: LifecycleEmail, state: LifecycleState, now: Date): boolean {
  if(state.optedOutAt || state.enrolledAt > now || state.lastActiveAt > now) return false;
  switch(kind){
    case 'welcome': return state.welcomeEligible && now.getTime()-state.enrolledAt.getTime()<day;
    case 'onboarding_reminder': return !!state.onboardingStartedAt && !state.onboardingCompletedAt && now.getTime()-state.onboardingStartedAt.getTime()>=day;
    case 'first_board_reminder': return state.hasWorkspace && !state.hasBoard && now.getTime()-Math.max(state.enrolledAt.getTime(),state.workspaceCreatedAt?.getTime()??0)>=3*day;
    case 'inactive': return state.hasWorkspace && now.getTime()-state.lastActiveAt.getTime()>=30*day;
    case 'getting_value': return false; // Draft only: no unsolicited recurring campaign.
  }
}

'use client';

import {Button, type ButtonProps} from './button';
import {CheckIcon} from '@/components/icons';

export type ActionState = 'idle' | 'pending' | 'error' | 'success';

type ActionButtonProps = ButtonProps & {
  state?: ActionState;
  pendingLabel?: string;
  retryLabel?: string;
  successLabel?: string;
};

/** Fields and pages own error explanations; the initiating action owns progress. */
export function ActionButton({
  state = 'idle',
  pendingLabel = 'Saving…',
  retryLabel = 'Try again',
  successLabel = 'Saved',
  children,
  ...props
}: ActionButtonProps) {
  return (
    <Button
      {...props}
      loading={state === 'pending'}
      aria-label={state === 'pending' ? pendingLabel : props['aria-label']}
      data-feedback-state={state}
    >
      {state === 'error' ? retryLabel : state === 'success' ? (
        <><CheckIcon className="size-3.5"/>{successLabel}</>
      ) : children}
    </Button>
  );
}

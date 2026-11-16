import type {ComponentProps} from 'react';
import {WarningCircleIcon} from '@/components/icons';
import {cn} from '@/lib/utils';

/** Persistent failures stay beside their recovery action rather than disappearing in a toast. */
export function ErrorNotice({children,className,...props}:ComponentProps<'div'>){
 return <div {...props} role="alert" className={cn('flex shrink-0 items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-[13px] leading-5 text-foreground',className)}><WarningCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive"/><div className="min-w-0 flex-1 break-words [&_button]:ms-1 [&_button]:align-middle">{children}</div></div>;
}

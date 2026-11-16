'use client';
import type {ComponentProps} from 'react';
import {MagnifyingGlassIcon} from '@/components/icons';

export function InboxSearchTrigger({label,...props}:ComponentProps<'button'>&{label:string}){
 return <button type="button" {...props} aria-label={label} className="flex h-9 w-full items-center gap-2 rounded-lg px-1 text-[13px] text-muted-foreground outline-none hover:bg-control-quiet focus-visible:ring-2 focus-visible:ring-ring"><MagnifyingGlassIcon className="size-3.5 shrink-0"/><span className="flex-1 text-left">{label}…</span><kbd className="text-xs text-muted-foreground">/</kbd></button>;
}

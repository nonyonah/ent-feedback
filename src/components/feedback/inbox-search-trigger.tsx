'use client';
import type {ComponentProps} from 'react';
import {MagnifyingGlassIcon} from '@/components/icons';
import {cn} from '@/lib/utils';

export function InboxSearchTrigger({label,className,compact=false,...props}:ComponentProps<'button'>&{label:string;compact?:boolean}){
 return <button type="button" {...props} aria-label={label} className={cn('flex h-9 w-full items-center gap-2 rounded-lg border border-border/80 bg-control-quiet px-2.5 text-[13px] font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',compact&&'size-9 md:h-7.5 md:w-45',className)}><MagnifyingGlassIcon className="size-3.5 shrink-0"/><span className={cn('flex-1 text-left',compact&&'hidden md:inline')}>{label}…</span><kbd className={cn('text-xs text-muted-foreground',compact&&'hidden md:inline')}>/</kbd></button>;
}

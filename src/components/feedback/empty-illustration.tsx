import {cn} from '@/lib/utils';
/** Isocons artwork (CC BY 4.0); adjacent copy carries the empty-state message. */
export function EmptyIllustration({variant='empty',compact=false,className}:{variant?:'empty'|'search'|'notifications'|'requests';compact?:boolean;className?:string}){
 return <figure className={cn('mx-auto flex shrink-0 flex-col items-center gap-2',className)}>
 {/* Local SVGs need no remote image service. */}
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={'/illustrations/'+variant+'.svg'} alt="" aria-hidden="true" width={160} height={112} decoding="async" className={cn('object-contain dark:invert dark:opacity-80',compact?'h-20 w-28':'h-28 w-40')}/>
 <figcaption className="text-[11px] font-medium leading-4 text-muted-foreground"><a href="https://www.isocons.app/" target="_blank" rel="noreferrer" className="rounded-sm underline decoration-current/30 underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">Isocons</a><span className="sr-only"> illustration, adapted under Creative Commons Attribution 4.0. Stroke color modified.</span></figcaption>
 </figure>;
}

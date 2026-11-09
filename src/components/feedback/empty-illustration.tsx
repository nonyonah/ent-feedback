import {cn} from '@/lib/utils';
/** Artwork attribution is retained in public/illustrations/LICENSE.txt. */
export function EmptyIllustration({variant='empty',compact=false,className}:{variant?:'empty'|'search'|'notifications'|'requests';compact?:boolean;className?:string}){
 return <figure className={cn('mx-auto flex shrink-0 flex-col items-center gap-2',className)}>
 {/* Local SVGs need no remote image service. */}
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={'/illustrations/'+variant+'.svg'} alt="" aria-hidden="true" width={160} height={112} decoding="async" className={cn('object-contain dark:invert dark:opacity-80',compact?'h-20 w-28':'h-28 w-40')}/>
 </figure>;
}

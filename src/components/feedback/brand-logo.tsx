import {cn} from '@/lib/utils';
export function BrandLogo({className}:{className?:string}){
 // Keep this independent of the wordmark so headers never display its text.
 // eslint-disable-next-line @next/next/no-img-element
 return <img src="/brand/ent-mark.png" alt="Ent Feedback" width={32} height={32} className={cn('block size-8 shrink-0 object-contain',className)}/>;
}

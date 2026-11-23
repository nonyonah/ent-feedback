'use client';
import Link from 'next/link';
import {Button} from '@/components/ui/button';

type PublicPage='feedback'|'roadmap'|'changelog';

/** Route navigation stays instant; active, hover and focus use the app's coss surfaces. */
export function PublicBoardNavigation({feedbackHref,roadmapHref,changelogHref,active}:{feedbackHref:string;roadmapHref:string;changelogHref?:string;active:PublicPage}){
 const items=[{page:'feedback' as const,label:'Feedback',href:feedbackHref},{page:'roadmap' as const,label:'Roadmap',href:roadmapHref},...(changelogHref?[{page:'changelog' as const,label:'Changelog',href:changelogHref}]:[])];
 return <nav aria-label="Public board navigation" className="flex justify-center"><div className="inline-flex items-center gap-0.5 rounded-xl bg-control-quiet p-1">{items.map(item=><Button key={item.page} variant="ghost" size="sm" render={<Link href={item.href} aria-current={item.page===active?'page':undefined}/>} className={'h-8 min-w-24 rounded-lg px-3 text-[13px] font-medium shadow-none '+(item.page===active?'bg-background text-foreground shadow-xs hover:bg-background':'text-muted-foreground hover:bg-background/60 hover:text-foreground')}>{item.label}</Button>)}</div></nav>;
}

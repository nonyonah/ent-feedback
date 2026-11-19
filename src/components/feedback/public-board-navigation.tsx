'use client';
import Link from 'next/link';
import {Button} from '@/components/ui/button';

/** Route navigation stays instant; active, hover and focus use the app's coss surfaces. */
export function PublicBoardNavigation({feedbackHref,roadmapHref,roadmapActive}:{feedbackHref:string;roadmapHref:string;roadmapActive:boolean}){
 return <nav aria-label="Public board navigation" className="flex justify-center"><div className="inline-flex items-center gap-0.5 rounded-xl bg-control-quiet p-1">{[{label:'Feedback',href:feedbackHref,active:!roadmapActive},{label:'Roadmap',href:roadmapHref,active:roadmapActive}].map(item=><Button key={item.label} variant="ghost" size="sm" render={<Link href={item.href} aria-current={item.active?'page':undefined}/>} className={'h-8 min-w-24 rounded-lg px-3 text-[13px] font-medium shadow-none '+(item.active?'bg-background text-foreground shadow-xs hover:bg-background':'text-muted-foreground hover:bg-background/60 hover:text-foreground')}>{item.label}</Button>)}</div></nav>;
}

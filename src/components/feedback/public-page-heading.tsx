import {cn} from '@/lib/utils';
export const publicPageDescriptions={feedback:'Share ideas, report bugs, and vote on what matters.',roadmap:'Follow what’s planned, in progress, and shipped.'};
export function PublicPageHeading({resource,compact=false,className}:{resource:'feedback'|'roadmap';compact?:boolean;className?:string}){
 const Heading=compact?'h2':'h1';
 return <div className={cn('min-w-0',className)}><Heading className={compact?"text-[22px] font-semibold leading-8 tracking-tight":"text-[24px] font-semibold leading-8 tracking-tight"}>{resource==='feedback'?'Feedback':'Roadmap'}</Heading><p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">{compact&&resource==='roadmap'?'Explore what’s coming next.':publicPageDescriptions[resource]}</p></div>;
}

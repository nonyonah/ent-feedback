'use client';
import * as React from 'react';
import {cn} from '@/lib/utils';
import styles from './changelog-timeline.module.css';

export type ChangelogNavEntry = {slug: string; title: string; day: string; monthKey: string};
export type ChangelogNavMonth = {key: string; label: string; entries: {slug: string; title: string; day: string}[]};

export function ChangelogTimeline({months,children}:{months: ChangelogNavMonth[];children: React.ReactNode}){
  const [expanded,setExpanded]=React.useState<Record<string,boolean>>({});
  const navigationId=React.useId();
  const [activeSlug,setActiveSlug]=React.useState<string|null>(months[0]?.entries[0]?.slug??null);
  const entries=React.useMemo(()=>months.flatMap(month=>month.entries.map(entry=>({...entry,monthKey:month.key}))),[months]);
  const activeMonth=months.find(month=>month.entries.some(entry=>entry.slug===activeSlug))??months[0];
  const activeEntry=entries.find(entry=>entry.slug===activeSlug);

  React.useEffect(()=>{
    const nodes=[...document.querySelectorAll<HTMLElement>('[data-changelog-entry]')];
    if(!nodes.length)return;
    let frame=0;
    // The active entry is the last one whose title has passed the reading line. Recomputing
    // from position (once per frame) keeps entries with very different heights in order and
    // never flickers the way overlapping intersection thresholds can.
    const measure=()=>{
      frame=0;
      const line=112;
      const atBottom=window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-4;
      let slug=nodes[0].getAttribute('data-changelog-entry');
      if(atBottom)slug=nodes.at(-1)?.getAttribute('data-changelog-entry')??slug;
      else for(const node of nodes){if(node.getBoundingClientRect().top<=line)slug=node.getAttribute('data-changelog-entry');}
      if(slug)setActiveSlug(slug);
    };
    const schedule=()=>{if(!frame)frame=window.requestAnimationFrame(measure);};
    const onHash=()=>{
      const hash=decodeURIComponent(window.location.hash.slice(1));
      if(!hash)return;
      const slug=nodes.some(node=>node.getAttribute('data-changelog-entry')===hash)?hash:months.find(month=>month.key===hash)?.entries[0]?.slug;
      if(slug)setActiveSlug(slug);
    };
    onHash();
    measure();
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    window.addEventListener('hashchange',onHash);
    return()=>{
      if(frame)window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll',schedule);
      window.removeEventListener('resize',schedule);
      window.removeEventListener('hashchange',onHash);
    };
  },[months]);

  function jump(event:React.MouseEvent<HTMLAnchorElement>,slug:string){
    if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const node=document.getElementById(slug);
    if(!node)return;
    event.preventDefault();
    window.history.replaceState(null,'','#'+encodeURIComponent(slug));
    node.scrollIntoView({behavior:event.detail===0||window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    setActiveSlug(slug);
  }

  return <div className="grid grid-cols-1 items-start gap-x-12 md:grid-cols-[176px_minmax(0,1fr)]">
    <nav aria-label="Changelog dates" className={cn(styles.navigation,"sticky top-[104px] z-20 -mx-4 mb-6 max-h-[50svh] overflow-y-auto border-b border-border/60 bg-background px-4 py-2 sm:-mx-8 sm:px-8 md:top-24 md:mx-0 md:mb-0 md:max-h-[calc(100svh-8rem)] md:border-0 md:px-0 md:py-0")}>
      <p className="sr-only" aria-live="polite">{activeMonth?.label} {activeEntry?.day}</p>
      <ol className="space-y-1">
        {months.map(month=>{
          const open=expanded[month.key]??month.key===activeMonth?.key;
          const dates=[...new Set(month.entries.map(entry=>entry.day))];
          const activeIndex=dates.findIndex(day=>month.entries.some(entry=>entry.day===day&&entry.slug===activeSlug));
          return <li key={month.key}>
            <button type="button" aria-expanded={open} aria-controls={navigationId+'-'+month.key} onClick={()=>setExpanded(current=>({...current,[month.key]:!open}))} className={cn('flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-[13px] font-medium outline-none hover:bg-control-quiet focus-visible:ring-2 focus-visible:ring-ring md:min-h-9',month.key===activeMonth?.key?'text-foreground':'text-muted-foreground')}>
              {month.label}<svg aria-hidden="true" viewBox="0 0 16 16" className={cn(styles.chevron,'size-3.5 shrink-0',open&&'rotate-180')} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4 6 4 4 4-4"/></svg>
            </button>
            <div id={navigationId+'-'+month.key} className={styles.panel} data-open={open} inert={!open} aria-hidden={!open}>
              <div className="min-h-0 overflow-hidden">
              <ol className="relative mb-2 mt-1 space-y-1">
                <li aria-hidden="true" className="!m-0"><span className={styles.highlight} style={{transform:'translateY(calc('+Math.max(0,activeIndex)+' * var(--date-step)))',opacity:activeIndex>=0?1:0}}/></li>
              {dates.map(day=>{
                const releases=month.entries.filter(entry=>entry.day===day);
                const active=releases.some(entry=>entry.slug===activeSlug);
                return <li key={day}><a href={'#'+encodeURIComponent(releases[0].slug)} onClick={event=>jump(event,releases[0].slug)} aria-current={active?'date':undefined} aria-label={day+' — '+releases.map(entry=>entry.title).join(', ')} className={cn(styles.row,'relative flex items-center justify-between gap-2 rounded-md px-3 text-[13px] tabular-nums outline-none hover:bg-foreground/[0.03] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',active?'font-medium text-foreground':'text-muted-foreground')}>
                  <span>{day}</span>{releases.length>1&&<span className="text-[11px] text-muted-foreground">{releases.length} updates</span>}
                </a></li>;
              })}
            </ol>
              </div>
            </div>
          </li>;
        })}
      </ol>
    </nav>
    <div className="min-w-0">{children}</div>
  </div>;
}
